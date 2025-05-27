"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { GeneratedImage } from '@/lib/types';
import { X, Tag, Heart, Save, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ImageDetailsDialogProps {
  image: GeneratedImage | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateTags: (id: string, newTags: string[]) => Promise<void>;
  onToggleFavorite: (id: string) => Promise<void>;
}

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

const aspectRatiosList = [
  { value: '1:1', label: 'Cuadrado (1:1)' },
  { value: '16:9', label: 'Horizontal (16:9)' },
  { value: '9:16', label: 'Vertical (9:16)' },
  { value: '4:3', label: 'Paisaje (4:3)' },
  { value: '3:4', label: 'Retrato (3:4)' },
];

const imageQualitiesList = [
  { value: 'draft', label: 'Borrador' },
  { value: 'standard', label: 'Estándar' },
  { value: 'high', label: 'Alta' },
];

const getLabel = (list: {value: string, label: string}[], value?: string) => {
  return list.find(item => item.value === value)?.label || value || 'N/A';
};

export function ImageDetailsDialog({
  image,
  open,
  onOpenChange,
  onUpdateTags,
  onToggleFavorite,
}: ImageDetailsDialogProps) {
  const { toast } = useToast();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [editableTags, setEditableTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isSavingTags, setIsSavingTags] = useState(false);
  const [isFavoriteSwitch, setIsFavoriteSwitch] = useState(image?.isFavorite || false);

  useEffect(() => {
    if (image) {
      if (image.imageData instanceof Blob) {
        const url = URL.createObjectURL(image.imageData);
        setImageUrl(url);
        // Cleanup function to revoke the object URL
        return () => URL.revokeObjectURL(url);
      } else {
        setImageUrl(null);
      }
      setEditableTags(image.tags ? [...image.tags] : []);
      setIsFavoriteSwitch(image.isFavorite);
    } else {
      setImageUrl(null);
      setEditableTags([]);
      setIsFavoriteSwitch(false);
    }
  }, [image]);


  if (!image) return null;

  const handleTagInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setTagInput(event.target.value);
  };

  const handleAddTag = () => {
    const newTag = tagInput.trim().toLowerCase();
    if (newTag && !editableTags.map(t => t.toLowerCase()).includes(newTag)) {
      setEditableTags([...editableTags, tagInput.trim()]); // Keep original casing for display
    }
    setTagInput('');
  };
  
  const handleTagInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === ',' || event.key === 'Enter') {
      event.preventDefault();
      handleAddTag();
    }
  };

  const removeTag = (tagToRemove: string) => {
    setEditableTags(editableTags.filter(tag => tag !== tagToRemove));
  };

  const handleSaveTags = async () => {
    if (!image) return;
    setIsSavingTags(true);
    try {
      await onUpdateTags(image.id, editableTags);
      toast({ title: "Etiquetas Actualizadas", description: "Las etiquetas manuales se han guardado." });
    } catch (error) {
      toast({ title: "Error al Guardar Etiquetas", description: "No se pudieron guardar las etiquetas.", variant: "destructive" });
      console.error("Error saving tags:", error);
    } finally {
      setIsSavingTags(false);
    }
  };

  const handleToggleFavoriteSwitch = async (checked: boolean) => {
    if (!image) return;
    setIsFavoriteSwitch(checked); // Optimistic UI update
    try {
      await onToggleFavorite(image.id);
      toast({ title: "Favorito Actualizado" });
    } catch (error) {
      setIsFavoriteSwitch(!checked); // Revert on error
      toast({ title: "Error al Actualizar Favorito", variant: "destructive" });
    }
  };
  
  const formatBytes = (bytes?: number, decimals = 2) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const hasTagsChanged = () => {
    if (!image) return false;
    if (editableTags.length !== image.tags.length) return true;
    const currentSorted = [...editableTags].sort();
    const originalSorted = [...image.tags].sort();
    return !currentSorted.every((tag, index) => tag === originalSorted[index]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle>Detalles y Edición de Imagen</DialogTitle>
          <DialogDescription>
            Visualiza la información completa y edita atributos de la imagen.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-grow overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 p-6">
            {/* Image Preview Section */}
            <div className="space-y-3">
              <div className="aspect-square w-full relative bg-muted rounded-md overflow-hidden shadow">
                {imageUrl ? (
                  <Image src={imageUrl} alt={image.prompt} layout="fill" objectFit="contain" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <span>Sin previsualización</span>
                  </div>
                )}
              </div>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p><strong>ID:</strong> <span className="font-mono break-all">{image.id}</span></p>
                <p><strong>Tipo:</strong> {image.imageData.type || 'N/A'}</p>
                <p><strong>Tamaño:</strong> {formatBytes(image.imageData.size)}</p>
              </div>
            </div>

            {/* Details & Edit Section */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="prompt-display" className="text-sm font-medium">Prompt Completo</Label>
                <ScrollArea className="h-20 w-full rounded-md border p-2 mt-1 text-sm bg-secondary/30">
                  {image.prompt}
                </ScrollArea>
              </div>

              <div>
                <Label htmlFor="tags-input-dialog" className="text-sm font-medium">Etiquetas Manuales</Label>
                <div className="flex items-center space-x-2 mt-1">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    <Input
                        id="tags-input-dialog"
                        type="text"
                        placeholder="Añadir etiqueta..."
                        value={tagInput}
                        onChange={handleTagInputChange}
                        onKeyDown={handleTagInputKeyDown}
                        className="h-8 text-sm flex-grow"
                    />
                    <Button variant="outline" size="sm" onClick={handleAddTag} className="h-8">Añadir</Button>
                </div>
                {editableTags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {editableTags.map(tag => (
                      <Badge key={tag} variant="secondary" className="text-xs flex items-center">
                        {tag}
                        <button type="button" onClick={() => removeTag(tag)} className="ml-1 text-muted-foreground hover:text-foreground" aria-label={`Remover etiqueta ${tag}`}>
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
                {hasTagsChanged() && (
                   <Button size="sm" onClick={handleSaveTags} disabled={isSavingTags} className="mt-3 text-xs h-8">
                    {isSavingTags ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
                    Guardar Etiquetas
                  </Button>
                )}
              </div>

              <div>
                <Label className="text-sm font-medium">Colecciones (IA)</Label>
                {(image.collections && image.collections.length > 0) ? (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {image.collections.map(col => (
                      <Badge key={`col-dialog-${col}`} variant="outline" className="text-xs border-primary/70 text-primary">{col}</Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic mt-1">Ninguna sugerida.</p>
                )}
              </div>
              
              <div className="space-y-2 text-sm pt-2">
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  <p><strong>Modelo:</strong> <span className="text-muted-foreground">{image.modelUsed}</span></p>
                  <p><strong>Estilo:</strong> <span className="text-muted-foreground">{getLabel(artisticStylesList, image.artisticStyle)}</span></p>
                  <p><strong>Aspecto:</strong> <span className="text-muted-foreground">{getLabel(aspectRatiosList, image.aspectRatio)}</span></p>
                  <p><strong>Calidad:</strong> <span className="text-muted-foreground">{getLabel(imageQualitiesList, image.imageQuality)}</span></p>
                </div>
                <div className="flex items-center pt-1">
                  <Label htmlFor="favorite-switch-dialog" className="text-sm font-medium mr-2">Favorito:</Label>
                  <Switch
                    id="favorite-switch-dialog"
                    checked={isFavoriteSwitch}
                    onCheckedChange={handleToggleFavoriteSwitch}
                    aria-label="Marcar como favorito"
                  />
                </div>
              </div>

              <div className="text-xs text-muted-foreground space-y-0.5 pt-2">
                <p><strong>Creada:</strong> {new Date(image.createdAt).toLocaleString()}</p>
                <p><strong>Actualizada:</strong> {new Date(image.updatedAt).toLocaleString()}</p>
              </div>

            </div>
          </div>
        </ScrollArea>
        
        <DialogFooter className="p-4 border-t mt-auto">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
