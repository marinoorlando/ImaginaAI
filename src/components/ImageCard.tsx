
"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, Download, Trash2, Copy, RefreshCw, AlertTriangle, Loader2, Wand2, ZoomIn } from 'lucide-react';
import type { GeneratedImage } from '@/lib/types';
import { useToast } from "@/hooks/use-toast";
import { suggestTagsAction, generateImageAction } from '@/actions/imageActions'; // Changed import
import { updateGeneratedImage, db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from './ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ImageCardProps {
  image: GeneratedImage;
  onToggleFavorite: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdateTags: (id: string, newTags: string[]) => void;
  onCollectionsUpdated: (id: string, newCollections: string[]) => void;
  onImageGenerated: (image: GeneratedImage) => void; // Changed from onImageRegenerated
}

// Need to make artisticStyles accessible for display if not imported from elsewhere
const artisticStylesList = [
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


export function ImageCard({ 
  image, 
  onToggleFavorite, 
  onDelete, 
  onUpdateTags, 
  onCollectionsUpdated,
  onImageGenerated // Changed from onImageRegenerated
}: ImageCardProps) {
  const { toast } = useToast();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoadingImageUrl, setIsLoadingImageUrl] = useState(true);
  const [isSuggestingTags, setIsSuggestingTags] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  useEffect(() => {
    if (image.imageData instanceof Blob) {
      const url = URL.createObjectURL(image.imageData);
      setImageUrl(url);
      setIsLoadingImageUrl(false);
      return () => URL.revokeObjectURL(url);
    } else {
      console.warn(`Image data for ${image.id} is not a Blob:`, image.imageData);
      setIsLoadingImageUrl(false);
      setImageUrl(null); // Ensure no old URL is shown
    }
  }, [image.imageData, image.id]);

  const handleDownload = () => {
    if (imageUrl && image.imageData instanceof Blob) {
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = `imagina-ai-${image.id.substring(0,8)}.${image.imageData.type.split('/')[1] || 'png'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({ title: "Imagen Descargada" });
    } else {
      toast({ title: "Error", description: "No se pudo descargar la imagen.", variant: "destructive" });
    }
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(image.prompt)
      .then(() => toast({ title: "Prompt Copiado" }))
      .catch(() => toast({ title: "Error", description: "No se pudo copiar el prompt.", variant: "destructive" }));
  };

  const handleSuggestCollections = async () => {
    console.log(`[ImageCard] handleSuggestCollections called for imageId: ${image.id}, prompt: ${image.prompt}`);
    if (!image.prompt) {
      toast({ title: "Error", description: "El prompt de la imagen está vacío, no se pueden sugerir colecciones.", variant: "destructive"});
      return;
    }
    setIsSuggestingTags(true);
    try {
      const result = await suggestTagsAction({ prompt: image.prompt });
      console.log(`[ImageCard] Result from suggestTagsAction for imageId ${image.id}:`, result);

      if (result.success && result.suggestedCollections) {
        await updateGeneratedImage(image.id, { collections: result.suggestedCollections });
        onCollectionsUpdated(image.id, result.suggestedCollections);
        
        if (result.suggestedCollections.length > 0) {
            toast({ title: "Colecciones Sugeridas", description: "Se añadieron y guardaron nuevas colecciones (IA)." });
        } else {
            toast({ title: "Sugerencia Completada", description: "La IA no sugirió nuevas colecciones. Las colecciones se han actualizado (a vacías si no había)." });
        }
      } else {
        console.error(`[ImageCard] Error or no suggested collections from suggestTagsAction for imageId ${image.id}:`, result.error);
        toast({ 
            title: "Error al Sugerir Colecciones", 
            description: result.error || "No se pudieron obtener sugerencias de la IA.", 
            variant: "destructive" 
        });
      }
    } catch (error) { 
      console.error(`[ImageCard] Catch block error in handleSuggestCollections for imageId ${image.id}:`, error);
      const errorMessage = error instanceof Error ? error.message : "Ocurrió un problema al procesar la solicitud de sugerir colecciones.";
      toast({ 
          title: "Error Inesperado", 
          description: errorMessage, 
          variant: "destructive" 
      });
    } finally {
      setIsSuggestingTags(false);
    }
  };

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    toast({ title: "Generando nueva imagen...", description: "Usando el prompt y estilo actual. Por favor espera." });
    try {
      const result = await generateImageAction({
        prompt: image.prompt,
        artisticStyle: image.artisticStyle || 'none',
      });

      if (result.error) {
        toast({ title: "Error de Generación", description: result.error, variant: "destructive" });
        return;
      }

      if (result.success && result.imageDataUri && result.id) {
        const fetchRes = await fetch(result.imageDataUri);
        if (!fetchRes.ok) throw new Error("Falló al obtener el Data URI de la nueva imagen.");
        const newImageBlob = await fetchRes.blob();
        
        const newImageEntry: GeneratedImage = {
          id: result.id, // New ID from server
          imageData: newImageBlob,
          prompt: result.prompt, // Original prompt
          artisticStyle: result.artisticStyle || 'none', // Original style
          tags: [], // New image starts with empty manual tags
          collections: result.collections || [], // New AI collections
          modelUsed: result.modelUsed || 'Desconocido',
          isFavorite: false, // New image is not favorite by default
          createdAt: result.createdAt ? new Date(result.createdAt) : new Date(),
          updatedAt: result.updatedAt ? new Date(result.updatedAt) : new Date(),
        };
        
        onImageGenerated(newImageEntry); // Use the prop for adding a new image
        toast({ title: "Nueva Imagen Generada", description: "La nueva imagen ha sido añadida al historial." });
      } else {
        throw new Error("La generación falló o no devolvió los datos necesarios.");
      }
    } catch (error) {
      console.error("Error regenerating as new image:", error);
      toast({ title: "Error", description: error instanceof Error ? error.message : "Ocurrió un problema al generar la nueva imagen.", variant: "destructive" });
    } finally {
      setIsRegenerating(false);
    }
  };
  
  return (
    <TooltipProvider>
      <Dialog>
        <Card className="flex flex-col overflow-hidden shadow-lg h-full">
          <CardHeader className="p-4">
            <CardTitle className="text-sm font-semibold truncate" title={image.prompt}>
              {image.prompt.length > 50 ? `${image.prompt.substring(0, 50)}...` : image.prompt}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 relative aspect-square flex-grow">
            {isLoadingImageUrl ? (
              <Skeleton className="w-full h-full" />
            ) : imageUrl ? (
              <DialogTrigger asChild>
                <div className="relative w-full h-full cursor-pointer group">
                  <Image
                    src={imageUrl}
                    alt={image.prompt}
                    fill={true}
                    style={{objectFit: "cover"}}
                    data-ai-hint="abstract art"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 flex items-center justify-center transition-opacity duration-200">
                    <ZoomIn className="h-10 w-10 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                  </div>
                </div>
              </DialogTrigger>
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center">
                <AlertTriangle className="w-12 h-12 text-destructive" />
                <span className="ml-2 text-destructive">Error al cargar imagen</span>
              </div>
            )}
          </CardContent>
          <div className="p-4 space-y-3">
            <div>
              {image.tags && image.tags.length > 0 && (
                <>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Etiquetas:</p>
                  <div className="flex flex-wrap gap-1">
                    {image.tags.slice(0, 3).map(tag => (
                      <Badge key={`tag-${tag}`} variant="secondary" className="text-xs">{tag}</Badge>
                    ))}
                    {image.tags.length > 3 && <Badge variant="outline" className="text-xs">+{image.tags.length - 3}</Badge>}
                  </div>
                </>
              )}
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1">Colecciones (IA):</p>
              {(image.collections && image.collections.length > 0) ? (
                <div className="flex flex-wrap gap-1">
                  {(image.collections || []).slice(0, 3).map(col => (
                    <Badge key={`col-${col}`} variant="outline" className="text-xs border-primary text-primary">{col}</Badge>
                  ))}
                  {(image.collections || []).length > 3 && <Badge variant="outline" className="text-xs">+{ (image.collections || []).length - 3}</Badge>}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">Ninguna sugerida aún.</p>
              )}
            </div>
            <p className="text-xs text-muted-foreground pt-1">Modelo: {image.modelUsed}</p>
             {image.artisticStyle && image.artisticStyle !== 'none' && <p className="text-xs text-muted-foreground">Estilo: {artisticStylesList.find(s => s.value === image.artisticStyle)?.label || image.artisticStyle}</p>}
            <p className="text-xs text-muted-foreground">Creada: {new Date(image.createdAt).toLocaleDateString()}</p>
          </div>
          <CardFooter className="p-2 border-t flex flex-wrap gap-1 justify-center items-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => onToggleFavorite(image.id)}>
                  <Heart className={`h-4 w-4 ${image.isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
                  <span className="sr-only">{image.isFavorite ? 'Desmarcar Favorita' : 'Marcar como Favorita'}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>{image.isFavorite ? 'Desmarcar Favorita' : 'Marcar como Favorita'}</p></TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={handleDownload}>
                  <Download className="h-4 w-4" />
                  <span className="sr-only">Descargar Imagen</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Descargar Imagen</p></TooltipContent>
            </Tooltip>
            
            <AlertDialog>
              <Tooltip>
                <TooltipTrigger asChild>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive-foreground hover:bg-destructive">
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Eliminar Imagen</span>
                    </Button>
                  </AlertDialogTrigger>
                </TooltipTrigger>
                <TooltipContent><p>Eliminar Imagen</p></TooltipContent>
              </Tooltip>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acción no se puede deshacer. Esto eliminará permanentemente la imagen de tu historial.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onDelete(image.id)} className="bg-destructive hover:bg-destructive/90">
                    Eliminar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={handleCopyPrompt}>
                  <Copy className="h-4 w-4" />
                  <span className="sr-only">Copiar Prompt</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Copiar Prompt</p></TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={handleSuggestCollections} disabled={isSuggestingTags}>
                  {isSuggestingTags ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                  <span className="sr-only">Sugerir Colecciones (IA)</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Sugerir Colecciones (IA)</p></TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={handleRegenerate} disabled={isRegenerating}>
                  {isRegenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  <span className="sr-only">Regenerar como Nueva Imagen</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Regenerar como Nueva Imagen</p></TooltipContent>
            </Tooltip>
          </CardFooter>
        </Card>
        <DialogContent className="sm:max-w-[80vw] md:max-w-[70vw] lg:max-w-[60vw] xl:max-w-[50vw] p-2">
          <DialogHeader className="p-2 border-b">
            <DialogTitle className="text-sm truncate">{image.prompt}</DialogTitle>
          </DialogHeader>
          <div className="relative aspect-video max-h-[80vh]">
            {imageUrl && (
              <Image
                src={imageUrl}
                alt={image.prompt}
                fill={true}
                style={{objectFit: "contain"}}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
