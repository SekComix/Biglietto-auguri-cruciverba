import { GoogleGenAI, Type } from "@google/genai";
import { CrosswordData, ManualInput, ThemeType, CustomImages } from '../types';

const crosswordSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    message: { type: Type.STRING },
    width: { type: Type.INTEGER },
    height: { type: Type.INTEGER },
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
  required: ["title", "message", "width", "height", "words"]
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
  // Istruzioni ottimizzate per VELOCITÀ e CORRETTEZZA SPAZIALE
  const commonInstructions = `
    Sei un motore per cruciverba veloce.
    Tema: ${theme}. Destinatario: ${extraData?.recipientName || 'Anonimo'}.
    Regole CRITICHE:
    1. Crea un cruciverba COMPATTO (max 10x10).
    2. Usa MAX 8-10 parole totali per velocità.
    3. LE LETTERE NGLI INCROCI DEVONO COMBACIARE ESATTAMENTE.
    4. Coordinate startX/startY partono da 0.
    5. JSON puro.
  `;

  let solutionInstructions = "";
  if (hiddenSolutionWord) {
    solutionInstructions = `SOLUZIONE NASCOSTA: "${hiddenSolutionWord.toUpperCase()}". 
    Scegli coordinate (x,y) di caselle occupate da altre parole per formare questa parola segreta.`;
  }

  if (mode === 'manual') {
    const inputs = inputData as ManualInput[];
    const wordListString = inputs.map(i => `Parola:${i.word.toUpperCase()}, Indizio:${i.clue}`).join(" | ");
    prompt = `Genera layout cruciverba valido con queste parole esatte: ${wordListString}. ${commonInstructions} ${solutionInstructions}`;
  } else {
    const topic = inputData as string;
    prompt = `Genera un piccolo cruciverba su: "${topic}". Parole semplici e divertenti. ${commonInstructions} ${solutionInstructions}`;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: crosswordSchema,
        temperature: 0.1, // Temperatura bassa per massima precisione logica
        topP: 0.8,
        topK: 20
      },
    });

    if (response.text) {
      const data = JSON.parse(response.text);
      // Post-processing per ID univoci
      data.words = data.words.map((w: any, idx: number) => ({ 
          ...w, 
          id: `word-${idx}`,
          word: w.word.toUpperCase().trim() 
      }));
      data.theme = theme;
      data.recipientName = extraData?.recipientName || '';
      data.eventDate = extraData?.eventDate || '';
      data.images = extraData?.images;
      data.stickers = extraData?.stickers;
      
      return data as CrosswordData;
    }
    throw new Error("Nessuna risposta generata");
  } catch (error: any) {
    console.error("Gemini Error:", error);
    if (error.status === 429) {
       throw new Error("Traffico intenso. Riprova tra poco.");
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
        heartfelt: "commovente e dolce",
        rhyme: "in rima baciata"
    };

    const prompt = `Scrivi SOLO un breve messaggio di auguri (max 20 parole) per ${recipient}.
    Occasione: ${theme}. Stile: ${tones[tone]}.
    Messaggio precedente: "${currentMessage}"`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return response.text?.replace(/"/g, '').trim() || currentMessage;
    } catch (e) {
        console.error(e);
        return currentMessage;
    }
};
