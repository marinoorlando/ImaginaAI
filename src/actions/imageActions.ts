
"use server";

import { suggestTags as suggestTagsFlow, type SuggestTagsInput } from "@/ai/flows/suggest-tags-flow";
import { generateImage as generateImageWithGenkitFlow, type GenerateImageInput as GenkitImageInput } from "@/ai/flows/generate-image-flow";
import { z } from "zod";
import { v4 as uuidv4 } from 'uuid';
import { updateGeneratedImage } from "@/lib/db"; // Import updateGeneratedImage


const GenerateImageServerInputSchema = z.object({
  prompt: z.string().min(1, "El prompt es requerido."),
  artisticStyle: z.string().optional(),
});


export async function generateImageAction(values: z.infer<typeof GenerateImageServerInputSchema>) {
  const validation = GenerateImageServerInputSchema.safeParse(values);
  if (!validation.success) {
    return { error: "Entrada inválida.", details: validation.error.flatten() };
  }

  const { prompt } = validation.data;

  try {
    const genkitInput: GenkitImageInput = { prompt };
    const genkitResult = await generateImageWithGenkitFlow(genkitInput);
    
    return { 
      success: true, 
      imageDataUri: genkitResult.imageDataUri,
      id: uuidv4(),
      prompt: prompt,
      collections: [], // Initialize collections as empty array
      modelUsed: genkitResult.modelUsed,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error generating image with Genkit:", error);
    if (error instanceof Error && error.message.includes('SAFETY')) {
        return { error: "La generación de la imagen fue bloqueada por filtros de seguridad. Intenta con un prompt diferente." };
    }
    const errorMessage = error instanceof Error ? error.message : "Error al generar la imagen con IA.";
    return { error: errorMessage };
  }
}


const SuggestTagsServerInputSchema = z.object({
  imageId: z.string().min(1, "El ID de la imagen es requerido."),
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

    if (result.tags && result.tags.length > 0) {
      await updateGeneratedImage(validation.data.imageId, { collections: result.tags });
    }
    
    return { success: true, suggestedCollections: result.tags || [] };
  } catch (error) {
    console.error("Error suggesting tags/collections:", error);
    const errorMessage = error instanceof Error ? error.message : "Error al sugerir colecciones.";
    return { error: errorMessage };
  }
}
