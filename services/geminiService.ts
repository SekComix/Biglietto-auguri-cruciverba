import { GoogleGenAI, Type } from "@google/genai";
import { CrosswordData, ManualInput, ThemeType, CustomImages } from '../types';

// SCHEMA OTTIMIZZATO
const crosswordSchema = {
  type: Type.OBJECT,
  properties: {
    words: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          word: { type: Type.STRING },
          clue: { type: Type.STRING },
          direction: { type: Type.STRING, enum: ["across", "down"] },
          startX: { type: Type.INTEGER },
          startY: { type: Type.INTEGER },
          number: { type: Type.INTEGER }
        },
        required: ["word", "clue", "direction", "startX", "startY", "number"]
      }
    },
    width: { type: Type.INTEGER },
    height: { type: Type.INTEGER },
    solution: {
      type: Type.OBJECT,
      nullable: true,
      properties: {
        word: { type: Type.STRING },
        cells: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              x: { type: Type.INTEGER },
              y: { type: Type.INTEGER },
              char: { type: Type.STRING },
              index: { type: Type.INTEGER }
            },
            required: ["x", "y", "char", "index"]
          }
        }
      },
      required: ["word", "cells"]
    }
  },
  required: ["width", "height", "words"]
};

const getApiKey = () => {
  // @ts-ignore
  const key = process.env.API_KEY;
  if (!key) throw new Error("API Key mancante");
  return key;
};

// Funzione di pausa per il retry
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const generateCrossword = async (
  mode: 'ai' | 'manual',
  theme: ThemeType,
  inputData: string | ManualInput[],
  hiddenSolutionWord?: string,
  extraData?: {
    recipientName: string;
    eventDate: string;
    images?: CustomImages;
    stickers?: string[];
  }
): Promise<CrosswordData> => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });

  let prompt = "";
  
  // Prompt minimalista per ridurre token e carico server
  const commonInstructions = `
    Output: SOLO JSON valido. Nessun testo extra.
    Task: Crea cruciverba compatto.
    Vincoli: Max 6 parole totali. Griglia max 8x8.
  `;

  let solutionInstructions = "";
  if (hiddenSolutionWord) {
    const cleanSol = hiddenSolutionWord.toUpperCase().replace(/[^A-Z]/g, '');
    solutionInstructions = `Parola segreta: "${cleanSol}". Coordinate celle soluzione in 'solution.cells'.`;
  }

  if (mode === 'manual') {
    const inputs = inputData as ManualInput[];
    const wordListString = inputs.map(i => `"${i.word.toUpperCase()}" (${i.clue})`).join(", ");
    prompt = `Griglia JSON con parole: ${wordListString}. ${commonInstructions} ${solutionInstructions}`;
  } else {
    const topic = inputData as string;
    prompt = `Cruciverba 6 parole tema: "${topic}". Definizioni brevi. ${commonInstructions} ${solutionInstructions}`;
  }

  // TENTATIVI MULTIPLI (RETRY LOGIC)
  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: crosswordSchema,
          temperature: 0.1,
        },
      });

      if (response.text) {
        const rawData = JSON.parse(response.text);
        
        const defaultTitle = theme === 'birthday' ? `Auguri ${extraData?.recipientName}!` : 
                             theme === 'christmas' ? `Buon Natale ${extraData?.recipientName}!` :
                             `Per ${extraData?.recipientName}`;

        const defaultMessage = `Un piccolo gioco dedicato a te per celebrare questo giorno speciale. Risolvi il cruciverba e scopri la sorpresa!`;

        const finalData: CrosswordData = {
            title: defaultTitle,
            message: defaultMessage,
            width: rawData.width,
            height: rawData.height,
            words: rawData.words.map((w: any, idx: number) => ({ 
                ...w, 
                id: `word-${idx}`,
                word: w.word.toUpperCase().trim() 
            })),
            solution: rawData.solution,
            theme: theme,
            recipientName: extraData?.recipientName || '',
            eventDate: extraData?.eventDate || '',
            images: extraData?.images,
            stickers: extraData?.stickers
        };
        
        return finalData;
      }
      throw new Error("Risposta vuota dall'IA");

    } catch (error: any) {
      console.error(`Tentativo ${attempts + 1} fallito:`, error);
      attempts++;

      // Gestione specifica Errori 503 (Overloaded) o 429 (Too Many Requests)
      if (attempts < maxAttempts && (error.status === 503 || error.status === 429 || error.message?.includes('overloaded'))) {
         console.log(`Server carico. Attendo ${attempts * 2} secondi prima di riprovare...`);
         await sleep(2000 * attempts); // Backoff: aspetta 2s, poi 4s
         continue;
      }
      
      // Se è l'ultimo tentativo o un errore diverso, lancia l'errore
      if (attempts === maxAttempts) {
         if (error.status === 503) {
            throw new Error("I server di Google sono sovraccarichi. Riprova tra un minuto.");
         }
         throw error;
      }
    }
  }

  throw new Error("Impossibile generare il cruciverba al momento.");
};

export const regenerateGreeting = async (
    currentMessage: string,
    theme: string,
    recipient: string,
    tone: 'funny' | 'heartfelt' | 'rhyme' = 'heartfelt'
): Promise<string> => {
    const apiKey = getApiKey();
    const ai = new GoogleGenAI({ apiKey });

    // Prompt super veloce per il testo
    const prompt = `Messaggio auguri breve (max 20 parole) per ${recipient}. Tema: ${theme}. Tono: ${tone}.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return response.text?.replace(/"/g, '').trim() || currentMessage;
    } catch (e) {
        return currentMessage;
    }
};
