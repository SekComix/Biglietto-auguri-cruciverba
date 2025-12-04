import { GoogleGenAI, Type } from "@google/genai";
import { CrosswordData, ManualInput, ThemeType, CustomImages } from '../types';

// SCHEMA SEMPLIFICATO: Rimosso 'message', 'recipientName', etc. L'IA deve solo fare la griglia.
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
  
  // Prompt OTTIMIZZATO AL MASSIMO
  // Non chiediamo titolo o messaggio. Solo la logica della griglia.
  const commonInstructions = `
    Sei un motore logico per cruciverba.
    Output: SOLO JSON.
    
    VINCOLI DI VELOCITÀ:
    1. Griglia MINUSCOLA: Max 8x8.
    2. Parole: Max 5 o 6 totali.
    3. Definizioni brevissime.
    4. Coordinate 0-indexed.
  `;

  let solutionInstructions = "";
  if (hiddenSolutionWord) {
    const cleanSol = hiddenSolutionWord.toUpperCase().replace(/[^A-Z]/g, '');
    solutionInstructions = `
      La frase segreta è "${cleanSol}".
      Indica le coordinate (x,y) delle celle che formano questa parola prendendo le lettere dalla griglia.
      Se non riesci a formarla, ignora il campo 'solution'.
    `;
  }

  if (mode === 'manual') {
    const inputs = inputData as ManualInput[];
    const wordListString = inputs.map(i => `"${i.word.toUpperCase()}" (${i.clue})`).join(", ");
    prompt = `Crea griglia JSON con queste parole: ${wordListString}. ${commonInstructions} ${solutionInstructions}`;
  } else {
    const topic = inputData as string;
    prompt = `Crea un Micro-Cruciverba (5 parole) sul tema: "${topic}". Definizioni semplici. ${commonInstructions} ${solutionInstructions}`;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: crosswordSchema,
        temperature: 0.1, // Bassissima per massima velocità e logica
      },
    });

    if (response.text) {
      const rawData = JSON.parse(response.text);
      
      // Costruiamo noi l'oggetto finale client-side per risparmiare tempo all'IA
      const defaultTitle = theme === 'birthday' ? `Auguri ${extraData?.recipientName}!` : 
                           theme === 'christmas' ? `Buon Natale ${extraData?.recipientName}!` :
                           `Per ${extraData?.recipientName}`;

      const defaultMessage = `Un piccolo gioco dedicato a te per celebrare questo giorno speciale. Risolvi il cruciverba e scopri la sorpresa!`;

      const finalData: CrosswordData = {
          title: defaultTitle,
          message: defaultMessage, // Messaggio standard immediato
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
    throw new Error("Nessuna risposta generata");
  } catch (error: any) {
    console.error("Gemini Error:", error);
    if (error.status === 429) {
       throw new Error("Troppe richieste. Attendi qualche secondo.");
    }
    throw error;
  }
};

export const regenerateGreeting = async (
    currentMessage: string,
    theme: string,
    recipient: string,
    tone: 'funny' | 'heartfelt' | 'rhyme' = 'heartfelt'
): Promise<string> => {
    const apiKey = getApiKey();
    const ai = new GoogleGenAI({ apiKey });

    const tones = {
        funny: "divertente e spiritoso",
        heartfelt: "dolce ed emozionante",
        rhyme: "una breve rima natalizia/festiva"
    };

    // Prompt separato per il testo - molto veloce
    const prompt = `Scrivi un breve messaggio di auguri (max 2 frasi) per ${recipient}. Tema: ${theme}. Stile: ${tones[tone]}.`;

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
