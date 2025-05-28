
"use client";

import React from 'react';
import type { GeneratedImage } from '@/lib/types';
import { ImageCard } from './ImageCard';
import { ImageIcon, AlertTriangle } from 'lucide-react'; // AlertTriangle might not be used, but good for error states

interface ImageGridProps {
  images: GeneratedImage[];
  onToggleFavorite: (id: string) => Promise<void>;
  onDeleteImage: (id: string) => void;
  onUpdateTags: (id: string, newTags: string[]) => Promise<void>;
  onImageMetaUpdated: (id: string, updates: { collections?: string[], suggestedPrompt?: string }) => void;
  onImageGenerated: (image: GeneratedImage) => void; // For regeneration creating a new image
  onImageResized: (id: string, newBlob: Blob, width: number, height: number) => Promise<void>; // For resizing
  isLoading?: boolean;
}

export function ImageGrid({ 
  images, 
  onToggleFavorite, 
  onDeleteImage, 
  onUpdateTags, 
  onImageMetaUpdated,
  onImageGenerated,
  onImageResized,
  isLoading 
}: ImageGridProps) {
  if (isLoading) {
    // Skeleton loader for when images are loading
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-card rounded-lg shadow-md aspect-square animate-pulse"></div>
        ))}
      </div>
    );
  }
  
  if (images.length === 0) {
    // Message for when no images are available
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
          onUpdateTags={onUpdateTags}
          onImageMetaUpdated={onImageMetaUpdated}
          onImageGenerated={onImageGenerated} 
          onImageResized={onImageResized} // Pass down the new prop
        />
      ))}
    </div>
  );
}
