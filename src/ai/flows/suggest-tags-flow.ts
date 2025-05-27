
'use server';

/**
 * @fileOverview A flow to suggest relevant tags (collections) for a generated image based on the prompt used.
 *
 * - suggestTags - A function that handles the tag suggestion process.
 * - SuggestTagsInput - The input type for the suggestTags function.
 * - SuggestTagsOutput - The return type for the suggestTags function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestTagsInputSchema = z.object({
  prompt: z.string().describe('The prompt used to generate the image.'),
});
export type SuggestTagsInput = z.infer<typeof SuggestTagsInputSchema>;

const SuggestTagsOutputSchema = z.object({
  tags: z
    .array(z.string())
    .describe('A JSON array of 3 to 5 suggested keywords or short phrases (collections) for the image. Example: ["Nature", "Abstract", "Sci-Fi Concept Art"]'),
});
export type SuggestTagsOutput = z.infer<typeof SuggestTagsOutputSchema>;

export async function suggestTags(input: SuggestTagsInput): Promise<SuggestTagsOutput> {
  return suggestTagsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestTagsPrompt',
  input: {schema: SuggestTagsInputSchema},
  output: {schema: SuggestTagsOutputSchema},
  prompt: `You are an expert image categorization AI. Your task is to suggest 3 to 5 relevant keywords or short phrases (collections) that can be used to categorize an image generated from the following prompt.

Return your suggestions ONLY as a valid JSON array of strings. For example: ["Landscapes", "Portraits", "Futuristic City"]

Image Generation Prompt:
"{{{prompt}}}"

Collections:
`,
});

const suggestTagsFlow = ai.defineFlow(
  {
    name: 'suggestTagsFlow',
    inputSchema: SuggestTagsInputSchema,
    outputSchema: SuggestTagsOutputSchema,
  },
  async (input) => {
    console.log('[suggestTagsFlow] Input:', input);
    const genkitResponse = await prompt(input);
    console.log('[suggestTagsFlow] Genkit raw output:', genkitResponse.output); // Log raw output

    if (!genkitResponse.output || !Array.isArray(genkitResponse.output.tags)) {
      console.error(
        '[suggestTagsFlow] Genkit prompt did not return a valid output matching schema. Expected an object with a "tags" array.',
        'Input:', input,
        'Full Genkit Response:', genkitResponse
      );
      // Attempt to parse if output is a stringified JSON array by mistake
      if (typeof genkitResponse.output === 'string') {
        try {
          const parsedOutput = JSON.parse(genkitResponse.output);
          if (Array.isArray(parsedOutput)) {
            console.log('[suggestTagsFlow] Successfully parsed string output into array:', parsedOutput);
            return { tags: parsedOutput };
          }
        } catch (e) {
          console.error('[suggestTagsFlow] Failed to parse string output as JSON array:', e);
        }
      }
      throw new Error('La IA no pudo generar sugerencias de colecciones válidas. Revisa los logs del servidor para más detalles.');
    }
    console.log('[suggestTagsFlow] Successfully processed output:', genkitResponse.output);
    return genkitResponse.output;
  }
);

