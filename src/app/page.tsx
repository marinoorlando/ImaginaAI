
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { GenerationForm } from '@/components/GenerationForm';
import { ImageGrid } from '@/components/ImageGrid';
import { FilterControls } from '@/components/FilterControls';
import { PaginationControls } from '@/components/PaginationControls'; // Import PaginationControls
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

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [totalImagesCount, setTotalImagesCount] = useState(0);

  const loadImages = useCallback(async (filters: { searchTerm?: string; isFavorite?: true | undefined } = currentFilters, page = currentPage, limit = itemsPerPage) => {
    setIsLoading(true);
    try {
      const { images: fetchedImages, totalCount } = await filterImages({ ...filters, page, limit });
      setImages(fetchedImages);
      setTotalImagesCount(totalCount);
    } catch (error) {
      console.error("Error loading images:", error);
      toast({ title: "Error", description: "No se pudieron cargar las imágenes.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast, currentPage, itemsPerPage]); // Removed currentFilters from here, will be handled by useEffect

  useEffect(() => {
    loadImages(currentFilters, currentPage, itemsPerPage);
  }, [loadImages, currentFilters, currentPage, itemsPerPage]);

  const handleImageGenerated = async (newImage: GeneratedImage) => {
    try {
      await addGeneratedImage(newImage);
      // Reset to first page to show the new image, assuming default sort is newest first
      // Or simply reload current page and filters, new image might not be on current page depending on sort
      if (currentPage !== 1) setCurrentPage(1); // Go to first page to see the latest
      else loadImages(currentFilters, 1, itemsPerPage); // Reload first page if already there
      toast({ title: "Imagen Guardada", description: "La nueva imagen se ha guardado en el historial." });
    } catch (error) {
      console.error("Error saving new image:", error);
      toast({ title: "Error", description: "No se pudo guardar la nueva imagen.", variant: "destructive" });
    }
  };

  const handleToggleFavorite = async (id: string) => {
    try {
      await toggleFavoriteStatus(id);
      // Optimistically update UI
      setImages(prevImages =>
        prevImages.map(img => img.id === id ? { ...img, isFavorite: !img.isFavorite, updatedAt: new Date() } : img)
      );
      // If "Show Only Favorites" is active/inactive, a full reload might be needed to reflect counts correctly
      if (currentFilters.isFavorite !== undefined) {
         loadImages(currentFilters, currentPage, itemsPerPage); 
      }
    } catch (error) {
      toast({ title: "Error", description: "No se pudo actualizar el estado de favorito.", variant: "destructive" });
      loadImages(currentFilters, currentPage, itemsPerPage); // Reload on error
    }
  };

  const handleDeleteImage = async (id: string) => {
    try {
      await deleteGeneratedImage(id);
      toast({ title: "Imagen Eliminada", description: "La imagen ha sido eliminada del historial." });
      // After delete, we might be on an empty page or a page that no longer exists
      // A common strategy is to reload the current page, or go to prev page if current is now empty
      // For simplicity, just reload. A more advanced logic could check if current page becomes empty.
      loadImages(currentFilters, currentPage, itemsPerPage);
    } catch (error) {
      toast({ title: "Error", description: "No se pudo eliminar la imagen.", variant: "destructive" });
    }
  };

  const handleUpdateTags = async (id: string, newTags: string[]) => {
    try {
      await updateGeneratedImage(id, { tags: newTags });
      setImages(prevImages =>
        prevImages.map(img => img.id === id ? { ...img, tags: newTags, updatedAt: new Date() } : img)
      );
    } catch (error) {
      toast({ title: "Error", description: "No se pudieron actualizar las etiquetas manuales.", variant: "destructive" });
      loadImages(currentFilters, currentPage, itemsPerPage);
    }
  };

  const handleImageMetaUpdated = (id: string, updates: { collections?: string[], suggestedPrompt?: string }) => {
    setImages(prevImages =>
      prevImages.map(img =>
        img.id === id ? { ...img, ...updates, updatedAt: new Date() } : img
      )
    );
  };

  const handleFilterChange = (filters: { searchTerm?: string; isFavorite?: true | undefined }) => {
    setCurrentFilters(filters);
    setCurrentPage(1); // Reset to first page on filter change
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page
  };


  const openClearHistoryDialog = () => {
    setIsClearHistoryDialogOpen(true);
  };

  const handleClearHistory = async () => {
    try {
      await clearAllImages();
      toast({ title: "Historial Eliminado", description: "Todas las imágenes han sido eliminadas." });
      setImages([]); 
      setTotalImagesCount(0);
      setCurrentPage(1);
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
      const allImagesToExport = await getAllGeneratedImages(); // Fetches all, not paginated
      if (allImagesToExport.length === 0) {
        toast({ title: "Historial Vacío", description: "No hay imágenes para exportar." });
        setIsLoading(false);
        return;
      }

      const exportedImages: ExportedGeneratedImage[] = await Promise.all(
        allImagesToExport.map(async (img) => ({
          ...img,
          imageData: await blobToDataURI(img.imageData), 
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
    fileInputRef.current?.click(); 
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsLoading(true);
      toast({ title: "Importando...", description: "Procesando el archivo de historial." });
      const fileContent = await file.text();
      const importedData: any[] = JSON.parse(fileContent); 

      if (!Array.isArray(importedData)) {
        throw new Error("El archivo de importación no tiene el formato esperado (debe ser un array).");
      }

      let importedCount = 0;
      let skippedCount = 0;

      for (const item of importedData) {
        if (typeof item.id !== 'string' || typeof item.prompt !== 'string' || typeof item.imageData !== 'string') {
            console.warn("Skipping invalid item during import:", item);
            skippedCount++;
            continue;
        }
        try {
            const imageBlob = await dataURIToBlob(item.imageData); 
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
             if (addError?.name === 'ConstraintError') {
                console.warn(`Image with ID ${item.id} already exists. Skipping.`);
                skippedCount++;
            } else {
                console.error(`Error adding imported image ${item.id}:`, addError);
                skippedCount++; 
            }
        }
      }

      setCurrentPage(1); // Go to first page after import
      loadImages(currentFilters, 1, itemsPerPage);
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
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const openStatisticsDialog = () => {
    // To get stats for ALL images, not just current page, we fetch them all here
    // This could be slow if there are thousands of images.
    // For now, let's pass the currently loaded (paginated) images for performance.
    // If stats for all images are critical, this needs a separate fetch.
    setIsStatisticsDialogOpen(true);
  };

  const handleImageResized = async (id: string, newBlob: Blob, width: number, height: number) => {
    try {
      await updateGeneratedImage(id, { imageData: newBlob, width, height });
      toast({ title: "Imagen Actualizada", description: "La imagen ha sido redimensionada y guardada." });
      setImages(prevImages =>
        prevImages.map(img =>
          img.id === id ? { ...img, imageData: newBlob, width, height, updatedAt: new Date() } : img
        )
      );
    } catch (error) {
      console.error("Error updating resized image in DB:", error);
      toast({ title: "Error al Guardar", description: "No se pudo guardar la imagen redimensionada.", variant: "destructive" });
      loadImages(currentFilters, currentPage, itemsPerPage);
    }
  };

  const totalPages = Math.ceil(totalImagesCount / itemsPerPage);

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
              <h2 className="text-2xl font-semibold text-foreground mb-1">
                Historial de Imágenes
              </h2>
               <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                itemsPerPage={itemsPerPage}
                onItemsPerPageChange={handleItemsPerPageChange}
                totalItems={totalImagesCount}
                isLoading={isLoading}
              />
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
              {totalImagesCount > itemsPerPage && ( // Show pagination at bottom only if multiple pages
                 <div className="mt-6">
                    <PaginationControls
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={handlePageChange}
                        itemsPerPage={itemsPerPage}
                        onItemsPerPageChange={handleItemsPerPageChange}
                        totalItems={totalImagesCount}
                        isLoading={isLoading}
                    />
                 </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <footer className="text-center py-4 border-t text-sm text-muted-foreground">
        Imagina AI HR &copy; {new Date().getFullYear()}
      </footer>

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

      <StatisticsDialog
        open={isStatisticsDialogOpen}
        onOpenChange={setIsStatisticsDialogOpen}
        images={images} // Passes currently loaded (paginated) images
      />

      <input
        type="file"
        ref={fileInputRef}
        accept=".json"
        style={{ display: 'none' }}
        onChange={handleFileImport}
      />
    </div>
  );
}
