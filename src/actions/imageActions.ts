
"use server";

import { suggestTags as suggestTagsFlow, type SuggestTagsInput } from "@/ai/flows/suggest-tags-flow";
import { generateImage as generateImageWithGenkitFlow, type GenerateImageInput as GenkitImageInput } from "@/ai/flows/generate-image-flow";
import { z } from "zod";
import { v4 as uuidv4 } from 'uuid';


const GenerateImageServerInputSchema = z.object({ // Renamed to avoid conflict if client-side schema differs
  prompt: z.string().min(1, "El prompt es requerido."),
  artisticStyle: z.string().optional(),
});


export async function generateImageAction(values: z.infer<typeof GenerateImageServerInputSchema>) {
  const validation = GenerateImageServerInputSchema.safeParse(values);
  if (!validation.success) {
    return { error: "Entrada inválida.", details: validation.error.flatten() };
  }

  const { prompt } = validation.data; // artisticStyle is not used by the current Genkit flow

  try {
    const genkitInput: GenkitImageInput = { prompt };
    const genkitResult = await generateImageWithGenkitFlow(genkitInput);
    
    return { 
      success: true, 
      imageDataUri: genkitResult.imageDataUri, // Return data URI
      id: uuidv4(),
      prompt: prompt,
      modelUsed: genkitResult.modelUsed,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error generating image with Genkit:", error);
    // Check if the error is a Genkit/Google AI specific error for more user-friendly messages
    if (error instanceof Error && error.message.includes('SAFETY')) {
        return { error: "La generación de la imagen fue bloqueada por filtros de seguridad. Intenta con un prompt diferente." };
    }
    return { error: "Error al generar la imagen con IA." };
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
