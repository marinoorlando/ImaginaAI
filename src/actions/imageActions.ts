
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
  let suggestedCollections: string[] = [];

  try {
    // 1. Generate the image
    console.log("[generateImageAction] Calling generateImageWithGenkitFlow with prompt:", prompt);
    const genkitResult = await generateImageWithGenkitFlow({ prompt });
    console.log("[generateImageAction] Result from generateImageWithGenkitFlow:", genkitResult);

    // 2. Suggest collections (tags) for the generated image automatically
    try {
      console.log("[generateImageAction] Calling suggestTagsFlow with prompt for auto-suggestion:", prompt);
      const tagsResult = await suggestTagsFlow({ prompt });
      console.log("[generateImageAction] Result from suggestTagsFlow (auto-suggestion):", tagsResult);
      if (tagsResult.tags && tagsResult.tags.length > 0) {
        suggestedCollections = tagsResult.tags;
        console.log("[generateImageAction] Auto-suggested collections:", suggestedCollections);
      } else {
        console.log("[generateImageAction] No collections auto-suggested by AI or tags array is empty.");
      }
    } catch (tagsError) {
      console.error("[generateImageAction] Error auto-suggesting collections with Genkit, proceeding without them:", tagsError);
      // Continue without AI collections if suggestion fails, image is already generated
    }
    
    return { 
      success: true, 
      imageDataUri: genkitResult.imageDataUri,
      id: uuidv4(),
      prompt: prompt,
      collections: suggestedCollections, // Include auto-suggested collections
      modelUsed: genkitResult.modelUsed,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("[generateImageAction] Error generating image or suggesting tags with Genkit:", error);
    if (error instanceof Error && error.message.includes('SAFETY')) {
        return { error: "La generación de la imagen fue bloqueada por filtros de seguridad. Intenta con un prompt diferente." };
    }
    const errorMessage = error instanceof Error ? error.message : "Error al generar la imagen o sugerir colecciones con IA.";
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
  
  const { imageId, prompt: imagePrompt } = validation.data;
  console.log("[suggestTagsAction] Received values:", values);

  try {
    const genkitInput: SuggestTagsInput = { prompt: imagePrompt };
    console.log("[suggestTagsAction] Calling suggestTagsFlow with input:", genkitInput);
    const result = await suggestTagsFlow(genkitInput); 
    console.log("[suggestTagsAction] Result from suggestTagsFlow:", result);

    // `result.tags` will be an array, possibly empty, if suggestTagsFlow is successful
    // If suggestTagsFlow throws an error, this part won't be reached.
    const collectionsToUpdate = result.tags || []; // Ensure it's always an array

    console.log(`[suggestTagsAction] Collections from AI for imageId ${imageId}:`, collectionsToUpdate);
    
    try {
      console.log(`[suggestTagsAction] Attempting to update DB for imageId: ${imageId} with collections:`, collectionsToUpdate);
      await updateGeneratedImage(imageId, { collections: collectionsToUpdate });
      console.log(`[suggestTagsAction] Successfully updated DB for imageId: ${imageId}`);
      return { success: true, suggestedCollections: collectionsToUpdate };
    } catch (dbError) {
      console.error(`[suggestTagsAction] Error updating DB for imageId: ${imageId}`, dbError);
      const dbErrorMessage = dbError instanceof Error ? dbError.message : "Error al guardar las colecciones en la base de datos.";
      return { error: `Error de base de datos: ${dbErrorMessage}`, suggestedCollections: [] }; // Return empty if DB fails
    }

  } catch (error) { // Catch errors from suggestTagsFlow (AI suggestion part)
    console.error("[suggestTagsAction] Error in suggestTagsFlow execution:", error);
    const errorMessage = error instanceof Error ? error.message : "Error al sugerir colecciones con IA.";
    return { error: errorMessage, suggestedCollections: [] };
  }
}

