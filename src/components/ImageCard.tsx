
"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, Download, Trash2, Copy, RefreshCw, AlertTriangle, Loader2, Wand2 } from 'lucide-react';
import type { GeneratedImage } from '@/lib/types';
import { useToast } from "@/hooks/use-toast";
import { suggestTagsAction } from '@/actions/imageActions';
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
  onUpdateTags: (id: string, newTags: string[]) => void; // For manual tags
  onCollectionsUpdated: (id: string, newCollections: string[]) => void; // For AI collections
}

export function ImageCard({ image, onToggleFavorite, onDelete, onUpdateTags, onCollectionsUpdated }: ImageCardProps) {
  const { toast } = useToast();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoadingImageUrl, setIsLoadingImageUrl] = useState(true);
  const [isSuggestingTags, setIsSuggestingTags] = useState(false);

  useEffect(() => {
    if (image.imageData) {
      const url = URL.createObjectURL(image.imageData);
      setImageUrl(url);
      setIsLoadingImageUrl(false);
      return () => URL.revokeObjectURL(url);
    } else {
      setIsLoadingImageUrl(false);
    }
  }, [image.imageData]);

  const handleDownload = () => {
    if (imageUrl && image.imageData) {
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
    setIsSuggestingTags(true);
    try {
      const result = await suggestTagsAction({ imageId: image.id, prompt: image.prompt });
      if (result.success && result.suggestedCollections) {
        onCollectionsUpdated(image.id, result.suggestedCollections); 
        toast({ title: "Colecciones Sugeridas", description: "Se añadieron nuevas colecciones (IA)." });
      } else {
        toast({ title: "Error al Sugerir", description: result.error || "No se pudieron obtener sugerencias.", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Ocurrió un problema al sugerir colecciones.", variant: "destructive" });
    } finally {
      setIsSuggestingTags(false);
    }
  };
  
  const handleNotImplemented = (feature: string) => {
    toast({
      title: "Función no implementada",
      description: `${feature} estará disponible pronto.`,
    });
  };

  return (
    <TooltipProvider>
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
            <Image
              src={imageUrl}
              alt={image.prompt}
              layout="fill"
              objectFit="cover"
              data-ai-hint="abstract art"
            />
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
            {(image.collections && image.collections.length > 0) && (
              <>
                <p className="text-xs font-semibold text-muted-foreground mb-1">Colecciones (IA):</p>
                <div className="flex flex-wrap gap-1">
                  {(image.collections || []).slice(0, 3).map(col => (
                    <Badge key={`col-${col}`} variant="outline" className="text-xs border-blue-500 text-blue-700">{col}</Badge>
                  ))}
                  {(image.collections || []).length > 3 && <Badge variant="outline" className="text-xs">+{ (image.collections || []).length - 3}</Badge>}
                </div>
              </>
            )}
          </div>
          <p className="text-xs text-muted-foreground pt-1">Modelo: {image.modelUsed}</p>
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
              <Button variant="ghost" size="icon" onClick={() => handleNotImplemented("Regenerar")}>
                <RefreshCw className="h-4 w-4" />
                <span className="sr-only">Regenerar Imagen</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>Regenerar Imagen</p></TooltipContent>
          </Tooltip>
        </CardFooter>
      </Card>
    </TooltipProvider>
  );
}
