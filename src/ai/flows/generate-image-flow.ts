
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
  aspectRatio: z.string().optional().describe('The desired aspect ratio. E.g., "1:1", "16:9". Model support may vary.'),
  imageQuality: z.string().optional().describe('The desired image quality. E.g., "draft", "standard", "high". Model support may vary.'),
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
    
    if (input.artisticStyle && input.artisticStyle.trim() !== '' && input.artisticStyle.toLowerCase() !== 'none') {
      finalPrompt = `${finalPrompt}, in the artistic style of ${input.artisticStyle}`;
    }

    if (input.aspectRatio && input.aspectRatio.trim() !== '') {
      finalPrompt = `${finalPrompt}, with an aspect ratio of ${input.aspectRatio}`;
    }

    if (input.imageQuality && input.imageQuality.trim() !== '') {
      let qualityDescriptor = input.imageQuality;
      if (input.imageQuality === 'draft') qualityDescriptor = 'draft quality, quick sketch';
      if (input.imageQuality === 'standard') qualityDescriptor = 'standard quality';
      if (input.imageQuality === 'high') qualityDescriptor = 'high quality, detailed';
      // if (input.imageQuality === 'ultra') qualityDescriptor = 'ultra high quality, highly detailed'; // Potentially too demanding for current model
      finalPrompt = `${finalPrompt}, ${qualityDescriptor}`;
    }
    
    console.log('[generateImageFlow] Final prompt sent to AI:', finalPrompt);

    const { media } = await ai.generate({
      model: 'googleai/gemini-2.0-flash-exp', 
      prompt: finalPrompt,
      config: {
        responseModalities: ['TEXT', 'IMAGE'], 
         safetySettings: [
          {
            category: 'HARM_CATEGORY_HATE_SPEECH',
            threshold: 'BLOCK_ONLY_HIGH', 
          },
          {
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
            threshold: 'BLOCK_ONLY_HIGH', 
          },
          {
            category: 'HARM_CATEGORY_HARASSMENT',
            threshold: 'BLOCK_ONLY_HIGH', 
          },
          {
            category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
            threshold: 'BLOCK_ONLY_HIGH', 
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
