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
  hiddenSolutionWord: string | undefined,
  extraData: {
    recipientName: string;
    eventDate: string;
    images?: CustomImages;
    stickers?: string[];
  },
  onStatusUpdate?: (status: string) => void
): Promise<CrosswordData> => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });

  let prompt = "";
  
  // Prompt ULTRARAPIDO
  // 4 parole, griglia 6x6 è quasi istantaneo.
  const commonInstructions = `
    Output: SOLO JSON.
    Task: Crea MICRO-cruciverba.
    Vincoli: 
    - 4 PAROLE TOTALI.
    - Griglia 6x6.
    - Definizioni brevissime (max 3 parole).
  `;

  let solutionInstructions = "";
  if (hiddenSolutionWord) {
    const cleanSol = hiddenSolutionWord.toUpperCase().replace(/[^A-Z]/g, '');
    solutionInstructions = `Parola segreta: "${cleanSol}". Coordinate celle in 'solution.cells'.`;
  }

  if (mode === 'manual') {
    const inputs = inputData as ManualInput[];
    const wordListString = inputs.map(i => `"${i.word.toUpperCase()}" (${i.clue})`).join(", ");
    prompt = `Griglia JSON con queste parole: ${wordListString}. ${commonInstructions} ${solutionInstructions}`;
  } else {
    const topic = inputData as string;
    prompt = `Cruciverba 4 parole tema: "${topic}". ${commonInstructions} ${solutionInstructions}`;
  }

  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    try {
      attempts++;
      if (onStatusUpdate) onStatusUpdate(attempts > 1 ? `Tentativo ${attempts} di ${maxAttempts}...` : "Elaborazione in corso...");

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: crosswordSchema,
          temperature: 0.1, // Zero creatività sulla struttura = massima velocità
        },
      });

      if (response.text) {
        const rawData = JSON.parse(response.text);
        
        const defaultTitle = theme === 'birthday' ? `Auguri ${extraData?.recipientName}!` : 
                             theme === 'christmas' ? `Buon Natale ${extraData?.recipientName}!` :
                             `Per ${extraData?.recipientName}`;

        const defaultMessage = `Auguri! Risolvi questo piccolo gioco pensato apposta per te.`;

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
      console.error(`Tentativo ${attempts} fallito:`, error);
      
      const isOverloaded = error.status === 503 || error.status === 429 || error.message?.includes('overloaded');
      
      if (attempts < maxAttempts) {
         if (isOverloaded) {
             if (onStatusUpdate) onStatusUpdate(`Server carico. Attendo... (${attempts}/${maxAttempts})`);
             await sleep(1500 * attempts); 
         } else {
             // Se è un errore diverso (es. JSON malformato), riprova subito
             if (onStatusUpdate) onStatusUpdate(`Ricalcolo incroci... (${attempts}/${maxAttempts})`);
         }
         continue;
      }
      
      if (isOverloaded) {
          throw new Error("I server sono troppo occupati. Riprova tra un istante.");
      }
      throw error;
    }
  }

  throw new Error("Impossibile generare il cruciverba. Riprova con un argomento più semplice.");
};

export const regenerateGreeting = async (
    currentMessage: string,
    theme: string,
    recipient: string,
    tone: 'funny' | 'heartfelt' | 'rhyme' = 'heartfelt'
): Promise<string> => {
    const apiKey = getApiKey();
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `Messaggio auguri 1 frase per ${recipient}. Tema: ${theme}. Tono: ${tone}.`;

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
