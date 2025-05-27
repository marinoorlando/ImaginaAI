
"use server";

import { suggestTags as suggestTagsFlow, type SuggestTagsInput } from "@/ai/flows/suggest-tags-flow";
import { generateImage as generateImageWithGenkitFlow, type GenerateImageInput as GenkitImageInput } from "@/ai/flows/generate-image-flow";
import { z } from "zod";
import { v4 as uuidv4 } from 'uuid';
// No direct DB updates from server actions for IndexedDB for image data

const GenerateImageServerInputSchema = z.object({
  prompt: z.string().min(1, "El prompt es requerido."),
  artisticStyle: z.string().optional(),
});

export async function generateImageAction(values: z.infer<typeof GenerateImageServerInputSchema>) {
  console.log("[generateImageAction] Received values:", values);
  const validation = GenerateImageServerInputSchema.safeParse(values);
  if (!validation.success) {
    return { error: "Entrada inválida.", details: validation.error.flatten() };
  }

  const { prompt, artisticStyle } = validation.data;
  let suggestedCollections: string[] = [];

  try {
    console.log("[generateImageAction] Calling generateImageWithGenkitFlow with prompt:", prompt, "and style:", artisticStyle);
    const genkitResult = await generateImageWithGenkitFlow({ prompt, artisticStyle });
    console.log("[generateImageAction] Result from generateImageWithGenkitFlow:", genkitResult);

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
    }
    
    return { 
      success: true, 
      imageDataUri: genkitResult.imageDataUri,
      id: uuidv4(),
      prompt: prompt,
      artisticStyle: artisticStyle || 'none', // Ensure artisticStyle is returned
      collections: suggestedCollections,
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
  prompt: z.string().min(1, "El prompt es requerido para sugerir etiquetas."),
});

export async function suggestTagsAction(values: z.infer<typeof SuggestTagsServerInputSchema>) {
  const validation = SuggestTagsServerInputSchema.safeParse(values);
  if (!validation.success) {
    console.error("[suggestTagsAction] Input validation failed:", validation.error.flatten());
    return { error: "Entrada inválida.", details: validation.error.flatten(), suggestedCollections: [] };
  }
  
  const { prompt: imagePrompt } = validation.data;
  console.log("[suggestTagsAction] Received values for AI suggestion:", values);

  try {
    const genkitInput: SuggestTagsInput = { prompt: imagePrompt };
    console.log("[suggestTagsAction] Calling suggestTagsFlow with input:", genkitInput);
    const result = await suggestTagsFlow(genkitInput); 
    console.log("[suggestTagsAction] Result from suggestTagsFlow:", result);

    const collectionsToSuggest = result.tags || [];
    console.log(`[suggestTagsAction] Collections suggested by AI for prompt "${imagePrompt}":`, collectionsToSuggest);
        
    // DB update will be handled by the client to avoid IndexedDB API missing error on server
    return { success: true, suggestedCollections: collectionsToSuggest };

  } catch (error) { 
    console.error("[suggestTagsAction] Catch block error in suggestTagsFlow execution:", error);
    const errorMessage = error instanceof Error ? error.message : "Error al sugerir colecciones con IA.";
    return { error: errorMessage, suggestedCollections: [] };
  }
}
// Removed regenerateExistingImageAction as it's replaced by using generateImageAction
// for creating a new image from an existing one's parameters.
