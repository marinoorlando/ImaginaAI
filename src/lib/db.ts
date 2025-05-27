
import Dexie, { type Table } from 'dexie';
import type { GeneratedImage } from './types';

export class ImaginaAiDexie extends Dexie {
  generatedImages!: Table<GeneratedImage, string>; // string is the type of the primary key (id)

  constructor() {
    super('ImaginaAI_HR_DB');
    this.version(3).stores({ // Incremented version to 3
      generatedImages: 'id, prompt, *tags, *collections, modelUsed, isFavorite, createdAt, updatedAt',
      // Added *collections for AI-suggested tags
    });
    // Dexie handles upgrading from previous versions.
    // Old entries won't have 'collections', it will be undefined.
  }
}

export const db = new ImaginaAiDexie();

// CRUD operations

export async function addGeneratedImage(image: GeneratedImage): Promise<string> {
  try {
    const imageToAdd: GeneratedImage = {
      ...image,
      tags: image.tags || [],
      collections: image.collections || [], // Ensure collections is initialized
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
  } catch (error) {
    console.error(`Failed to get image with id ${id}:`, error);
    return undefined;
  }
}

export async function updateGeneratedImage(id: string, changes: Partial<Omit<GeneratedImage, 'id' | 'imageData'>>): Promise<number> {
  try {
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
  tags, // This refers to manual tags for filtering
  isFavorite,
}: {
  searchTerm?: string;
  tags?: string[]; // Manual tags
  isFavorite?: true | undefined; // Changed boolean to true | undefined
}): Promise<GeneratedImage[]> {
  try {
    let collection = db.generatedImages.orderBy('createdAt').reverse();

    if (isFavorite !== undefined) { // Check if isFavorite is explicitly true or false
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
    
    // This filter is for manual tags. If filtering by collections is needed, it should be a separate param.
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
