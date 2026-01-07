import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { CrosswordData, ManualInput, ThemeType, ToneType, CardFormat } from '../types';

const getApiKey = (): string => {
  // @ts-ignore
  return import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.API_KEY || "";
};

const normalizeWord = (str: string): string => {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z]/g, "");
};

// --- LOGICA AI (STABILE 2026 CON BILLING) ---
async function tryGenerateContent(ai: GoogleGenAI, prompt: string, isJson: boolean = false): Promise<GenerateContentResponse> {
    // Usiamo gemini-1.5-flash: con il Billing attivo è il più affidabile
    const modelName = 'gemini-1.5-flash'; 
    
    try {
        const finalPrompt = isJson ? `${prompt}. Rispondi solo in formato JSON.` : prompt;
        const model = ai.models.get({ model: modelName });

        // @ts-ignore
        return await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: finalPrompt }] }],
            generationConfig: { temperature: 0.7 }
        });
    } catch (e: any) {
        console.error("Errore AI:", e.message);
        throw e;
    }
}

// [MANTIENI TUTTE LE ALTRE FUNZIONI: generateLayout, findSolutionInGrid, ecc.]

export const generateCrossword = async (
  mode: 'ai' | 'manual', theme: ThemeType, inputData: string | ManualInput[], hiddenSolutionWord: string | undefined, extraData: any, onStatusUpdate?: (s: string) => void
): Promise<CrosswordData> => {
  const apiKey = getApiKey();
  // USIAMO LA VERSIONE STABILE 'v1'
  const ai = new GoogleGenAI({ apiKey, apiVersion: 'v1' });
  
  let generatedWords: {word: string, clue: string}[] = [];
  let message = '';

  if (extraData.contentType === 'crossword') {
      if (mode === 'manual') {
          generatedWords = (inputData as ManualInput[]).filter(i => i.word.trim()).map(i => ({ word: normalizeWord(i.word), clue: i.clue }));
      } else {
          try {
              if (onStatusUpdate) onStatusUpdate("L'IA inventa le parole...");
              const response = await tryGenerateContent(ai, `Genera 10 parole tema: ${inputData}`, true);
              const cleanText = (response.text || "{}").replace(/```json/g, "").replace(/```/g, "").trim();
              generatedWords = JSON.parse(cleanText).words.map((w: any) => ({ ...w, word: normalizeWord(w.word) }));
          } catch (e) { throw new Error("Errore generazione parole AI"); }
      }
  }

  // Costruzione cruciverba... (codice precedente)
  return { /* ... */ } as any; 
};

export const regenerateGreetingOptions = async (m: string, th: string, r: string, t: ToneType, cp?: string): Promise<string[]> => {
    const apiKey = getApiKey();
    if (!apiKey) return ["Auguri!"];
    const ai = new GoogleGenAI({ apiKey, apiVersion: 'v1' });
    try {
        const response = await tryGenerateContent(ai, `Scrivi auguri per ${r}, tema ${th}`);
        return [response.text || "Auguri!"];
    } catch (e) { return ["Auguri!"]; }
};

export const regenerateGreeting = async (m: string, th: string, r: string, t: ToneType, cp?: string) => (await regenerateGreetingOptions(m, th, r, t, cp))[0];
