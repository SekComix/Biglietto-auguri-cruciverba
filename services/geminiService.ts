import { GoogleGenAI, Type } from "@google/genai";
import { CrosswordData, ManualInput, ThemeType, CustomImages } from '../types';

// Schema definition
const crosswordSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "Title of the card." },
    message: { type: Type.STRING, description: "Greeting message." },
    width: { type: Type.INTEGER, description: "Grid width (max 12)." },
    height: { type: Type.INTEGER, description: "Grid height (max 12)." },
    words: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          word: { type: Type.STRING, description: "The word in uppercase." },
          clue: { type: Type.STRING, description: "The clue for the word." },
          direction: { type: Type.STRING, enum: ["across", "down"] },
          startX: { type: Type.INTEGER, description: "0-based X coordinate (column)." },
          startY: { type: Type.INTEGER, description: "0-based Y coordinate (row)." },
          number: { type: Type.INTEGER, description: "The visual number for the clue." }
        },
        required: ["word", "clue", "direction", "startX", "startY", "number"]
      }
    },
    solution: {
      type: Type.OBJECT,
      nullable: true,
      description: "Data for the hidden solution word, if requested.",
      properties: {
        word: { type: Type.STRING, description: "The hidden solution word." },
        cells: {
          type: Type.ARRAY,
          description: "Coordinates for each letter of the solution word.",
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
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key mancante");

  // USE FLASH MODEL FOR SPEED AND QUOTA SAFETY
  const ai = new GoogleGenAI({ apiKey });

  let prompt = "";
  const commonInstructions = `
    Tema grafico: ${theme}.
    Destinatario: ${extraData?.recipientName || 'Anonimo'}.
    IMPORTANTE: Genera JSON valido. Griglia max 12x12.
    Se il tema è Natale, usa parole natalizie. Se Compleanno, parole festive.
  `;

  let solutionInstructions = "";
  if (hiddenSolutionWord) {
    solutionInstructions = `
      SOLUZIONE NASCOSTA RICHIESTA: "${hiddenSolutionWord.toUpperCase()}".
      1. Genera parole che contengano queste lettere.
      2. Mappa le coordinate esatte in 'solution.cells'.
    `;
  }

  if (mode === 'manual') {
    const inputs = inputData as ManualInput[];
    const wordListString = inputs.map(i => `WORD: ${i.word}, CLUE: ${i.clue}`).join("\n");
    prompt = `
      Crea una griglia valida con queste parole fornite dall'utente:
      ${wordListString}
      ${commonInstructions}
      ${solutionInstructions}
    `;
  } else {
    const topic = inputData as string;
    prompt = `
      Crea un cruciverba. Argomento: "${topic}".
      ${commonInstructions}
      ${solutionInstructions}
    `;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', // FAST MODEL
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: crosswordSchema,
        temperature: 0.2, 
      },
    });

    if (response.text) {
      const data = JSON.parse(response.text);
      // Inject local data
      data.words = data.words.map((w: any, idx: number) => ({ ...w, id: `word-${idx}` }));
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
       throw new Error("Traffico intenso. Attendi 10 secondi e riprova.");
    }
    throw error;
  }
};
