
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { GenerationForm } from '@/components/GenerationForm';
import { ImageGrid } from '@/components/ImageGrid';
import { FilterControls } from '@/components/FilterControls';
import type { GeneratedImage, ExportedGeneratedImage } from '@/lib/types';
import { db, addGeneratedImage, getAllGeneratedImages, toggleFavoriteStatus, deleteGeneratedImage, updateGeneratedImage, filterImages, clearAllImages } from '@/lib/db';
import { useToast } from "@/hooks/use-toast";
import { blobToDataURI, dataURIToBlob } from '@/lib/fileUtils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { StatisticsDialog } from '@/components/StatisticsDialog';

export default function HomePage() {
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const [currentFilters, setCurrentFilters] = useState<{ searchTerm?: string; isFavorite?: true | undefined }>({});
  const [isClearHistoryDialogOpen, setIsClearHistoryDialogOpen] = useState(false);
  const [isStatisticsDialogOpen, setIsStatisticsDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadImages = useCallback(async (filters: { searchTerm?: string; isFavorite?: true | undefined } = currentFilters) => {
    setIsLoading(true);
    try {
      const fetchedImages = await filterImages(filters);
      setImages(fetchedImages);
    } catch (error) {
      console.error("Error loading images:", error);
      toast({ title: "Error", description: "No se pudieron cargar las imágenes.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast, currentFilters]); // Added currentFilters as dependency

  useEffect(() => {
    loadImages(currentFilters);
  }, [loadImages, currentFilters]);

  const handleImageGenerated = async (newImage: GeneratedImage) => {
    try {
      await addGeneratedImage(newImage);
      loadImages(); // Reload all images to reflect the new one, including filters
      toast({ title: "Imagen Guardada", description: "La nueva imagen se ha guardado en el historial." });
    } catch (error) {
      console.error("Error saving new image:", error);
      toast({ title: "Error", description: "No se pudo guardar la nueva imagen.", variant: "destructive" });
    }
  };

  const handleToggleFavorite = async (id: string) => {
    try {
      await toggleFavoriteStatus(id);
      // Optimistically update UI, then reload if filters are active
      setImages(prevImages =>
        prevImages.map(img => img.id === id ? { ...img, isFavorite: !img.isFavorite, updatedAt: new Date() } : img)
      );
      if (currentFilters.isFavorite !== undefined) {
         loadImages(); // Reload if "Show Only Favorites" is active/inactive
      }
    } catch (error) {
      toast({ title: "Error", description: "No se pudo actualizar el estado de favorito.", variant: "destructive" });
      loadImages(); // Reload all on error to ensure consistency
    }
  };

  const handleDeleteImage = async (id: string) => {
    try {
      await deleteGeneratedImage(id);
      toast({ title: "Imagen Eliminada", description: "La imagen ha sido eliminada del historial." });
      loadImages(); // Reload all images
    } catch (error) {
      toast({ title: "Error", description: "No se pudo eliminar la imagen.", variant: "destructive" });
    }
  };

  const handleUpdateTags = async (id: string, newTags: string[]) => {
    try {
      await updateGeneratedImage(id, { tags: newTags });
      // Optimistic update
      setImages(prevImages =>
        prevImages.map(img => img.id === id ? { ...img, tags: newTags, updatedAt: new Date() } : img)
      );
    } catch (error) {
      toast({ title: "Error", description: "No se pudieron actualizar las etiquetas manuales.", variant: "destructive" });
      loadImages(); // Reload all on error
    }
  };

  // Updated to handle both collections and suggestedPrompt
  const handleImageMetaUpdated = (id: string, updates: { collections?: string[], suggestedPrompt?: string }) => {
    console.log(`[HomePage] handleImageMetaUpdated called for imageId: ${id} with updates:`, updates);
    // Optimistic update for UI responsiveness
    setImages(prevImages =>
      prevImages.map(img =>
        img.id === id ? { ...img, ...updates, updatedAt: new Date() } : img
      )
    );
    // The actual DB update is handled client-side within ImageCard after suggestTagsAction
  };

  const handleFilterChange = (filters: { searchTerm?: string; isFavorite?: true | undefined }) => {
    setCurrentFilters(filters);
    // loadImages will be triggered by useEffect dependency on currentFilters
  };

  const openClearHistoryDialog = () => {
    setIsClearHistoryDialogOpen(true);
  };

  const handleClearHistory = async () => {
    try {
      await clearAllImages();
      toast({ title: "Historial Eliminado", description: "Todas las imágenes han sido eliminadas." });
      setImages([]); // Clear images locally
    } catch (error) {
      toast({ title: "Error", description: "No se pudo eliminar el historial.", variant: "destructive" });
    } finally {
      setIsClearHistoryDialogOpen(false);
    }
  };

  const handleExportHistory = async () => {
    try {
      setIsLoading(true);
      toast({ title: "Exportando...", description: "Preparando el historial para la descarga." });
      const allImages = await getAllGeneratedImages();
      if (allImages.length === 0) {
        toast({ title: "Historial Vacío", description: "No hay imágenes para exportar." });
        setIsLoading(false);
        return;
      }

      const exportedImages: ExportedGeneratedImage[] = await Promise.all(
        allImages.map(async (img) => ({
          ...img,
          imageData: await blobToDataURI(img.imageData), // Convert Blob to Data URI
          createdAt: img.createdAt.toISOString(),
          updatedAt: img.updatedAt.toISOString(),
          suggestedPrompt: img.suggestedPrompt || undefined,
          width: img.width,
          height: img.height,
        }))
      );

      const jsonString = JSON.stringify(exportedImages, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `imagina_ai_hr_historial_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: "Historial Exportado", description: "El archivo JSON ha sido descargado." });
    } catch (error) {
      console.error("Error exporting history:", error);
      toast({ title: "Error de Exportación", description: "No se pudo exportar el historial.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportHistory = () => {
    fileInputRef.current?.click(); // Trigger hidden file input
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsLoading(true);
      toast({ title: "Importando...", description: "Procesando el archivo de historial." });
      const fileContent = await file.text();
      const importedData: any[] = JSON.parse(fileContent); // Parse as any initially for validation

      if (!Array.isArray(importedData)) {
        throw new Error("El archivo de importación no tiene el formato esperado (debe ser un array).");
      }

      let importedCount = 0;
      let skippedCount = 0;

      for (const item of importedData) {
        // Basic validation for core fields
        if (typeof item.id !== 'string' || typeof item.prompt !== 'string' || typeof item.imageData !== 'string') {
            console.warn("Skipping invalid item during import:", item);
            skippedCount++;
            continue;
        }
        try {
            const imageBlob = await dataURIToBlob(item.imageData); // Convert Data URI back to Blob
            const newImage: GeneratedImage = {
              id: item.id,
              prompt: item.prompt,
              imageData: imageBlob,
              tags: Array.isArray(item.tags) ? item.tags : [],
              collections: Array.isArray(item.collections) ? item.collections : [],
              suggestedPrompt: typeof item.suggestedPrompt === 'string' ? item.suggestedPrompt : undefined,
              modelUsed: typeof item.modelUsed === 'string' ? item.modelUsed : 'Desconocido',
              isFavorite: typeof item.isFavorite === 'boolean' ? item.isFavorite : false,
              createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
              updatedAt: item.updatedAt ? new Date(item.updatedAt) : new Date(),
              artisticStyle: typeof item.artisticStyle === 'string' ? item.artisticStyle : 'none',
              aspectRatio: typeof item.aspectRatio === 'string' ? item.aspectRatio : '1:1',
              imageQuality: typeof item.imageQuality === 'string' ? item.imageQuality : 'standard',
              width: typeof item.width === 'number' ? item.width : undefined,
              height: typeof item.height === 'number' ? item.height : undefined,
            };
            await addGeneratedImage(newImage);
            importedCount++;
        } catch (addError: any) {
             // Check for Dexie's ConstraintError for duplicate IDs
             if (addError?.name === 'ConstraintError') {
                console.warn(`Image with ID ${item.id} already exists. Skipping.`);
                skippedCount++;
            } else {
                console.error(`Error adding imported image ${item.id}:`, addError);
                skippedCount++; // Count other errors as skipped too
            }
        }
      }

      loadImages(); // Reload all images to reflect imported ones
      toast({
        title: "Importación Completada",
        description: `${importedCount} imágenes importadas. ${skippedCount > 0 ? `${skippedCount} omitidas (duplicadas o error).` : ''}`
      });

    } catch (error) {
      console.error("Error importing history:", error);
      const message = error instanceof Error ? error.message : "No se pudo importar el historial.";
      toast({ title: "Error de Importación", description: message, variant: "destructive" });
    } finally {
      setIsLoading(false);
      // Reset file input to allow importing the same file again if needed
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const openStatisticsDialog = () => {
    setIsStatisticsDialogOpen(true);
  };

  const handleImageResized = async (id: string, newBlob: Blob, width: number, height: number) => {
    try {
      await updateGeneratedImage(id, { imageData: newBlob, width, height });
      toast({ title: "Imagen Actualizada", description: "La imagen ha sido redimensionada y guardada." });
      // Efficiently update the specific image in the local state
      setImages(prevImages =>
        prevImages.map(img =>
          img.id === id ? { ...img, imageData: newBlob, width, height, updatedAt: new Date() } : img
        )
      );
       // If you want to ensure all filters/sorts are re-applied after resize, uncomment:
       // loadImages();
    } catch (error) {
      console.error("Error updating resized image in DB:", error);
      toast({ title: "Error al Guardar", description: "No se pudo guardar la imagen redimensionada.", variant: "destructive" });
      loadImages(); // Full reload on error to ensure consistency
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader
        onClearHistory={openClearHistoryDialog}
        onExportHistory={handleExportHistory}
        onImportHistory={handleImportHistory}
        onShowStatistics={openStatisticsDialog}
      />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <GenerationForm onImageGenerated={handleImageGenerated} />
          </div>
          <div className="lg:col-span-2 space-y-6">
            <FilterControls onFilterChange={handleFilterChange} />
            <div>
              <h2 className="text-2xl font-semibold text-foreground">
                Historial de Imágenes {isLoading ? '(Cargando...)' : `(${images.length})`}
              </h2>
              <ImageGrid
                images={images}
                onToggleFavorite={handleToggleFavorite}
                onDeleteImage={handleDeleteImage}
                onUpdateTags={handleUpdateTags}
                onImageMetaUpdated={handleImageMetaUpdated}
                onImageGenerated={handleImageGenerated} 
                onImageResized={handleImageResized} 
                isLoading={isLoading}
              />
            </div>
          </div>
        </div>
      </main>
      <footer className="text-center py-4 border-t text-sm text-muted-foreground">
        Imagina AI HR &copy; {new Date().getFullYear()}
      </footer>

      {/* Clear History Dialog */}
      <AlertDialog open={isClearHistoryDialogOpen} onOpenChange={setIsClearHistoryDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar Todo el Historial?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción es irreversible y eliminará todas las imágenes generadas.
              ¿Estás seguro de que quieres continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearHistory} className="bg-destructive hover:bg-destructive/90">
              Sí, Eliminar Todo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Statistics Dialog */}
      <StatisticsDialog
        open={isStatisticsDialogOpen}
        onOpenChange={setIsStatisticsDialogOpen}
        images={images}
      />

      {/* Hidden File Input for Import */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".json"
        style={{ display: 'none' }}
        onChange={handleFileImport}
      />
    </div>
  );

    