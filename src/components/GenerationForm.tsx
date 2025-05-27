
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
import { Sparkles, Tag, Loader2, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const formSchema = z.object({
  prompt: z.string().min(5, { message: "El prompt debe tener al menos 5 caracteres." }).max(500, { message: "El prompt no puede exceder los 500 caracteres." }),
  tags: z.string().min(1, { message: "Se requiere al menos una etiqueta." }),
  artisticStyle: z.string().optional(),
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
  
  async function onSubmit(data: FormData) {
    setIsGenerating(true);
    try {
      const result = await generateImageAction({ prompt: data.prompt, artisticStyle: data.artisticStyle });

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
        
        const newImage: GeneratedImage = {
          id: result.id || uuidv4(),
          imageData: imageBlob,
          prompt: result.prompt || data.prompt,
          artisticStyle: result.artisticStyle || data.artisticStyle || 'none', // Save artistic style
          tags: currentTags, 
          collections: result.collections || [], 
          modelUsed: result.modelUsed || 'Desconocido',
          isFavorite: false,
          createdAt: result.createdAt ? new Date(result.createdAt) : new Date(),
          updatedAt: result.updatedAt ? new Date(result.updatedAt) : new Date(),
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
            <p className="text-xs text-muted-foreground text-right">{promptValue?.length || 0} / 500</p>
          </div>

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
            <Label htmlFor="tags-input">Etiquetas (manuales, separadas por coma o Enter)</Label>
             <div className="flex items-center space-x-2">
                <Tag className="h-5 w-5 text-muted-foreground" />
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
  );
}
