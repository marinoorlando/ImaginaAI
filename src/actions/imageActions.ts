
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
    console.error("[suggestTagsAction] Input validation failed:", validation.error.flatten());
    return { error: "Entrada inválida.", details: validation.error.flatten() };
  }
  
  console.log("[suggestTagsAction] Received values:", values);

  try {
    const genkitInput: SuggestTagsInput = { prompt: validation.data.prompt };
    console.log("[suggestTagsAction] Calling suggestTagsFlow with input:", genkitInput);
    const result = await suggestTagsFlow(genkitInput); 
    console.log("[suggestTagsAction] Result from suggestTagsFlow:", result);

    if (result.tags && result.tags.length > 0) {
      console.log("[suggestTagsAction] Tags found, attempting to update DB. ImageId:", validation.data.imageId, "Collections:", result.tags);
      try {
        await updateGeneratedImage(validation.data.imageId, { collections: result.tags });
        console.log("[suggestTagsAction] Successfully updated DB for imageId:", validation.data.imageId);
      } catch (dbError) {
        console.error("[suggestTagsAction] Error updating DB for imageId:", validation.data.imageId, dbError);
        // Optionally, you might want to return an error here or just rely on the client-side update
      }
    } else {
      console.log("[suggestTagsAction] No tags returned from AI or tags array is empty.");
    }
    
    const suggestedCollections = result.tags || [];
    console.log("[suggestTagsAction] Returning success with suggestedCollections:", suggestedCollections);
    return { success: true, suggestedCollections: suggestedCollections };
  } catch (error) {
    console.error("[suggestTagsAction] Error in suggestTagsAction:", error);
    const errorMessage = error instanceof Error ? error.message : "Error al sugerir colecciones.";
    return { error: errorMessage };
  }
}
