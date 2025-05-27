
export interface GeneratedImage {
  id: string; // UUID
  imageData: Blob;
  prompt: string;
  tags: string[];
  collections?: string[]; // AI-suggested tags, called "colecciones"
  modelUsed: string;
  isFavorite: boolean; 
  createdAt: Date;
  updatedAt: Date;
  width?: number;
  height?: number;
  originalUrl?: string; 
  artisticStyle?: string;
  aspectRatio?: string; 
  imageQuality?: string; 
}

export interface ExportedGeneratedImage extends Omit<GeneratedImage, 'imageData' | 'createdAt' | 'updatedAt'> {
  imageData: string; // Base64 data URI
  createdAt: string; // ISO string date
  updatedAt: string; // ISO string date
}

// For future use with simulated login
export interface SimulatedUser {
  id: string;
  username: string;
  password?: string; 
  role: 'admin' | 'normal';
}

export interface AiModel {
  id: string;
  name: string;
  description?: string;
  isCustom: boolean;
  enabled: boolean;
  apiKey?: string; // Simulated
}
