import { GoogleGenAI, Type } from "@google/genai";
import { CrosswordData, ManualInput, ThemeType, CustomImages } from '../types';

// SCHEMA MINIMALISTA
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

// Funzione helper per timeout (Aumentato a 25s)
const timeoutPromise = (ms: number) => new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), ms));

// Funzione Client-Side per trovare la soluzione nella griglia generata
const findSolutionInGrid = (words: any[], hiddenWord: string): any => {
    if (!hiddenWord) return null;
    
    const targetChars = hiddenWord.toUpperCase().replace(/[^A-Z]/g, '').split('');
    const solutionCells: any[] = [];
    const usedCoords = new Set<string>();

    const gridMap: Record<string, string> = {};
    words.forEach((w: any) => {
        for(let i=0; i<w.word.length; i++) {
            const x = w.direction === 'across' ? w.startX + i : w.startX;
            const y = w.direction === 'down' ? w.startY + i : w.startY;
            gridMap[`${x},${y}`] = w.word[i];
        }
    });

    for (let i = 0; i < targetChars.length; i++) {
        const char = targetChars[i];
        let found = false;
        
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
  
  // Prompt Ottimizzato per velocità e tolleranza
  const commonInstructions = `
    Output: SOLO JSON.
    Task: Cruciverba piccolo e veloce (max 8x8).
    Vincoli: 
    - IMPORTANTE: Se le parole non si incrociano perfettamente, posizionale separate nella griglia. Non cercare la perfezione, cerca la validità del JSON.
    - Max 6 parole totali.
    - Definizioni brevi.
  `;

  if (mode === 'manual') {
    const inputs = inputData as ManualInput[];
    const wordListString = inputs.map(i => `"${i.word.toUpperCase()}" (${i.clue})`).join(", ");
    prompt = `Crea una griglia JSON posizionando queste parole: ${wordListString}. ${commonInstructions}`;
  } else {
    const topic = inputData as string;
    prompt = `Genera un piccolo cruciverba (5 parole) sul tema: "${topic}". ${commonInstructions}`;
  }

  let attempts = 0;
  const maxAttempts = 3; 

  while (attempts < maxAttempts) {
    try {
      attempts++;
      if (onStatusUpdate) onStatusUpdate(attempts > 1 ? `Tentativo ${attempts} (Server carico, riprovo)...` : "Analisi parole...");

      // Timeout aumentato a 25 secondi per dare tempo al modello in momenti di carico
      const response: any = await Promise.race([
        ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
            responseMimeType: "application/json",
            responseSchema: crosswordSchema,
            temperature: 0.1, // Bassa temperatura per JSON stabile
            },
        }),
        timeoutPromise(25000) 
      ]);

      if (response.text) {
        if (onStatusUpdate) onStatusUpdate("Costruisco il biglietto...");
        const rawData = JSON.parse(response.text);
        
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
            solution: calculatedSolution, 
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
          // Se va in timeout, riprova
          if (attempts < maxAttempts) {
             prompt += " Fai una griglia molto semplice e piccola."; 
             continue;
          }
          throw new Error("Il server sta impiegando troppo tempo. Riprova tra un minuto.");
      }

      // Se è un errore 503/429, riprova con breve pausa
      if (error.status === 503 || error.status === 429) {
         if (onStatusUpdate) onStatusUpdate("Server occupato, attendo...");
         await new Promise(r => setTimeout(r, 2000));
         if (attempts < maxAttempts) continue;
         throw new Error("Traffico intenso sui server AI. Riprova più tardi.");
      }
      
      // Se è un errore di parsing JSON o altro, riprova
      if (attempts < maxAttempts) continue;
      
      throw error;
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
            contents: `Auguri brevi (max 15 parole) per ${recipient}, tema ${theme}, tono ${tone}.`,
        });
        return response.text?.replace(/"/g, '').trim() || currentMessage;
    } catch (e) {
        return currentMessage;
    }
};
