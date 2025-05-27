
'use server';
/**
 * @fileOverview A Genkit flow for generating images using an AI model.
 *
 * - generateImage - A function that handles the image generation process.
 * - GenerateImageInput - The input type for the generateImage function.
 * - GenerateImageOutput - The return type for the generateImage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateImageInputSchema = z.object({
  prompt: z.string().describe('The text prompt to generate an image from.'),
  artisticStyle: z.string().optional().describe('The artistic style to apply to the image. E.g., "Cartoon", "Photorealistic". Default is none.'),
});
export type GenerateImageInput = z.infer<typeof GenerateImageInputSchema>;

const GenerateImageOutputSchema = z.object({
  imageDataUri: z
    .string()
    .describe(
      "The generated image as a data URI. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  modelUsed: z.string().describe("The AI model used for generation."),
});
export type GenerateImageOutput = z.infer<typeof GenerateImageOutputSchema>;

export async function generateImage(
  input: GenerateImageInput
): Promise<GenerateImageOutput> {
  return generateImageFlow(input);
}

const generateImageFlow = ai.defineFlow(
  {
    name: 'generateImageFlow',
    inputSchema: GenerateImageInputSchema,
    outputSchema: GenerateImageOutputSchema,
  },
  async (input) => {
    let finalPrompt = input.prompt;
    // Ensure the artistic style is appended to the prompt if selected and valid
    if (input.artisticStyle && input.artisticStyle.trim() !== '' && input.artisticStyle.toLowerCase() !== 'none') {
      finalPrompt = `${input.prompt}, in the artistic style of ${input.artisticStyle}`;
    }
    console.log('[generateImageFlow] Final prompt sent to AI:', finalPrompt);

    const { media } = await ai.generate({
      model: 'googleai/gemini-2.0-flash-exp', // IMPORTANT: Must be this model for images
      prompt: finalPrompt,
      config: {
        responseModalities: ['TEXT', 'IMAGE'], // MUST provide both TEXT and IMAGE
         safetySettings: [
          {
            category: 'HARM_CATEGORY_HATE_SPEECH',
            threshold: 'BLOCK_ONLY_HIGH', // Relaxed from BLOCK_MEDIUM_AND_ABOVE
          },
          {
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
            threshold: 'BLOCK_ONLY_HIGH', // Relaxed from BLOCK_MEDIUM_AND_ABOVE
          },
          {
            category: 'HARM_CATEGORY_HARASSMENT',
            threshold: 'BLOCK_ONLY_HIGH', // Relaxed from BLOCK_MEDIUM_AND_ABOVE
          },
          {
            category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
            threshold: 'BLOCK_ONLY_HIGH', // Relaxed from BLOCK_MEDIUM_AND_ABOVE
          },
        ],
      },
    });

    if (!media || !media.url) {
      throw new Error('Image generation failed or did not return a media URL. This might be due to safety filters or an issue with the model.');
    }

    return {
      imageDataUri: media.url,
      modelUsed: 'googleai/gemini-2.0-flash-exp',
    };
  }
);

