
import Dexie, { type Table } from 'dexie';
import type { GeneratedImage } from './types';

export class ImaginaAiDexie extends Dexie {
  generatedImages!: Table<GeneratedImage, string>; // string is the type of the primary key (id)

  constructor() {
    super('ImaginaAI_HR_DB');
    this.version(8).stores({ // Version 8 for width and height
      generatedImages: 'id, prompt, *tags, *collections, suggestedPrompt, modelUsed, isFavorite, createdAt, updatedAt, artisticStyle, aspectRatio, imageQuality, width, height',
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
      suggestedPrompt: image.suggestedPrompt || undefined,
      artisticStyle: image.artisticStyle || 'none',
      aspectRatio: image.aspectRatio || '1:1',
      imageQuality: image.imageQuality || 'standard',
      createdAt: image.createdAt || new Date(),
      updatedAt: image.updatedAt || new Date(),
      width: image.width,
      height: image.height,
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

// Modified to accept imageData for resizing
export async function updateGeneratedImage(id: string, changes: Partial<Omit<GeneratedImage, 'id'>>): Promise<number> {
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
  tags,
  isFavorite,
  page = 1,
  limit = 12,
}: {
  searchTerm?: string;
  tags?: string[];
  isFavorite?: true | undefined;
  page?: number;
  limit?: number;
}): Promise<{ images: GeneratedImage[]; totalCount: number }>{
  try {
    // Base query for filtering and ordering
    let baseQuery = db.generatedImages.orderBy('createdAt').reverse();

    // Apply filters
    if (isFavorite !== undefined) {
      baseQuery = baseQuery.filter(img => img.isFavorite === isFavorite);
    }

    if (searchTerm && searchTerm.trim() !== '') {
      const lowerSearchTerm = searchTerm.toLowerCase();
      baseQuery = baseQuery.filter(img =>
        img.prompt.toLowerCase().includes(lowerSearchTerm) ||
        (img.tags && img.tags.some(tag => tag.toLowerCase().includes(lowerSearchTerm))) ||
        (img.collections && img.collections.some(col => col.toLowerCase().includes(lowerSearchTerm)))
      );
    }

    if (tags && tags.length > 0) {
      baseQuery = baseQuery.filter(img =>
        tags.every(filterTag => img.tags && img.tags.includes(filterTag))
      );
    }

    // Get total count of filtered items
    const totalCount = await baseQuery.count();

    // Get paginated items
    const images = await baseQuery.offset((page - 1) * limit).limit(limit).toArray();

    return { images, totalCount };
  } catch (error) {
    console.error("Failed to filter images with pagination:", error);
    return { images: [], totalCount: 0 };
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
