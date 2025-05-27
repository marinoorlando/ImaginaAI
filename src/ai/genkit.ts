import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

const apiKey = process.env.GOOGLE_API_KEY;

if (!apiKey && process.env.NODE_ENV !== 'production') {
  console.warn(
    'WARNING: GOOGLE_API_KEY environment variable is not set. Genkit Google AI plugin may not function correctly. Please set it in your .env file.'
  );
}

export const ai = genkit({
  plugins: [googleAI({apiKey: apiKey})],
  model: 'googleai/gemini-2.0-flash',
});
