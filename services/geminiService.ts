import { GoogleGenAI, Type } from "@google/genai";
import { CrosswordData, ManualInput, ThemeType, CustomImages } from '../types';

// SCHEMA MINIMALISTA (Senza 'solution' object per alleggerire l'IA)
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
    height: { type: Type.INTEGER }
  },
  required: ["width", "height", "words"]
};

const getApiKey = () => {
  // @ts-ignore
  const key = process.env.API_KEY;
  if (!key) throw new Error("API Key mancante");
  return key;
};

// Funzione helper per timeout
const timeoutPromise = (ms: number) => new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), ms));

// Funzione Client-Side per trovare la soluzione nella griglia generata
const findSolutionInGrid = (words: any[], hiddenWord: string): any => {
    if (!hiddenWord) return null;
    
    const targetChars = hiddenWord.toUpperCase().replace(/[^A-Z]/g, '').split('');
    const solutionCells: any[] = [];
    const usedCoords = new Set<string>();

    // Costruiamo una mappa temporanea della griglia
    const gridMap: Record<string, string> = {};
    words.forEach((w: any) => {
        for(let i=0; i<w.word.length; i++) {
            const x = w.direction === 'across' ? w.startX + i : w.startX;
            const y = w.direction === 'down' ? w.startY + i : w.startY;
            gridMap[`${x},${y}`] = w.word[i];
        }
    });

    // Cerchiamo le lettere
    for (let i = 0; i < targetChars.length; i++) {
        const char = targetChars[i];
        let found = false;
        
        // Cerca una cella con questo carattere
        for (const key in gridMap) {
            if (gridMap[key] === char && !usedCoords.has(key)) {
                const [x, y] = key.split(',').map(Number);
                solutionCells.push({ x, y, char, index: i });
                usedCoords.add(key);
                found = true;
                break;
            }
        }
    }

    // Se abbiamo trovato tutte le lettere (o quasi), restituiamo l'oggetto soluzione
    if (solutionCells.length > 0) {
        return {
            word: hiddenWord.toUpperCase(),
            cells: solutionCells
        };
    }
    return null;
};

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
  
  // Prompt SENZA richiesta di soluzione
  const commonInstructions = `
    Output: SOLO JSON.
    Task: Cruciverba piccolo (max 7x7).
    Vincoli: Max 5 parole. Definizioni max 4 parole.
  `;

  if (mode === 'manual') {
    const inputs = inputData as ManualInput[];
    const wordListString = inputs.map(i => `"${i.word.toUpperCase()}" (${i.clue})`).join(", ");
    prompt = `Crea griglia valida JSON con queste parole: ${wordListString}. Se non si incrociano tutte, mettile vicine. ${commonInstructions}`;
  } else {
    const topic = inputData as string;
    prompt = `Genera cruciverba 5 parole su tema: "${topic}". ${commonInstructions}`;
  }

  let attempts = 0;
  const maxAttempts = 2; // Riduciamo i tentativi per non far aspettare troppo

  while (attempts < maxAttempts) {
    try {
      attempts++;
      if (onStatusUpdate) onStatusUpdate(attempts > 1 ? `Riprovo (${attempts}/${maxAttempts})...` : "Elaborazione...");

      // Corsa tra la richiesta AI e un Timer di 12 secondi
      const response: any = await Promise.race([
        ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
            responseMimeType: "application/json",
            responseSchema: crosswordSchema,
            temperature: 0.2, 
            },
        }),
        timeoutPromise(12000) // 12 secondi timeout rigoroso
      ]);

      if (response.text) {
        const rawData = JSON.parse(response.text);
        
        // Calcoliamo la soluzione LOCALE invece di chiederla all'IA
        const calculatedSolution = hiddenSolutionWord 
            ? findSolutionInGrid(rawData.words, hiddenSolutionWord) 
            : null;

        const defaultTitle = theme === 'birthday' ? `Auguri ${extraData?.recipientName}!` : 
                             theme === 'christmas' ? `Buon Natale ${extraData?.recipientName}!` :
                             `Per ${extraData?.recipientName}`;

        const defaultMessage = `Tanti auguri! Ecco un cruciverba speciale per te.`;

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
            solution: calculatedSolution, // Usiamo quella calcolata localmente
            theme: theme,
            recipientName: extraData?.recipientName || '',
            eventDate: extraData?.eventDate || '',
            images: extraData?.images,
            stickers: extraData?.stickers
        };
        
        return finalData;
      }
      throw new Error("Risposta vuota");

    } catch (error: any) {
      console.error(`Tentativo ${attempts} error:`, error);
      
      if (error.message === "Timeout") {
          // Se va in timeout, proviamo a ridurre drasticamente la complessità nel prossimo tentativo o usciamo
          if (attempts < maxAttempts) {
             prompt += " Fai molto semplice."; // Suggerimento per il retry
             continue;
          }
          throw new Error("Il server è lento. Riprova tra poco.");
      }

      // Se è un errore 503, riprova
      if (error.status === 503 || error.status === 429) {
         if (attempts < maxAttempts) continue;
         throw new Error("Traffico intenso sui server AI.");
      }
      
      if (attempts === maxAttempts) throw error;
    }
  }

  throw new Error("Impossibile generare ora.");
};

export const regenerateGreeting = async (
    currentMessage: string,
    theme: string,
    recipient: string,
    tone: 'funny' | 'heartfelt' | 'rhyme' = 'heartfelt'
): Promise<string> => {
    const apiKey = getApiKey();
    const ai = new GoogleGenAI({ apiKey });
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Auguri brevi per ${recipient}, tema ${theme}, tono ${tone}.`,
        });
        return response.text?.replace(/"/g, '').trim() || currentMessage;
    } catch (e) {
        return currentMessage;
    }
};
