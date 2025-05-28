
"use server";

import { suggestTags as suggestTagsFlow, type SuggestTagsInput } from "@/ai/flows/suggest-tags-flow";
import { generateImage as generateImageWithGenkitFlow, type GenerateImageInput as GenkitImageInput } from "@/ai/flows/generate-image-flow";
import { z } from "zod";
import { v4 as uuidv4 } from 'uuid';

const GenerateImageServerInputSchema = z.object({
  prompt: z.string().min(1, "El prompt es requerido."),
  artisticStyle: z.string().optional(),
  aspectRatio: z.string().optional(),
  imageQuality: z.string().optional(),
  initialTags: z.array(z.string()).optional(), 
});

export async function generateImageAction(values: z.infer<typeof GenerateImageServerInputSchema>) {
  console.log("[generateImageAction] Received values:", values);
  const validation = GenerateImageServerInputSchema.safeParse(values);
  if (!validation.success) {
    return { error: "Entrada inválida.", details: validation.error.flatten() };
  }

  const { prompt, artisticStyle, aspectRatio, imageQuality, initialTags } = validation.data;
  let suggestedCollections: string[] = [];
  let suggestedPromptByAI: string | undefined = undefined;

  try {
    console.log("[generateImageAction] Calling generateImageWithGenkitFlow with prompt:", prompt, "style:", artisticStyle, "aspectRatio:", aspectRatio, "imageQuality:", imageQuality);
    const genkitResult = await generateImageWithGenkitFlow({ 
      prompt, 
      artisticStyle,
      aspectRatio,
      imageQuality 
    });
    console.log("[generateImageAction] Result from generateImageWithGenkitFlow:", genkitResult);

    try {
      console.log("[generateImageAction] Calling suggestTagsFlow with prompt for auto-suggestion:", prompt);
      const suggestionsResult = await suggestTagsFlow({ prompt });
      console.log("[generateImageAction] Result from suggestTagsFlow (auto-suggestion):", suggestionsResult);
      if (suggestionsResult.tags && suggestionsResult.tags.length > 0) {
        suggestedCollections = suggestionsResult.tags;
        console.log("[generateImageAction] Auto-suggested collections:", suggestedCollections);
      } else {
        console.log("[generateImageAction] No collections auto-suggested by AI or tags array is empty.");
      }
      if (suggestionsResult.suggestedPrompt) {
        suggestedPromptByAI = suggestionsResult.suggestedPrompt;
        console.log("[generateImageAction] Auto-suggested prompt by AI:", suggestedPromptByAI);
      } else {
        console.log("[generateImageAction] No prompt auto-suggested by AI.");
      }
    } catch (tagsError) {
      console.error("[generateImageAction] Error auto-suggesting collections or prompt with Genkit, proceeding without them:", tagsError);
    }
    
    return { 
      success: true, 
      imageDataUri: genkitResult.imageDataUri,
      id: uuidv4(),
      prompt: prompt,
      artisticStyle: artisticStyle || 'none',
      aspectRatio: aspectRatio || '1:1',
      imageQuality: imageQuality || 'standard',
      tags: initialTags || [], 
      collections: suggestedCollections,
      suggestedPrompt: suggestedPromptByAI,
      modelUsed: genkitResult.modelUsed,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("[generateImageAction] Error generating image or suggesting tags/prompt with Genkit:", error);
    if (error instanceof Error && error.message.includes('SAFETY')) {
        return { error: "La generación de la imagen fue bloqueada por filtros de seguridad. Intenta con un prompt diferente." };
    }
    const errorMessage = error instanceof Error ? error.message : "Error al generar la imagen o sugerir colecciones/prompt con IA.";
    return { error: errorMessage };
  }
}

const SuggestTagsServerInputSchema = z.object({
  prompt: z.string().min(1, "El prompt es requerido para sugerir etiquetas."),
});

// This action now returns suggested collections AND a suggested prompt
export async function suggestTagsAction(values: z.infer<typeof SuggestTagsServerInputSchema>) {
  const validation = SuggestTagsServerInputSchema.safeParse(values);
  if (!validation.success) {
    console.error("[suggestTagsAction] Input validation failed:", validation.error.flatten());
    return { error: "Entrada inválida.", details: validation.error.flatten(), suggestedCollections: [], suggestedPrompt: undefined };
  }
  
  const { prompt: imagePrompt } = validation.data;
  console.log("[suggestTagsAction] Received values for AI suggestion:", values);

  try {
    const genkitInput: SuggestTagsInput = { prompt: imagePrompt };
    console.log("[suggestTagsAction] Calling suggestTagsFlow with input:", genkitInput);
    const result = await suggestTagsFlow(genkitInput); 
    console.log("[suggestTagsAction] Result from suggestTagsFlow:", result);

    const collectionsToSuggest = result.tags || [];
    const promptToSuggest = result.suggestedPrompt;

    console.log(`[suggestTagsAction] Collections suggested by AI for prompt "${imagePrompt}":`, collectionsToSuggest);
    console.log(`[suggestTagsAction] Prompt suggested by AI for prompt "${imagePrompt}":`, promptToSuggest);
        
    // DB update will be handled by the client to avoid IndexedDB API missing error on server
    return { success: true, suggestedCollections: collectionsToSuggest, suggestedPrompt: promptToSuggest };

  } catch (error) { 
    console.error("[suggestTagsAction] Catch block error in suggestTagsFlow execution:", error);
    const errorMessage = error instanceof Error ? error.message : "Error al sugerir colecciones/prompt con IA.";
    return { error: errorMessage, suggestedCollections: [], suggestedPrompt: undefined };
  }
}
