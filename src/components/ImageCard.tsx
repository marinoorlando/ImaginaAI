
"use client";

import React, { useState, useEffect, useRef } from 'react';
import NextImage from 'next/image'; 
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, Download, Trash2, Copy, RefreshCw, AlertTriangle, Loader2, Wand2, ZoomIn, FileText, CheckCircle2, Lightbulb } from 'lucide-react';
import type { GeneratedImage } from '@/lib/types';
import { useToast } from "@/hooks/use-toast";
import { suggestTagsAction, generateImageAction } from '@/actions/imageActions';
import { updateGeneratedImage } from '@/lib/db'; 
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
import { ImageDetailsDialog } from './ImageDetailsDialog'; 

interface ImageCardProps {
  image: GeneratedImage;
  onToggleFavorite: (id: string) => Promise<void>;
  onDelete: (id: string) => void;
  onUpdateTags: (id: string, newTags: string[]) => Promise<void>;
  onImageMetaUpdated: (id: string, updates: { collections?: string[], suggestedPrompt?: string }) => void;
  onImageGenerated: (image: GeneratedImage) => void; 
  onImageResized: (id: string, newBlob: Blob, width: number, height: number) => Promise<void>; 
}

export function ImageCard({
  image,
  onToggleFavorite,
  onDelete,
  onUpdateTags,
  onImageMetaUpdated,
  onImageGenerated,
  onImageResized,
}: ImageCardProps) {
  const { toast } = useToast();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoadingImageUrl, setIsLoadingImageUrl] = useState(true);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isRegeneratingWithSuggested, setIsRegeneratingWithSuggested] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  
  const [isFullImageViewOpen, setIsFullImageViewOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const panStartCoordsRef = useRef({ x: 0, y: 0 });
  const panStartOffsetRef = useRef({ x: 0, y: 0 });
  const [currentPanOffset, setCurrentPanOffset] = useState({ x: 0, y: 0 });
  const imageContainerRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    let objectUrl: string | null = null;
    if (image.imageData instanceof Blob) {
      objectUrl = URL.createObjectURL(image.imageData);
      setImageUrl(objectUrl);
      setIsLoadingImageUrl(false);
    } else {
      console.warn(`Image data for ${image.id} is not a Blob:`, image.imageData);
      setIsLoadingImageUrl(false);
      setImageUrl(null); 
    }
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [image.imageData, image.id]);

  useEffect(() => {
    if (!isFullImageViewOpen) {
      setZoomLevel(1); 
      setCurrentPanOffset({ x: 0, y: 0 });
      setIsPanning(false);
    }
  }, [isFullImageViewOpen]);

  useEffect(() => {
    const handleGlobalMouseMove = (event: MouseEvent) => {
      if (!isPanning) return;
      const dx = event.clientX - panStartCoordsRef.current.x;
      const dy = event.clientY - panStartCoordsRef.current.y;
      setCurrentPanOffset({
        x: panStartOffsetRef.current.x + dx,
        y: panStartOffsetRef.current.y + dy,
      });
    };

    const handleGlobalMouseUp = () => {
      if (isPanning) {
        setIsPanning(false);
      }
    };

    if (isPanning) {
      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);
    } else {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isPanning]);


  const handleWheelZoom = (event: React.WheelEvent<HTMLDivElement>) => {
    if (!isFullImageViewOpen) return;

    event.preventDefault();
    const zoomSpeed = 0.1;
    let newZoomLevel = zoomLevel;

    if (event.deltaY < 0) { 
      newZoomLevel = Math.min(zoomLevel + zoomSpeed, 5); 
    } else { 
      newZoomLevel = Math.max(zoomLevel - zoomSpeed, 0.2); 
    }
    setZoomLevel(newZoomLevel);
  };

  const handleMouseDownOnImage = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.button !== 0 || zoomLevel <= 1) return; // Only pan on left click and if zoomed in
    event.preventDefault();
    setIsPanning(true);
    panStartCoordsRef.current = { x: event.clientX, y: event.clientY };
    panStartOffsetRef.current = currentPanOffset;
  };

  let cursorStyle = 'zoom-in';
  if (zoomLevel > 1) {
    cursorStyle = isPanning ? 'grabbing' : 'grab';
  } else if (zoomLevel < 1 && zoomLevel !== 1) { // Check explicitly not 1 for zoom-out
    cursorStyle = 'zoom-out';
  }


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

  const handleDownload = () => {
    if (imageUrl && image.imageData instanceof Blob) {
      const link = document.createElement('a');
      link.href = imageUrl;
      const extension = image.imageData.type.split('/')[1] || 'png';
      link.download = `imagina-ai-${image.id.substring(0,8)}.${extension}`;
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

  const handleSuggestMeta = async () => {
    if (!image.prompt) {
      toast({ title: "Error", description: "El prompt de la imagen está vacío, no se pueden sugerir colecciones/prompt.", variant: "destructive"});
      return;
    }
    setIsSuggesting(true);
    console.log(`[ImageCard] Requesting AI suggestions for imageId: ${image.id}, prompt: ${image.prompt}`);
    try {
      const result = await suggestTagsAction({ prompt: image.prompt });
      console.log(`[ImageCard] AI Suggestion Result for imageId ${image.id}:`, result);

      if (result.error) {
        toast({ title: "Error al Sugerir", description: result.error, variant: "destructive" });
      } else if (result.success) {
        const updates: { collections?: string[], suggestedPrompt?: string } = {};
        let hasNewSuggestions = false;

        if (result.suggestedCollections) {
            updates.collections = result.suggestedCollections;
            if (result.suggestedCollections.length > 0) hasNewSuggestions = true;
        }
        if (result.suggestedPrompt) {
            updates.suggestedPrompt = result.suggestedPrompt;
            hasNewSuggestions = true;
        }

        if (Object.keys(updates).length > 0) {
          await updateGeneratedImage(image.id, updates); 
          onImageMetaUpdated(image.id, updates); 
        }
        
        let toastMessage = "Sugerencias procesadas.";
        if (result.suggestedCollections && result.suggestedCollections.length > 0 && result.suggestedPrompt) {
            toastMessage = "Nuevas colecciones y prompt sugerido por IA guardados.";
        } else if (result.suggestedCollections && result.suggestedCollections.length > 0) {
            toastMessage = "Nuevas colecciones sugeridas por IA guardadas.";
        } else if (result.suggestedPrompt) {
            toastMessage = "Nuevo prompt sugerido por IA guardado.";
        } else if (!hasNewSuggestions) {
             toastMessage = "La IA no generó nuevas sugerencias o las existentes ya son las mejores.";
        }
        toast({ title: "Sugerencias de IA", description: toastMessage });
      } else {
         toast({ title: "Respuesta Inesperada", description: "No se pudieron obtener sugerencias de la IA.", variant: "destructive" });
      }
    } catch (error) {
      console.error(`[ImageCard] Catch block error in handleSuggestMeta for imageId ${image.id}:`, error);
      const errorMessage = error instanceof Error ? error.message : "Ocurrió un problema al procesar la solicitud de sugerencias.";
      toast({ title: "Error Inesperado", description: errorMessage, variant: "destructive" });
    } finally {
      setIsSuggesting(false);
    }
  };
  
  const handleRegenerate = async () => {
    setIsRegenerating(true);
    toast({ title: "Generando nueva imagen...", description: "Usando el prompt original. Por favor espera." });
    try {
      const result = await generateImageAction({
        prompt: image.prompt,
        artisticStyle: image.artisticStyle || 'none',
        aspectRatio: image.aspectRatio || '1:1',
        imageQuality: image.imageQuality || 'standard',
        initialTags: image.tags, 
      });

      if (result.error) {
        toast({ title: "Error de Generación", description: result.error, variant: "destructive" });
        return;
      }

      if (result.success && result.imageDataUri && result.id) {
        const fetchRes = await fetch(result.imageDataUri);
        if (!fetchRes.ok) throw new Error("Falló al obtener el Data URI de la nueva imagen.");
        const newImageBlob = await fetchRes.blob();
        let dimensions = { width: undefined, height: undefined };
        try {
            dimensions = await getImageDimensions(newImageBlob);
        } catch (dimError) {
            console.warn("Could not determine image dimensions for regenerated image:", dimError);
        }

        const newImageEntry: GeneratedImage = {
          id: result.id, 
          imageData: newImageBlob,
          prompt: result.prompt, 
          artisticStyle: result.artisticStyle || 'none',
          aspectRatio: result.aspectRatio || '1:1',
          imageQuality: result.imageQuality || 'standard',
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
        onImageGenerated(newImageEntry); 
        toast({ title: "Nueva Imagen Generada", description: "La nueva imagen (desde prompt original) ha sido añadida al historial." });
      } else {
        throw new Error("La generación falló o no devolvió los datos necesarios.");
      }
    } catch (error) {
      console.error("Error regenerating as new image (original prompt):", error);
      toast({ title: "Error", description: error instanceof Error ? error.message : "Ocurrió un problema al generar la nueva imagen.", variant: "destructive" });
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleRegenerateWithSuggestedPrompt = async () => {
    if (!image.suggestedPrompt) {
      toast({ title: "Error", description: "No hay prompt sugerido para esta imagen.", variant: "destructive" });
      return;
    }
    setIsRegeneratingWithSuggested(true);
    toast({ title: "Generando nueva imagen...", description: "Usando el prompt sugerido por IA. Por favor espera." });
    try {
      const result = await generateImageAction({
        prompt: image.suggestedPrompt, 
        artisticStyle: image.artisticStyle || 'none',
        aspectRatio: image.aspectRatio || '1:1',
        imageQuality: image.imageQuality || 'standard',
        initialTags: image.tags, 
      });

      if (result.error) {
        toast({ title: "Error de Generación", description: result.error, variant: "destructive" });
        return;
      }

      if (result.success && result.imageDataUri && result.id) {
        const fetchRes = await fetch(result.imageDataUri);
        if (!fetchRes.ok) throw new Error("Falló al obtener el Data URI de la nueva imagen.");
        const newImageBlob = await fetchRes.blob();
        let dimensions = { width: undefined, height: undefined };
        try {
            dimensions = await getImageDimensions(newImageBlob);
        } catch (dimError) {
            console.warn("Could not determine image dimensions for regenerated image (suggested prompt):", dimError);
        }
        
        const newImageEntry: GeneratedImage = {
          id: result.id, 
          imageData: newImageBlob,
          prompt: result.prompt, 
          artisticStyle: result.artisticStyle || 'none',
          aspectRatio: result.aspectRatio || '1:1',
          imageQuality: result.imageQuality || 'standard',
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
        onImageGenerated(newImageEntry); 
        toast({ title: "Nueva Imagen Generada", description: "La nueva imagen (desde prompt sugerido) ha sido añadida al historial." });
      } else {
        throw new Error("La generación con prompt sugerido falló o no devolvió los datos necesarios.");
      }
    } catch (error) {
      console.error("Error regenerating with suggested prompt:", error);
      toast({ title: "Error", description: error instanceof Error ? error.message : "Ocurrió un problema al generar la nueva imagen con el prompt sugerido.", variant: "destructive" });
    } finally {
      setIsRegeneratingWithSuggested(false);
    }
  };

  const suggestionTooltipText = image.suggestedPrompt && image.suggestedPrompt.trim() !== ''
    ? "Actualizar Sugerencias (IA)"
    : "Sugerir Colecciones y Prompt (IA)";

  return (
    <TooltipProvider>
      <Card className="flex flex-col overflow-hidden shadow-lg h-full">
        <CardHeader className="p-4">
          <CardTitle className="text-sm font-semibold truncate" title={image.prompt}>
            {image.prompt.length > 50 ? `${image.prompt.substring(0, 50)}...` : image.prompt}
          </CardTitle>
        </CardHeader>
        
        <Dialog open={isFullImageViewOpen} onOpenChange={setIsFullImageViewOpen}>
          <CardContent className="p-0 relative aspect-square flex-grow">
            {isLoadingImageUrl ? (
              <Skeleton className="w-full h-full" />
            ) : imageUrl ? (
              <DialogTrigger asChild>
                <div className="relative w-full h-full cursor-pointer group">
                  <NextImage
                    src={imageUrl}
                    alt={image.prompt}
                    fill={true}
                    style={{objectFit: "contain", objectPosition: "center center"}}
                    data-ai-hint="abstract art"
                    priority 
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
          <DialogContent 
            className="sm:max-w-[80vw] md:max-w-[70vw] lg:max-w-[60vw] xl:max-w-[50vw] p-2"
          >
            <DialogHeader className="p-2 border-b">
              <DialogTitle className="text-sm truncate">{image.prompt}</DialogTitle>
            </DialogHeader>
            <div 
              ref={imageContainerRef}
              className="relative aspect-video max-h-[80vh] overflow-hidden select-none"
              onWheel={handleWheelZoom}
              onMouseDown={handleMouseDownOnImage}
              style={{ cursor: cursorStyle }}
            >
              {imageUrl && (
                <NextImage
                  src={imageUrl}
                  alt={image.prompt}
                  fill={true}
                  style={{
                    objectFit: "contain",
                    objectPosition: "left center",
                    transform: `translate(${currentPanOffset.x}px, ${currentPanOffset.y}px) scale(${zoomLevel})`,
                    transformOrigin: 'left center',
                    transition: isPanning ? 'none' : 'transform 0.1s ease-out',
                    cursor: 'inherit',
                  }}
                  draggable={false}
                  priority
                />
              )}
            </div>
          </DialogContent>
        </Dialog>

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
          <p className="text-xs text-muted-foreground pt-1">Modelo: {image.modelUsed}</p>
          <p className="text-xs text-muted-foreground">
            Aspecto: {image.aspectRatio}, Calidad: {image.imageQuality}
            {image.width && image.height && `, Dim: ${image.width}x${image.height}`}
          </p>
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
          
          <div className="flex items-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={handleSuggestMeta} disabled={isSuggesting}>
                  {isSuggesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                  <span className="sr-only">{suggestionTooltipText}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>{suggestionTooltipText}</p></TooltipContent>
            </Tooltip>
            {image.suggestedPrompt && image.suggestedPrompt.trim() !== '' && !isSuggesting && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="ml-0.5 flex items-center justify-center" aria-hidden="true">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  </span>
                </TooltipTrigger>
                <TooltipContent><p>Ya existe un prompt sugerido por IA</p></TooltipContent>
              </Tooltip>
            )}
          </div>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={handleRegenerate} disabled={isRegenerating}>
                {isRegenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                <span className="sr-only">Regenerar como Nueva Imagen (Prompt Original)</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>Regenerar como Nueva Imagen (Prompt Original)</p></TooltipContent>
          </Tooltip>

          {image.suggestedPrompt && image.suggestedPrompt.trim() !== '' && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={handleRegenerateWithSuggestedPrompt} disabled={isRegeneratingWithSuggested}>
                  {isRegeneratingWithSuggested ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lightbulb className="h-4 w-4" />}
                  <span className="sr-only">Regenerar como Nueva Imagen (Prompt Sugerido)</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Regenerar como Nueva Imagen (Prompt Sugerido)</p></TooltipContent>
            </Tooltip>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => setIsDetailsDialogOpen(true)}>
                <FileText className="h-4 w-4" />
                <span className="sr-only">Ver Detalles y Editar</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>Ver Detalles y Editar</p></TooltipContent>
          </Tooltip>
        </CardFooter>
      </Card>

      <ImageDetailsDialog
        image={image}
        open={isDetailsDialogOpen}
        onOpenChange={setIsDetailsDialogOpen}
        onUpdateTags={onUpdateTags}
        onToggleFavorite={onToggleFavorite}
        onImageResized={onImageResized} 
      />
    </TooltipProvider>
  );
}

