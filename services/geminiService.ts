import { GoogleGenAI, Type } from "@google/genai";
import { CrosswordData, ManualInput, ThemeType, CustomImages } from '../types';

// Schema definition for the crossword generation
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
          description: "Coordinates for each letter of the solution word, IN ORDER.",
          items: {
            type: Type.OBJECT,
            properties: {
              x: { type: Type.INTEGER },
              y: { type: Type.INTEGER },
              char: { type: Type.STRING, description: "The letter at this position." },
              index: { type: Type.INTEGER, description: "0-based index of this letter in the solution word." }
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
    images?: CustomImages;
    stickers?: string[];
  }
): Promise<CrosswordData> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key mancante");

  const ai = new GoogleGenAI({ apiKey });

  let prompt = "";
  const commonInstructions = `
    Tema grafico selezionato: ${theme}.
    Il destinatario si chiama: ${extraData?.recipientName || 'Anonimo'}.
    
    ISTRUZIONI BASE:
    1. Griglia max 12x12 (o più piccola se possibile, ottima 10x10).
    2. Le parole devono incrociarsi correttamente.
    3. "startX" e "startY" sono indici 0-based.
    4. "number" è il numero progressivo della definizione (1, 2, 3...).
  `;

  let solutionInstructions = "";
  if (hiddenSolutionWord) {
    solutionInstructions = `
      ISTRUZIONI SOLUZIONE NASCOSTA:
      L'utente vuole che il cruciverba celi la parola segreta: "${hiddenSolutionWord.toUpperCase()}".
      
      IL TUO COMPITO CRUCIALE:
      1. Genera un cruciverba normale con parole che contengano le lettere di "${hiddenSolutionWord.toUpperCase()}".
      2. DEVI identificare le coordinate (x, y) esatte nella griglia finale dove si trovano le lettere che compongono "${hiddenSolutionWord.toUpperCase()}".
      3. Riempi il campo 'solution' nel JSON. 
      4. 'solution.cells' deve essere un array ordinato corrispondente alle lettere della soluzione.
         NON devono essere per forza contigue. Possono essere sparse nella griglia.
    `;
  }

  if (mode === 'manual') {
    const inputs = inputData as ManualInput[];
    const wordListString = inputs.map(i => `WORD: ${i.word}, CLUE: ${i.clue}`).join("\n");
    
    prompt = `
      Agisci come un motore di cruciverba esperto.
      Crea una griglia valida utilizzando queste parole fornite dall'utente.
      
      Lista Parole Utente:
      ${wordListString}
      
      ${commonInstructions}
      ${solutionInstructions}
    `;
  } else {
    // AI Mode
    const topic = inputData as string;
    prompt = `
      Crea un cruciverba completo per un biglietto di auguri.
      Argomento specifico o dettagli: "${topic}".
      
      ${commonInstructions}
      ${solutionInstructions}
      
      Genera parole e indizi pertinenti all'argomento.
    `;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: crosswordSchema,
        temperature: 0.2, 
      },
    });

    if (response.text) {
      const data = JSON.parse(response.text);
      // Enrich data with local visual assets (images, name, stickers)
      data.words = data.words.map((w: any, idx: number) => ({ ...w, id: `word-${idx}` }));
      data.theme = theme;
      data.recipientName = extraData?.recipientName || '';
      data.images = extraData?.images;
      data.stickers = extraData?.stickers;
      
      return data as CrosswordData;
    }
    throw new Error("Nessuna risposta generata");
  } catch (error) {
    console.error("Gemini Error:", error);
    throw error;
  }
};
