
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import NextImage from 'next/image'; // Renamed to avoid conflict with HTMLImageElement
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
import { X, Tag, Heart, Save, Loader2, Copy, IterationCcwIcon } from 'lucide-react'; // Using IterationCcwIcon for resize
import { useToast } from '@/hooks/use-toast';

interface ImageDetailsDialogProps {
  image: GeneratedImage | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateTags: (id: string, newTags: string[]) => Promise<void>;
  onToggleFavorite: (id: string) => Promise<void>;
  onImageResized: (id: string, newBlob: Blob, width: number, height: number) => Promise<void>;
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
  onImageResized,
}: ImageDetailsDialogProps) {
  const { toast } = useToast();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [editableTags, setEditableTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isSavingTags, setIsSavingTags] = useState(false);
  const [isFavoriteSwitch, setIsFavoriteSwitch] = useState(image?.isFavorite || false);

  const [newWidth, setNewWidth] = useState<number>(0);
  const [newHeight, setNewHeight] = useState<number>(0);
  const [originalAspectRatio, setOriginalAspectRatio] = useState<number>(1);
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;

    if (image && open) { // Added 'open' condition to re-init when dialog opens with a new image
      console.log('[ImageDetailsDialog] Image received:', JSON.parse(JSON.stringify(image, (key, value) => key === 'imageData' ? 'Blob omitted' : value)));
      console.log('[ImageDetailsDialog] Image tags:', image.tags);

      if (image.imageData instanceof Blob) {
        objectUrl = URL.createObjectURL(image.imageData);
        setImageUrl(objectUrl);
      } else {
        setImageUrl(null);
      }
      setEditableTags(image.tags ? [...image.tags] : []);
      setIsFavoriteSwitch(image.isFavorite);
      
      if (image.width && image.height) {
        setNewWidth(image.width);
        setNewHeight(image.height);
        if (image.height !== 0) {
          setOriginalAspectRatio(image.width / image.height);
        } else {
          setOriginalAspectRatio(1); // Avoid division by zero
        }
      } else {
        setNewWidth(300); 
        setNewHeight(300);
        setOriginalAspectRatio(1);
      }
    } else if (!open) {
        // Reset states when dialog is closed
        setImageUrl(null);
        setEditableTags([]);
        setIsFavoriteSwitch(false);
        setNewWidth(0);
        setNewHeight(0);
        setOriginalAspectRatio(1);
        setTagInput('');
    }


    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [image, open]);


  if (!image) return null;

  const handleTagInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setTagInput(event.target.value);
  };

  const handleAddTag = () => {
    const newTag = tagInput.trim().toLowerCase();
    if (newTag && !editableTags.map(t => t.toLowerCase()).includes(newTag)) {
      setEditableTags(prev => [...prev, tagInput.trim()]);
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
    setIsFavoriteSwitch(checked);
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

  const hasTagsChanged = useCallback(() => {
    if (!image) return false;
    const originalTags = image.tags || [];
    const currentEditableTags = editableTags || [];
    console.log("[hasTagsChanged] Comparing originalTags:", originalTags, "with editableTags:", currentEditableTags);
    if (currentEditableTags.length !== originalTags.length) {
      console.log("[hasTagsChanged] Lengths differ. Result: true");
      return true;
    }
    const sortedOriginal = [...originalTags].sort();
    const sortedEditable = [...currentEditableTags].sort();
    const changed = !sortedEditable.every((tag, index) => tag === sortedOriginal[index]);
    console.log("[hasTagsChanged] Sorted arrays comparison. Result:", changed);
    return changed;
  }, [image, editableTags]);

  const handleCopySuggestedPrompt = () => {
    if (image?.suggestedPrompt) {
      navigator.clipboard.writeText(image.suggestedPrompt)
        .then(() => toast({ title: "Prompt Sugerido Copiado" }))
        .catch(() => toast({ title: "Error", description: "No se pudo copiar el prompt sugerido.", variant: "destructive" }));
    }
  };

  const showSaveButton = hasTagsChanged();
  console.log("[Render Save Button?] hasTagsChanged() is:", showSaveButton);

  const handleWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const widthValue = parseInt(e.target.value, 10);
    if (!isNaN(widthValue) && widthValue > 0) {
      setNewWidth(widthValue);
      if (originalAspectRatio !== 0 && originalAspectRatio) { // Check for valid originalAspectRatio
        setNewHeight(Math.round(widthValue / originalAspectRatio));
      } else if (image?.width && image?.height && image.height !== 0) { // Recalculate if needed
        const currentRatio = image.width / image.height;
        setNewHeight(Math.round(widthValue / currentRatio));
      }
    } else if (e.target.value === '') {
      setNewWidth(0); // Allow clearing for typing
    }
  };

  const handleHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const heightValue = parseInt(e.target.value, 10);
    if (!isNaN(heightValue) && heightValue > 0) {
      setNewHeight(heightValue);
       if (originalAspectRatio !== 0 && originalAspectRatio) {
        setNewWidth(Math.round(heightValue * originalAspectRatio));
      } else if (image?.width && image?.height && image.height !== 0) {
        const currentRatio = image.width / image.height;
        setNewWidth(Math.round(heightValue * currentRatio));
      }
    } else if (e.target.value === '') {
      setNewHeight(0); // Allow clearing for typing
    }
  };

  const handleResizeImage = async () => {
    if (!image || !image.imageData || !(image.imageData instanceof Blob) || newWidth <= 0 || newHeight <= 0) {
      toast({ title: "Error de Redimensión", description: "Datos de imagen inválidos o dimensiones no válidas.", variant: "destructive" });
      return;
    }
    setIsResizing(true);
    try {
      const imgElement = document.createElement('img');
      const objectURL = URL.createObjectURL(image.imageData);

      imgElement.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = newWidth;
        canvas.height = newHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(objectURL); // Clean up
          toast({ title: "Error de Redimensión", description: "No se pudo obtener el contexto 2D del canvas.", variant: "destructive" });
          setIsResizing(false);
          return;
        }
        ctx.drawImage(imgElement, 0, 0, newWidth, newHeight);
        URL.revokeObjectURL(objectURL); // Clean up

        canvas.toBlob(async (newBlob) => {
          if (newBlob) {
            await onImageResized(image.id, newBlob, newWidth, newHeight);
            toast({ title: "Imagen Redimensionada", description: `Nuevas dimensiones: ${newWidth}x${newHeight}px.` });
            // The parent (HomePage) will reload data which re-initializes this dialog if it stays open.
            // Or, if it closes on resize, it will have fresh data on re-open.
            // To see immediate change in *this* dialog's preview, update imageUrl:
            // const newObjectUrl = URL.createObjectURL(newBlob);
            // setImageUrl(newObjectUrl); // Be careful to revoke this newObjectUrl on unmount/change.
          } else {
            toast({ title: "Error de Redimensión", description: "No se pudo convertir el canvas a Blob.", variant: "destructive" });
          }
          setIsResizing(false);
        }, image.imageData.type || 'image/png', 0.92); // Specify type and quality (0.92 for PNG is good)
      };
      imgElement.onerror = () => {
        URL.revokeObjectURL(objectURL); // Clean up
        toast({ title: "Error de Redimensión", description: "No se pudo cargar la imagen original para redimensionar.", variant: "destructive" });
        setIsResizing(false);
      };
      imgElement.src = objectURL;

    } catch (error) {
      console.error("Error resizing image:", error);
      toast({ title: "Error de Redimensión", description: error instanceof Error ? error.message : "Ocurrió un problema.", variant: "destructive" });
      setIsResizing(false);
    }
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
            <div className="space-y-3">
              <div className="aspect-square w-full relative bg-muted rounded-md overflow-hidden shadow">
                {imageUrl ? (
                  <NextImage src={imageUrl} alt={image.prompt} layout="fill" objectFit="contain" />
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
                {image.width && image.height && (
                  <p><strong>Dimensiones:</strong> {image.width} x {image.height} px</p>
                )}
              </div>
               {/* Resize Section */}
              <div className="pt-4 border-t mt-4">
                <Label className="text-sm font-medium mb-2 block">Redimensionar Imagen (mantener aspecto)</Label>
                <div className="grid grid-cols-2 gap-2 items-center mb-2">
                  <div>
                    <Label htmlFor="newWidth" className="text-xs">Ancho (px)</Label>
                    <Input
                      id="newWidth"
                      type="number"
                      value={newWidth || ''}
                      onChange={handleWidthChange}
                      className="h-8 text-sm"
                      disabled={isResizing}
                      min="1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="newHeight" className="text-xs">Alto (px)</Label>
                    <Input
                      id="newHeight"
                      type="number"
                      value={newHeight || ''}
                      onChange={handleHeightChange}
                      className="h-8 text-sm"
                      disabled={isResizing}
                      min="1"
                    />
                  </div>
                </div>
                <Button onClick={handleResizeImage} disabled={isResizing || newWidth <= 0 || newHeight <= 0} className="w-full h-9 text-sm">
                  {isResizing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <IterationCcwIcon className="mr-2 h-4 w-4" />}
                  Redimensionar Imagen
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="prompt-display" className="text-sm font-medium">Prompt Original</Label>
                <ScrollArea className="h-20 w-full rounded-md border p-2 mt-1 text-sm bg-secondary/30">
                  {image.prompt}
                </ScrollArea>
              </div>

              {image.suggestedPrompt && (
                <div>
                  <div className="flex justify-between items-center">
                    <Label htmlFor="suggested-prompt-display" className="text-sm font-medium">Prompt Sugerido (IA)</Label>
                    <Button variant="ghost" size="icon" onClick={handleCopySuggestedPrompt} className="h-6 w-6">
                      <Copy className="h-3.5 w-3.5" />
                      <span className="sr-only">Copiar Prompt Sugerido</span>
                    </Button>
                  </div>
                  <ScrollArea className="h-20 w-full rounded-md border p-2 mt-1 text-sm bg-secondary/30">
                    {image.suggestedPrompt}
                  </ScrollArea>
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="tags-input-dialog" className="text-sm font-medium mb-1 block">Etiquetas Manuales</Label>
                 <div className="flex items-center space-x-2">
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
                  <div className="flex flex-wrap gap-1 pt-1">
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
                {showSaveButton && (
                   <Button size="sm" onClick={handleSaveTags} disabled={isSavingTags} className="mt-2 text-xs h-8">
                    {isSavingTags ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
                    Guardar Etiquetas
                  </Button>
                )}
              </div>


              <div>
                <Label className="text-sm font-medium mb-1 block">Colecciones (IA)</Label>
                {(image.collections && image.collections.length > 0) ? (
                  <div className="flex flex-wrap gap-1">
                    {image.collections.map(col => (
                      <Badge key={`col-dialog-${col}`} variant="outline" className="text-xs border-primary/70 text-primary">{col}</Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">Ninguna sugerida.</p>
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
