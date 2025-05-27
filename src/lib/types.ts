
export interface GeneratedImage {
  id: string; // UUID
  imageData: Blob;
  prompt: string;
  tags: string[];
  collections?: string[]; // AI-suggested tags, called "colecciones"
  modelUsed: string;
  isFavorite: boolean; // Stored as 0 or 1 in IndexedDB for easier indexing if needed, but boolean here is fine.
  createdAt: Date;
  updatedAt: Date;
  width?: number;
  height?: number;
  originalUrl?: string; // If fetched from a URL before converting to Blob
  artisticStyle?: string;
  aspectRatio?: string; // e.g., "1:1", "16:9"
  imageQuality?: string; // e.g., "draft", "standard", "high"
}

// For future use with simulated login
export interface SimulatedUser {
  id: string;
  username: string;
  password?: string; // In a real app, never store plain passwords
  role: 'admin' | 'normal';
}

export interface AiModel {
  id: string;
  name: string;
  description?: string;
  isCustom: boolean;
  enabled: boolean;
  apiKey?: string; // Simulated
  // Add other model-specific properties if needed
}
