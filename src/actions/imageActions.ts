
"use server";

import { suggestTags as suggestTagsFlow, type SuggestTagsInput } from "@/ai/flows/suggest-tags-flow";
import { z } from "zod";
import { v4 as uuidv4 } from 'uuid';


const GenerateImageInputSchema = z.object({
  prompt: z.string().min(1, "El prompt es requerido."),
  artisticStyle: z.string().optional(),
  // Add other parameters as needed
});

// This is a mock function. In a real scenario, this would call a Genkit flow 
// that uses an image generation model (e.g., Gemini, DALL-E, Stable Diffusion via Genkit).
// For now, it returns a placeholder image URL.
async function generateImageWithAI(prompt: string, artisticStyle?: string) {
  console.log(`Generating image with prompt: "${prompt}", style: "${artisticStyle || 'default'}"`);
  // Simulate AI generation delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // For demonstration, return a placeholder image.
  // A real Genkit flow would return image data (e.g., base64 data URI or a URL to the generated image).
  const width = 512;
  const height = 512;
  return `https://placehold.co/${width}x${height}.png`;
}

export async function generateImageAction(values: z.infer<typeof GenerateImageInputSchema>) {
  const validation = GenerateImageInputSchema.safeParse(values);
  if (!validation.success) {
    return { error: "Entrada inválida.", details: validation.error.flatten() };
  }

  const { prompt, artisticStyle } = validation.data;

  try {
    // In a real application, this would be the response from your Genkit image generation flow
    const imageUrlOrDataUri = await generateImageWithAI(prompt, artisticStyle);
    
    // The client will fetch this URL, convert to Blob, and store in IndexedDB.
    // If the AI flow returns a Data URI, the client can convert it directly.
    return { 
      success: true, 
      imageUrl: imageUrlOrDataUri, // Or dataUri: imageData
      id: uuidv4(), // Generate ID on server to ensure uniqueness if needed before client stores
      prompt: prompt,
      modelUsed: "Mock Model v1.0", // This would come from the actual model used
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error generating image:", error);
    return { error: "Error al generar la imagen." };
  }
}


const SuggestTagsServerInputSchema = z.object({
  prompt: z.string().min(1, "El prompt es requerido para sugerir etiquetas."),
});

export async function suggestTagsAction(values: z.infer<typeof SuggestTagsServerInputSchema>) {
  const validation = SuggestTagsServerInputSchema.safeParse(values);
  if (!validation.success) {
    return { error: "Entrada inválida.", details: validation.error.flatten() };
  }
  
  try {
    const genkitInput: SuggestTagsInput = { prompt: validation.data.prompt };
    const result = await suggestTagsFlow(genkitInput);
    return { success: true, tags: result.tags };
  } catch (error) {
    console.error("Error suggesting tags:", error);
    return { error: "Error al sugerir etiquetas." };
  }
}
