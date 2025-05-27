
"use client";

import React from 'react';
import type { GeneratedImage } from '@/lib/types';
import { ImageCard } from './ImageCard';
import { ImageIcon, AlertTriangle } from 'lucide-react';

interface ImageGridProps {
  images: GeneratedImage[];
  onToggleFavorite: (id: string) => void;
  onDeleteImage: (id: string) => void;
  onUpdateTags: (id: string, newTags: string[]) => void; // For manual tags
  onCollectionsUpdated: (id: string, newCollections: string[]) => void; // For AI collections
  isLoading?: boolean;
}

export function ImageGrid({ images, onToggleFavorite, onDeleteImage, onUpdateTags, onCollectionsUpdated, isLoading }: ImageGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-card rounded-lg shadow-md aspect-square animate-pulse"></div>
        ))}
      </div>
    );
  }
  
  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-12 bg-card rounded-lg shadow-md">
        <ImageIcon className="w-16 h-16 text-muted-foreground mb-4" />
        <h3 className="text-xl font-semibold text-foreground">No hay imágenes todavía</h3>
        <p className="text-muted-foreground">Comienza generando algunas imágenes para verlas aquí.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {images.map((image) => (
        <ImageCard 
          key={image.id} 
          image={image} 
          onToggleFavorite={onToggleFavorite}
          onDelete={onDeleteImage}
          onUpdateTags={onUpdateTags} // For manual tags
          onCollectionsUpdated={onCollectionsUpdated} // For AI collections
        />
      ))}
    </div>
  );
}
