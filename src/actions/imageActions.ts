
"use server";

import { suggestTags as suggestTagsFlow, type SuggestTagsInput } from "@/ai/flows/suggest-tags-flow";
import { generateImage as generateImageWithGenkitFlow, type GenerateImageInput as GenkitImageInput } from "@/ai/flows/generate-image-flow";
import { z } from "zod";
import { v4 as uuidv4 } from 'uuid';
import { getGeneratedImageById } from "@/lib/db"; // No direct DB updates from server actions for IndexedDB

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
    console.error("[suggestTagsAction] Error in suggestTagsFlow execution:", error);
    const errorMessage = error instanceof Error ? error.message : "Error al sugerir colecciones con IA.";
    return { error: errorMessage, suggestedCollections: [] };
  }
}

const RegenerateImageServerInputSchema = z.object({
  imageId: z.string(),
});

export async function regenerateImageByIdAction(values: z.infer<typeof RegenerateImageServerInputSchema>) {
  const validation = RegenerateImageServerInputSchema.safeParse(values);
  if (!validation.success) {
    return { error: "Entrada inválida para regeneración.", details: validation.error.flatten() };
  }
  const { imageId } = validation.data;

  console.log(`[regenerateImageByIdAction] Attempting to regenerate image with ID: ${imageId}`);

  // Fetch existing image data (prompt, artisticStyle) - This requires getGeneratedImageById to be callable server-side
  // However, getGeneratedImageById uses Dexie which is client-side.
  // For regeneration, the client should pass the prompt and artisticStyle.
  // Let's adjust: client passes prompt and artisticStyle of the image to regenerate.
  // OR, better, the server action should not rely on DB for this if DB is client-side only.

  // Simplification: The client will provide the prompt and artisticStyle for the image it wants to regenerate.
  // The server action `generateImageAction` can be reused if we give it an optional ID to replace, but that's complex.
  // New approach: Server action takes imageId, fetches from DB on client, then client calls a modified generateImageAction.
  // No, that's not right. Server action *can't* fetch from client DB.

  // The ImageCard will need to have the prompt and artisticStyle of the image.
  // It will call a server action that does the generation and tag suggestion.
  // Let's modify `generateImageAction` to be more flexible or create a new one.
  // For now, let's assume `regenerateImageByIdAction` takes `prompt` and `artisticStyle` as input along with `imageId`.

  // Revised plan: `regenerateImageByIdAction` takes imageId.
  // It's the *client's* responsibility to call this with the correct prompt and artisticStyle.
  // This action just does the Genkit parts and returns the new data.
  // The current `regenerateImageByIdAction` is not needed with this client-side orchestration.
  // We need to ensure the client (ImageCard) has access to original prompt and artisticStyle.

  // Let's stick to: `regenerateImageByIdAction` takes `imageId`.
  // It will need to get prompt/style. This means `getGeneratedImageById` *must* run on server.
  // THIS IS THE CORE PROBLEM: IndexedDB is client-side.
  // So, the client MUST pass the prompt and artisticStyle to the regeneration action.

  // New `regenerateImageAction`
  const RegenerateActionSchema = z.object({
    originalImageId: z.string(),
    prompt: z.string(),
    artisticStyle: z.string().optional(),
  });

  // This function name is more generic and can be called by the client
  // when it has the necessary info (prompt, style) for an existing image.
  // The client will manage updating its own DB record.
  // This action is essentially the same as generateImageAction but might have different logging.
  // To avoid duplication, we can potentially make generateImageAction handle both,
  // or the client can just call generateImageAction with the old prompt/style.

  // For clarity, let's make `regenerateImageAction` distinct.
  // It's very similar to `generateImageAction` but signals intent.
  // It will *not* generate a new ID. It returns data for the client to update an *existing* ID.

  console.log(`[regenerateImageByIdAction] (Stub for now) - Image ID: ${imageId}. Client should provide prompt & style.`);
  // This action needs to be fully implemented if used.
  // For now, the client will call `generateImageAction` with the old image's prompt and style.
  // And then the client will update the existing image record.
  // So, no new server action might be needed *if* the client orchestrates it properly.

  // Let's create a new action for clarity, focused on regenerating.
  // The client will call this, providing the original ID, prompt, and style.
  // The action returns new image data, and client updates its DB.
}

const RegenerateInputSchema = z.object({
  prompt: z.string().min(1, "El prompt es requerido."),
  artisticStyle: z.string().optional(),
  originalImageId: z.string(), // To link back to the client-side record
});

export async function regenerateExistingImageAction(values: z.infer<typeof RegenerateInputSchema>) {
  console.log("[regenerateExistingImageAction] Received values:", values);
  const validation = RegenerateInputSchema.safeParse(values);
  if (!validation.success) {
    return { error: "Entrada inválida para regeneración.", details: validation.error.flatten() };
  }

  const { prompt, artisticStyle, originalImageId } = validation.data;
  let suggestedCollections: string[] = [];

  try {
    console.log("[regenerateExistingImageAction] Calling generateImageWithGenkitFlow for ID:", originalImageId, "with prompt:", prompt, "and style:", artisticStyle);
    const genkitResult = await generateImageWithGenkitFlow({ prompt, artisticStyle });
    console.log("[regenerateExistingImageAction] Result from generateImageWithGenkitFlow:", genkitResult);

    try {
      console.log("[regenerateExistingImageAction] Calling suggestTagsFlow for auto-suggestion:", prompt);
      const tagsResult = await suggestTagsFlow({ prompt });
      console.log("[regenerateExistingImageAction] Result from suggestTagsFlow (auto-suggestion):", tagsResult);
      if (tagsResult.tags && tagsResult.tags.length > 0) {
        suggestedCollections = tagsResult.tags;
      }
    } catch (tagsError) {
      console.error("[regenerateExistingImageAction] Error auto-suggesting collections:", tagsError);
    }
    
    return { 
      success: true, 
      originalImageId: originalImageId, // Pass back the original ID
      imageDataUri: genkitResult.imageDataUri,
      prompt: prompt, // Return the prompt used
      artisticStyle: artisticStyle || 'none', // Return the style used
      collections: suggestedCollections,
      modelUsed: genkitResult.modelUsed,
      updatedAt: new Date().toISOString(), // New update time
    };
  } catch (error) {
    console.error("[regenerateExistingImageAction] Error during regeneration:", error);
    if (error instanceof Error && error.message.includes('SAFETY')) {
        return { error: "La regeneración de la imagen fue bloqueada por filtros de seguridad. Intenta con un prompt diferente." };
    }
    const errorMessage = error instanceof Error ? error.message : "Error al regenerar la imagen.";
    return { error: errorMessage };
  }
}
