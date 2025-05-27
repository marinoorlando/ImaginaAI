
"use client";

import React, { useState, useEffect } from 'react'; // Added useEffect
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from "@/hooks/use-toast";
import { generateImageAction } from '@/actions/imageActions';
import type { GeneratedImage } from '@/lib/types';
import { Sparkles, Tag, Loader2, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const formSchema = z.object({
  prompt: z.string().min(5, { message: "El prompt debe tener al menos 5 caracteres." }).max(500, { message: "El prompt no puede exceder los 500 caracteres." }),
  tags: z.string().min(1, { message: "Se requiere al menos una etiqueta." }),
});

type FormData = z.infer<typeof formSchema>;

interface GenerationFormProps {
  onImageGenerated: (image: GeneratedImage) => void;
}

export function GenerationForm({ onImageGenerated }: GenerationFormProps) {
  const { toast } = useToast();
  const [currentTags, setCurrentTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const { control, handleSubmit, register, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      prompt: '',
      tags: '',
    },
  });

  // Effect to synchronize currentTags (React state) with RHF's 'tags' field
  useEffect(() => {
    // `setValue` updates RHF's internal state for the 'tags' field.
    // `shouldValidate: true` ensures that RHF re-validates the 'tags' field
    // whenever currentTags changes, providing immediate feedback.
    control.setValue('tags', currentTags.join(','), { shouldValidate: true });
  }, [currentTags, control]);

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
  
  async function onSubmit(data: FormData) {
    // By the time onSubmit is called by RHF's handleSubmit,
    // RHF has already validated the form data, including 'data.tags'
    // which should be up-to-date thanks to the useEffect hook.
    // Thus, currentTags should not be empty if validation passed.

    setIsGenerating(true);
    try {
      const result = await generateImageAction({ prompt: data.prompt });

      if (result.error) {
        toast({
          title: "Error de Generación",
          description: result.error,
          variant: "destructive",
        });
        return;
      }

      if (result.success && result.imageUrl) {
        const response = await fetch(result.imageUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.statusText}`);
        }
        const imageBlob = await response.blob();
        
        const newImage: GeneratedImage = {
          id: result.id || uuidv4(),
          imageData: imageBlob,
          prompt: result.prompt || data.prompt,
          tags: currentTags, // Use the React state currentTags for the actual array
          modelUsed: result.modelUsed || 'Desconocido',
          isFavorite: false,
          createdAt: result.createdAt ? new Date(result.createdAt) : new Date(),
          updatedAt: result.updatedAt ? new Date(result.updatedAt) : new Date(),
          originalUrl: result.imageUrl,
        };

        onImageGenerated(newImage);
        toast({
          title: "¡Imagen Generada!",
          description: "La imagen ha sido añadida a tu historial.",
        });
        reset(); // Resets RHF fields to defaultValues
        setCurrentTags([]); // Reset local tag state
      }
    } catch (error) {
      console.error("Generation error:", error);
      toast({
        title: "Error",
        description: "Ocurrió un problema al generar o procesar la imagen.",
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
            <Controller
              name="prompt"
              control={control}
              render={({ field }) => (
                <Textarea
                  id="prompt"
                  placeholder="Describe la imagen que quieres generar..."
                  className="min-h-[100px] resize-none"
                  {...field}
                />
              )}
            />
            {errors.prompt && <p className="text-sm text-destructive">{errors.prompt.message}</p>}
            <p className="text-xs text-muted-foreground text-right">{control._getWatch('prompt')?.length || 0} / 500</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags-input">Etiquetas (separadas por coma o Enter)</Label>
             <div className="flex items-center space-x-2">
                <Tag className="h-5 w-5 text-muted-foreground" />
                {/* Hidden input for RHF to be aware of the 'tags' field. Value sync handled by useEffect. */}
                <input type="hidden" {...register("tags")} />
                <Input
                    id="tags-input"
                    type="text"
                    placeholder="Añade etiquetas..."
                    value={tagInput}
                    onChange={handleTagInputChange}
                    onKeyDown={handleTagInputKeyDown}
                    aria-describedby="tags-error"
                />
            </div>
            {/* Display RHF error for the 'tags' field */}
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
