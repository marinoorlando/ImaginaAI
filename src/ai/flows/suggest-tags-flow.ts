'use server';

/**
 * @fileOverview A flow to suggest relevant tags for a generated image based on the prompt used.
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
    .describe('An array of suggested tags for the image.'),
});
export type SuggestTagsOutput = z.infer<typeof SuggestTagsOutputSchema>;

export async function suggestTags(input: SuggestTagsInput): Promise<SuggestTagsOutput> {
  return suggestTagsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestTagsPrompt',
  input: {schema: SuggestTagsInputSchema},
  output: {schema: SuggestTagsOutputSchema},
  prompt: `You are a tag suggestion AI.

  Given the following prompt used to generate an image, suggest relevant tags to categorize the image. Return the tags as a JSON array of strings.

  Prompt: {{{prompt}}}
  `,
});

const suggestTagsFlow = ai.defineFlow(
  {
    name: 'suggestTagsFlow',
    inputSchema: SuggestTagsInputSchema,
    outputSchema: SuggestTagsOutputSchema,
  },
  async (input) => {
    const genkitResponse = await prompt(input);
    if (!genkitResponse.output) {
      console.error(
        'Tag suggestion flow: Genkit prompt did not return a valid output matching schema.',
        'Input:', input,
        'Full Genkit Response:', genkitResponse 
      );
      throw new Error('La IA no pudo generar sugerencias de colecciones válidas. Revisa los logs del servidor para más detalles.');
    }
    return genkitResponse.output;
  }
);
