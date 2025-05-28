
'use server';

/**
 * @fileOverview A flow to suggest relevant tags (collections) and an alternative prompt for a generated image.
 *
 * - suggestTags - A function that handles the tag and prompt suggestion process.
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
  suggestedPrompt: z.string().optional().describe('An alternative or enhanced prompt related to the original image generation prompt. This new prompt could be used to generate similar or variant images.'),
});
export type SuggestTagsOutput = z.infer<typeof SuggestTagsOutputSchema>;

export async function suggestTags(input: SuggestTagsInput): Promise<SuggestTagsOutput> {
  return suggestTagsFlow(input);
}

const promptGenerator = ai.definePrompt({
  name: 'suggestTagsAndPromptPrompt',
  input: {schema: SuggestTagsInputSchema},
  output: {schema: SuggestTagsOutputSchema},
  prompt: `You are an expert image categorization AI and a creative prompt assistant.
Your task is to:
1. Suggest 3 to 5 relevant keywords or short phrases (collections) that can be used to categorize an image generated from the following prompt.
2. Suggest one alternative or enhanced prompt that could be used to generate a similar or variant image. This suggested prompt should be creative and potentially offer a new perspective or more detail.

Return your suggestions ONLY as a valid JSON object with two keys: "tags" (a JSON array of strings for collections) and "suggestedPrompt" (a string for the new prompt, or null if no good suggestion can be made).
Example:
{
  "tags": ["Landscapes", "Portraits", "Futuristic City"],
  "suggestedPrompt": "A serene mountain landscape at dusk, with a crystal clear lake reflecting the vibrant colors of the sky, painted in an impressionistic style."
}

If you cannot suggest a new prompt, you can return the suggestedPrompt field as null or an empty string.

Image Generation Prompt:
"{{{prompt}}}"

Output:
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
    const genkitResponse = await promptGenerator(input);
    console.log('[suggestTagsFlow] Genkit raw output:', genkitResponse.output); 

    if (!genkitResponse.output) {
       console.error(
        '[suggestTagsFlow] Genkit prompt did not return any output.',
        'Input:', input,
        'Full Genkit Response:', genkitResponse
      );
      throw new Error('La IA no pudo generar sugerencias válidas. Revisa los logs del servidor.');
    }
    
    // Validate tags - they are required
    if (!Array.isArray(genkitResponse.output.tags)) {
      console.warn(
        '[suggestTagsFlow] Genkit prompt did not return a valid "tags" array. Attempting to parse if output is a stringified JSON.',
        'Output tags:', genkitResponse.output.tags
      );
      // Attempt to parse if output.tags is a stringified JSON array by mistake (less likely with structured output)
      // Or if the entire output is a string that needs parsing.
      let parsedTags: string[] = [];
      if (typeof genkitResponse.output === 'string') {
         try {
          const parsedFullOutput = JSON.parse(genkitResponse.output);
          if (parsedFullOutput && Array.isArray(parsedFullOutput.tags)) {
            parsedTags = parsedFullOutput.tags;
          }
        } catch (e) {
          // ignore
        }
      }

      if (parsedTags.length === 0 && !Array.isArray(genkitResponse.output.tags)) {
         console.error(
          '[suggestTagsFlow] Failed to get valid tags. Genkit output.tags:', genkitResponse.output.tags,
          'Full Genkit Response:', genkitResponse
        );
        // Return with empty tags but potentially a suggested prompt if available
        return {
            tags: [],
            suggestedPrompt: typeof genkitResponse.output.suggestedPrompt === 'string' ? genkitResponse.output.suggestedPrompt : undefined,
        };
      }
       genkitResponse.output.tags = parsedTags; // Use parsed tags if successful
    }
    
    // Ensure suggestedPrompt is a string or undefined
    const suggestedPrompt = typeof genkitResponse.output.suggestedPrompt === 'string' && genkitResponse.output.suggestedPrompt.trim() !== ''
      ? genkitResponse.output.suggestedPrompt.trim()
      : undefined;

    console.log('[suggestTagsFlow] Successfully processed output. Tags:', genkitResponse.output.tags, 'Suggested Prompt:', suggestedPrompt);
    return {
        tags: genkitResponse.output.tags || [], // Ensure tags is always an array
        suggestedPrompt: suggestedPrompt
    };
  }
);
