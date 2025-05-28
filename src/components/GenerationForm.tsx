
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { generateImageAction } from '@/actions/imageActions';
import type { GeneratedImage } from '@/lib/types';
import { Sparkles, Tag, Loader2, X, HelpCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";


const formSchema = z.object({
  prompt: z.string().min(5, { message: "El prompt debe tener al menos 5 caracteres." }).max(700, { message: "El prompt no puede exceder los 700 caracteres." }),
  tags: z.string().min(1, { message: "Se requiere al menos una etiqueta." }),
  artisticStyle: z.string().optional(),
  aspectRatio: z.string().optional(),
  imageQuality: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface GenerationFormProps {
  onImageGenerated: (image: GeneratedImage) => void;
}

const MAX_RECENT_TAGS = 15;
const RECENT_TAGS_STORAGE_KEY = 'imaginaAiRecentTags';

const artisticStyles = [
  { value: 'none', label: 'Ninguno (Por defecto)' },
  { value: 'Photorealistic', label: 'Fotorrealista' },
  { value: 'Cartoon', label: 'Dibujo Animado' },
  { value: 'Watercolor', label: 'Acuarela' },
  { value: 'Oil Painting', label: 'Pintura al Óleo' },
  { value: 'Pixel Art', label: 'Pixel Art' },
  { value: 'Anime', label: 'Anime' },
  { value: 'Cyberpunk', label: 'Cyberpunk' },
  { value: 'Fantasy Art', label: 'Arte Fantástico' },
  { value: 'Abstract', label: 'Abstracto' },
  { value: 'Impressionistic', label: 'Impresionista'},
  { value: 'Steampunk', label: 'Steampunk' },
  { value: 'Vintage Photography', label: 'Fotografía Vintage'},
  { value: 'Line Art', label: 'Arte Lineal'},
  { value: '3D Render', label: 'Render 3D'},
];

const aspectRatios = [
  { value: '1:1', label: 'Cuadrado (1:1)' },
  { value: '16:9', label: 'Horizontal (16:9)' },
  { value: '9:16', label: 'Vertical (9:16)' },
  { value: '4:3', label: 'Paisaje (4:3)' },
  { value: '3:4', label: 'Retrato (3:4)' },
];

const imageQualities = [
  { value: 'draft', label: 'Borrador', description: 'Generación rápida, ideal para pruebas e iteraciones veloces. Menor detalle.' },
  { value: 'standard', label: 'Estándar', description: 'Equilibrio entre velocidad y detalle. Recomendado para uso general.' },
  { value: 'high', label: 'Alta', description: 'Mayor detalle y fidelidad visual. Puede tardar más en generar.' },
  // { value: 'ultra', label: 'Ultra Alta', description: 'Máximo detalle posible. Tiempos de generación significativamente más largos.' },
];


export function GenerationForm({ onImageGenerated }: GenerationFormProps) {
  const { toast } = useToast();
  const [currentTags, setCurrentTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [recentTags, setRecentTags] = useState<string[]>([]);

  const { control, handleSubmit, register, reset, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      prompt: '',
      tags: '',
      artisticStyle: 'none',
      aspectRatio: '1:1',
      imageQuality: 'standard',
    },
  });

  const promptValue = watch('prompt');

  useEffect(() => {
    const storedTags = localStorage.getItem(RECENT_TAGS_STORAGE_KEY);
    if (storedTags) {
      try {
        const parsedTags = JSON.parse(storedTags);
        if (Array.isArray(parsedTags)) {
          setRecentTags(parsedTags);
        }
      } catch (e) {
        console.error("Failed to parse recent tags from localStorage", e);
        setRecentTags([]);
      }
    }
  }, []);

  const updateRecentTags = useCallback((newlyAddedTags: string[]) => {
    setRecentTags(prevRecentTags => {
      const updated = [...newlyAddedTags.filter(tag => !prevRecentTags.includes(tag)), ...prevRecentTags];
      const uniqueRecent = Array.from(new Set(updated));
      const limitedRecent = uniqueRecent.slice(0, MAX_RECENT_TAGS);
      localStorage.setItem(RECENT_TAGS_STORAGE_KEY, JSON.stringify(limitedRecent));
      return limitedRecent;
    });
  }, []);

  useEffect(() => {
    setValue('tags', currentTags.join(','), { shouldValidate: true });
  }, [currentTags, setValue]);

  const handleTagInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setTagInput(event.target.value);
  };

  const handleTagInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === ',' || event.key === 'Enter') {
      event.preventDefault();
      const newTag = tagInput.trim();
      if (newTag && !currentTags.includes(newTag)) {
        setCurrentTags([...currentTags, newTag]);
      }
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setCurrentTags(currentTags.filter(tag => tag !== tagToRemove));
  };

  const clearPrompt = () => {
    setValue('prompt', '', { shouldValidate: true });
  };

  const addRecentTagToCurrent = (tag: string) => {
    if (!currentTags.includes(tag)) {
      setCurrentTags(prev => [...prev, tag]);
    }
  };

  const getImageDimensions = (blob: Blob): Promise<{width: number, height: number}> => {
    return new Promise((resolve, reject) => {
      const img = document.createElement('img');
      const objectUrl = URL.createObjectURL(blob);
      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
        URL.revokeObjectURL(objectUrl);
      };
      img.onerror = (err) => {
        reject(err);
        URL.revokeObjectURL(objectUrl);
      };
      img.src = objectUrl;
    });
  };

  async function onSubmit(data: FormData) {
    setIsGenerating(true);
    try {
      const result = await generateImageAction({
        prompt: data.prompt,
        artisticStyle: data.artisticStyle,
        aspectRatio: data.aspectRatio,
        imageQuality: data.imageQuality,
        initialTags: currentTags,
      });

      if (result.error) {
        toast({
          title: "Error de Generación",
          description: result.error,
          variant: "destructive",
        });
        return;
      }

      if (result.success && result.imageDataUri) {
        const fetchRes = await fetch(result.imageDataUri);
        if (!fetchRes.ok) {
          throw new Error(`Failed to process image data URI: ${fetchRes.statusText}`);
        }
        const imageBlob = await fetchRes.blob();
        let dimensions = { width: undefined, height: undefined };
        try {
            dimensions = await getImageDimensions(imageBlob);
        } catch (dimError) {
            console.warn("Could not determine image dimensions:", dimError);
        }

        const newImage: GeneratedImage = {
          id: result.id || uuidv4(),
          imageData: imageBlob,
          prompt: result.prompt || data.prompt,
          artisticStyle: result.artisticStyle || data.artisticStyle || 'none',
          aspectRatio: result.aspectRatio || data.aspectRatio || '1:1',
          imageQuality: result.imageQuality || data.imageQuality || 'standard',
          tags: result.tags || [],
          collections: result.collections || [],
          suggestedPrompt: result.suggestedPrompt || undefined,
          modelUsed: result.modelUsed || 'Desconocido',
          isFavorite: false,
          createdAt: result.createdAt ? new Date(result.createdAt) : new Date(),
          updatedAt: result.updatedAt ? new Date(result.updatedAt) : new Date(),
          width: dimensions.width,
          height: dimensions.height,
        };

        onImageGenerated(newImage);
        if (newImage.tags.length > 0) {
          updateRecentTags(newImage.tags);
        }
        toast({
          title: "¡Imagen Generada!",
          description: "La imagen ha sido añadida a tu historial.",
        });
        reset();
        setCurrentTags([]);
      } else if (result.success && !result.imageDataUri) {
        throw new Error("Image generation reported success but no image data was returned.");
      }
    } catch (error) {
      console.error("Generation error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Ocurrió un problema al generar o procesar la imagen.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <TooltipProvider>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Sparkles className="h-6 w-6 mr-2 text-primary" />
            Crear Nueva Imagen
          </CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="prompt">Prompt</Label>
              <div className="relative">
                <Controller
                  name="prompt"
                  control={control}
                  render={({ field }) => (
                    <Textarea
                      id="prompt"
                      placeholder="Describe la imagen que quieres generar..."
                      className="min-h-[100px] resize-none pr-10"
                      {...field}
                    />
                  )}
                />
                {promptValue && promptValue.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1 h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={clearPrompt}
                    aria-label="Limpiar prompt"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {errors.prompt && <p className="text-sm text-destructive">{errors.prompt.message}</p>}
              <p className="text-xs text-muted-foreground text-right">{promptValue?.length || 0} / 700</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="artisticStyle">Estilo Artístico</Label>
                <Controller
                  name="artisticStyle"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <SelectTrigger id="artisticStyle">
                        <SelectValue placeholder="Selecciona un estilo" />
                      </SelectTrigger>
                      <SelectContent>
                        {artisticStyles.map(style => (
                          <SelectItem key={style.value} value={style.value}>
                            {style.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.artisticStyle && <p className="text-sm text-destructive">{errors.artisticStyle.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="aspectRatio">Relación de Aspecto</Label>
                <Controller
                  name="aspectRatio"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <SelectTrigger id="aspectRatio">
                        <SelectValue placeholder="Selecciona relación" />
                      </SelectTrigger>
                      <SelectContent>
                        {aspectRatios.map(ratio => (
                          <SelectItem key={ratio.value} value={ratio.value}>
                            {ratio.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.aspectRatio && <p className="text-sm text-destructive">{errors.aspectRatio.message}</p>}
              </div>
            </div>

            <div className="space-y-2">
               <div className="flex items-center space-x-2">
                <Label htmlFor="imageQuality">Calidad de Imagen</Label>
                <Tooltip>
                  <TooltipTrigger type="button">
                    <HelpCircle className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-xs">
                    <p className="text-sm">
                      <strong>Borrador:</strong> Generación rápida, ideal para pruebas. Menor detalle.
                    </p>
                    <p className="text-sm mt-1">
                      <strong>Estándar:</strong> Equilibrio entre velocidad y detalle. Uso general.
                    </p>
                    <p className="text-sm mt-1">
                      <strong>Alta:</strong> Mayor detalle. Puede tardar más.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Controller
                name="imageQuality"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger id="imageQuality">
                      <SelectValue placeholder="Selecciona calidad" />
                    </SelectTrigger>
                    <SelectContent>
                      {imageQualities.map(quality => (
                        <SelectItem key={quality.value} value={quality.value} aria-label={quality.description}>
                          {quality.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.imageQuality && <p className="text-sm text-destructive">{errors.imageQuality.message}</p>}
            </div>


            <div className="space-y-2">
              <Label htmlFor="tags-input">Etiquetas (manuales, separadas por coma o Enter)</Label>
              <div className="flex items-center space-x-2">
                  <Tag className="h-5 w-5 text-muted-foreground" />
                  {/* Hidden input for RHF to manage the 'tags' field for validation */}
                  <input type="hidden" {...register("tags")} />
                  <Input
                      id="tags-input"
                      type="text"
                      placeholder="Añade etiquetas manuales..."
                      value={tagInput}
                      onChange={handleTagInputChange}
                      onKeyDown={handleTagInputKeyDown}
                      aria-describedby="tags-error"
                  />
              </div>
              {errors.tags && <p id="tags-error" className="text-sm text-destructive">{errors.tags.message}</p>}
              <div className="flex flex-wrap gap-2 mt-2">
                {currentTags.map(tag => (
                  <Badge key={tag} variant="secondary" className="flex items-center">
                    {tag}
                    <button type="button" onClick={() => removeTag(tag)} className="ml-1.5 text-muted-foreground hover:text-foreground" aria-label={`Remover etiqueta ${tag}`}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            {recentTags.length > 0 && (
              <div className="mt-4 space-y-2">
                <Label>Etiquetas Recientes</Label>
                <div className="flex flex-wrap gap-2">
                  {recentTags.map(tag => (
                    <Badge
                      key={`recent-${tag}`}
                      variant="outline"
                      className="cursor-pointer hover:bg-accent hover:text-accent-foreground"
                      onClick={() => addRecentTagToCurrent(tag)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') addRecentTagToCurrent(tag); }}
                      aria-label={`Añadir etiqueta reciente: ${tag}`}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generar Imagen
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </TooltipProvider>
  );
}
