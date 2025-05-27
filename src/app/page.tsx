
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { GenerationForm } from '@/components/GenerationForm';
import { ImageGrid } from '@/components/ImageGrid';
import { FilterControls } from '@/components/FilterControls';
import type { GeneratedImage } from '@/lib/types';
import { db, addGeneratedImage, getAllGeneratedImages, toggleFavoriteStatus, deleteGeneratedImage, updateGeneratedImage, filterImages, clearAllImages } from '@/lib/db';
import { useToast } from "@/hooks/use-toast";
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

export default function HomePage() {
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const [currentFilters, setCurrentFilters] = useState<{ searchTerm?: string; isFavorite?: true | undefined }>({});
  const [isClearHistoryDialogOpen, setIsClearHistoryDialogOpen] = useState(false);

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
  }, [toast, currentFilters]); 

  useEffect(() => {
    // Load images with initial (empty) filters, which means isFavorite will be undefined
    loadImages(currentFilters);
  }, [loadImages]); // loadImages depends on currentFilters, so this is fine

  const handleImageGenerated = async (newImage: GeneratedImage) => {
    try {
      await addGeneratedImage(newImage);
      loadImages(); // Reload images with current filters
    } catch (error) {
      toast({ title: "Error", description: "No se pudo guardar la imagen.", variant: "destructive" });
    }
  };

  const handleToggleFavorite = async (id: string) => {
    try {
      await toggleFavoriteStatus(id);
      // Optimistic update or reload:
      setImages(prevImages => 
        prevImages.map(img => img.id === id ? { ...img, isFavorite: !img.isFavorite, updatedAt: new Date() } : img)
      );
      // If current filter is active (e.g., "show only favorites"), reloading might be better
      // to ensure the list correctly reflects the change based on the filter.
      if (currentFilters.isFavorite !== undefined) {
         loadImages();
      }
    } catch (error) {
      toast({ title: "Error", description: "No se pudo actualizar el estado de favorito.", variant: "destructive" });
    }
  };

  const handleDeleteImage = async (id: string) => {
    try {
      await deleteGeneratedImage(id);
      toast({ title: "Imagen Eliminada", description: "La imagen ha sido eliminada del historial." });
      loadImages();
    } catch (error) {
      toast({ title: "Error", description: "No se pudo eliminar la imagen.", variant: "destructive" });
    }
  };
  
  const handleUpdateTags = async (id: string, newTags: string[]) => {
    try {
      await updateGeneratedImage(id, { tags: newTags });
      // Optimistic update or reload:
      setImages(prevImages => 
        prevImages.map(img => img.id === id ? { ...img, tags: newTags, updatedAt: new Date() } : img)
      );
      // loadImages(); // Consider if a reload is needed if tags affect current filtering
    } catch (error) {
      toast({ title: "Error", description: "No se pudieron actualizar las etiquetas.", variant: "destructive" });
    }
  };

  const handleFilterChange = (filters: { searchTerm?: string; isFavorite?: true | undefined }) => {
    setCurrentFilters(filters);
    loadImages(filters);
  };

  const openClearHistoryDialog = () => {
    setIsClearHistoryDialogOpen(true);
  };

  const handleClearHistory = async () => {
    try {
      await clearAllImages();
      toast({ title: "Historial Eliminado", description: "Todas las imágenes han sido eliminadas." });
      setImages([]); // Clear images in state immediately
    } catch (error) {
      toast({ title: "Error", description: "No se pudo eliminar el historial.", variant: "destructive" });
    } finally {
      setIsClearHistoryDialogOpen(false);
    }
  };


  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader onClearHistory={openClearHistoryDialog} />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <GenerationForm onImageGenerated={handleImageGenerated} />
            <FilterControls onFilterChange={handleFilterChange} />
          </div>
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-semibold mb-6 text-foreground">Historial de Imágenes</h2>
            <ImageGrid 
              images={images} 
              onToggleFavorite={handleToggleFavorite}
              onDeleteImage={handleDeleteImage}
              onUpdateTags={handleUpdateTags}
              isLoading={isLoading}
            />
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
    </div>
  );
}
