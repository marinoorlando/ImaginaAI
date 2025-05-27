
import Dexie, { type Table } from 'dexie';
import type { GeneratedImage } from './types';

export class ImaginaAiDexie extends Dexie {
  generatedImages!: Table<GeneratedImage, string>; // string is the type of the primary key (id)

  constructor() {
    super('ImaginaAI_HR_DB');
    this.version(5).stores({ // Incremented version to 5
      generatedImages: 'id, prompt, *tags, *collections, modelUsed, isFavorite, createdAt, updatedAt, artisticStyle, aspectRatio, imageQuality',
      // Added artisticStyle, aspectRatio, imageQuality
    });
  }
}

export const db = new ImaginaAiDexie();

// CRUD operations

export async function addGeneratedImage(image: GeneratedImage): Promise<string> {
  try {
    const imageToAdd: GeneratedImage = {
      ...image,
      tags: image.tags || [],
      collections: image.collections || [],
      artisticStyle: image.artisticStyle || 'none',
      aspectRatio: image.aspectRatio || '1:1',
      imageQuality: image.imageQuality || 'standard',
      createdAt: image.createdAt || new Date(),
      updatedAt: image.updatedAt || new Date(),
    };
    return await db.generatedImages.add(imageToAdd);
  } catch (error) {
    console.error("Failed to add image to IndexedDB:", error);
    throw error;
  }
}

export async function getAllGeneratedImages(sortBy: keyof GeneratedImage = 'createdAt', order: 'asc' | 'desc' = 'desc'): Promise<GeneratedImage[]> {
  try {
    let query = db.generatedImages.orderBy(sortBy);
    if (order === 'desc') {
      query = query.reverse();
    }
    return await query.toArray();
  } catch (error) {
    console.error("Failed to get all images from IndexedDB:", error);
    return [];
  }
}

export async function getGeneratedImageById(id: string): Promise<GeneratedImage | undefined> {
  try {
    return await db.generatedImages.get(id);
  } catch (error)
 {
    console.error(`Failed to get image with id ${id}:`, error);
    return undefined;
  }
}

export async function updateGeneratedImage(id: string, changes: Partial<Omit<GeneratedImage, 'id' | 'imageData'>>): Promise<number> {
  try {
    // Note: This function cannot update imageData directly due to the Omit type.
    // For imageData updates, use a direct Dexie update: db.generatedImages.update(id, { imageData: newBlob, ... })
    return await db.generatedImages.update(id, { ...changes, updatedAt: new Date() });
  } catch (error) {
    console.error(`Failed to update image with id ${id}:`, error);
    throw error;
  }
}

export async function deleteGeneratedImage(id: string): Promise<void> {
  try {
    await db.generatedImages.delete(id);
  } catch (error) {
    console.error(`Failed to delete image with id ${id}:`, error);
    throw error;
  }
}

export async function toggleFavoriteStatus(id: string): Promise<number> {
  const image = await getGeneratedImageById(id);
  if (image) {
    return updateGeneratedImage(id, { isFavorite: !image.isFavorite });
  }
  return 0;
}

export async function filterImages({
  searchTerm,
  tags,
  isFavorite,
}: {
  searchTerm?: string;
  tags?: string[];
  isFavorite?: true | undefined;
}): Promise<GeneratedImage[]> {
  try {
    let collection = db.generatedImages.orderBy('createdAt').reverse();

    if (isFavorite !== undefined) {
      collection = collection.filter(img => img.isFavorite === isFavorite);
    }

    if (searchTerm && searchTerm.trim() !== '') {
      const lowerSearchTerm = searchTerm.toLowerCase();
      collection = collection.filter(img => 
        img.prompt.toLowerCase().includes(lowerSearchTerm) ||
        img.tags.some(tag => tag.toLowerCase().includes(lowerSearchTerm)) ||
        (img.collections && img.collections.some(col => col.toLowerCase().includes(lowerSearchTerm)))
      );
    }
    
    if (tags && tags.length > 0) {
      collection = collection.filter(img => 
        tags.every(filterTag => img.tags.includes(filterTag))
      );
    }
    
    return await collection.toArray();
  } catch (error) {
    console.error("Failed to filter images:", error);
    return [];
  }
}

export async function clearAllImages(): Promise<void> {
  try {
    await db.generatedImages.clear();
  } catch (error) {
    console.error("Failed to clear all images from IndexedDB:", error);
    throw error;
  }
}
