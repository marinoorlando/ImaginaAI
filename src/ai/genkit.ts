
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

const apiKey = process.env.GOOGLE_API_KEY;

if (!apiKey && process.env.NODE_ENV !== 'production') {
  console.warn(
    `
    ************************************************************************************************************************************************************************************************
    ADVERTENCIA: La variable de entorno GOOGLE_API_KEY no está configurada.
    El plugin Genkit Google AI podría no funcionar correctamente.

    Para solucionarlo:
    1. Asegúrate de que tienes un archivo llamado '.env' (con el punto al principio) en la carpeta raíz de tu proyecto.
       Esta es la misma carpeta donde se encuentran tus archivos 'package.json' y 'next.config.ts'.
    2. Dentro de ese archivo '.env', añade la siguiente línea, reemplazando 'TU_API_KEY_REAL_AQUI' con tu clave de API real de Google AI:
       GOOGLE_API_KEY=TU_API_KEY_REAL_AQUI

    Una vez guardado el archivo .env con tu API Key, reinicia la aplicación.
    ************************************************************************************************************************************************************************************************
    `
  );
}

export const ai = genkit({
  plugins: [googleAI({apiKey: apiKey})],
  model: 'googleai/gemini-2.0-flash',
});

