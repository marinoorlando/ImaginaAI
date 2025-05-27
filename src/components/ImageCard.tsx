
"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, Download, Trash2, Copy, RefreshCw, Maximize, Edit3, AlertTriangle } from 'lucide-react';
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

interface ImageCardProps {
  image: GeneratedImage;
  onToggleFavorite: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdateTags: (id: string, newTags: string[]) => void;
}

export function ImageCard({ image, onToggleFavorite, onDelete, onUpdateTags }: ImageCardProps) {
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

  const handleSuggestTags = async () => {
    setIsSuggestingTags(true);
    try {
      const result = await suggestTagsAction({ prompt: image.prompt });
      if (result.success && result.tags) {
        const updatedTags = Array.from(new Set([...image.tags, ...result.tags]));
        onUpdateTags(image.id, updatedTags);
        toast({ title: "Etiquetas Sugeridas", description: "Se añadieron nuevas etiquetas." });
      } else {
        toast({ title: "Error al Sugerir", description: result.error || "No se pudieron obtener sugerencias.", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Ocurrió un problema al sugerir etiquetas.", variant: "destructive" });
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
      <div className="p-4 space-y-2">
        <div className="flex flex-wrap gap-1">
          {image.tags.slice(0, 3).map(tag => (
            <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
          ))}
          {image.tags.length > 3 && <Badge variant="outline" className="text-xs">+{image.tags.length - 3}</Badge>}
        </div>
        <p className="text-xs text-muted-foreground">Modelo: {image.modelUsed}</p>
        <p className="text-xs text-muted-foreground">Creada: {new Date(image.createdAt).toLocaleDateString()}</p>
      </div>
      <CardFooter className="p-2 border-t grid grid-cols-2 sm:grid-cols-3 gap-1">
        <Button variant="ghost" size="sm" onClick={() => onToggleFavorite(image.id)} className="flex items-center justify-start text-left w-full">
          <Heart className={`mr-1 h-4 w-4 ${image.isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
          Favorita
        </Button>
        <Button variant="ghost" size="sm" onClick={handleDownload} className="flex items-center justify-start text-left w-full">
          <Download className="mr-1 h-4 w-4" />
          Descargar
        </Button>
         <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" className="flex items-center justify-start text-left w-full text-destructive hover:text-destructive-foreground hover:bg-destructive">
              <Trash2 className="mr-1 h-4 w-4" />
              Eliminar
            </Button>
          </AlertDialogTrigger>
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
        <Button variant="ghost" size="sm" onClick={handleCopyPrompt} className="flex items-center justify-start text-left w-full">
          <Copy className="mr-1 h-4 w-4" />
          Copiar Prompt
        </Button>
        <Button variant="ghost" size="sm" onClick={handleSuggestTags} disabled={isSuggestingTags} className="flex items-center justify-start text-left w-full">
           {isSuggestingTags ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Edit3 className="mr-1 h-4 w-4" />}
          Sugerir Tags
        </Button>
        <Button variant="ghost" size="sm" onClick={() => handleNotImplemented("Regenerar")} className="flex items-center justify-start text-left w-full">
          <RefreshCw className="mr-1 h-4 w-4" />
          Regenerar
        </Button>
        {/* <Button variant="ghost" size="sm" onClick={() => handleNotImplemented("Zoom")} className="flex items-center justify-start text-left w-full">
          <Maximize className="mr-1 h-4 w-4" />
          Zoom
        </Button> */}
      </CardFooter>
    </Card>
  );
}
