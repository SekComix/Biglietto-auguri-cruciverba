import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { CrosswordData, ManualInput, ThemeType, ToneType, CardFormat } from '../types';

const getApiKey = (): string => {
  // @ts-ignore
  return import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.API_KEY || "";
};

const normalizeWord = (str: string): string => {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z]/g, "");
};

const withTimeout = <T>(promise: Promise<T>, ms: number, errorMessage: string): Promise<T> => {
    let timeoutId: any;
    const timeoutPromise = new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => { reject(new Error(errorMessage)); }, ms);
    });
    return Promise.race([promise.then(res => { clearTimeout(timeoutId); return res; }), timeoutPromise]);
};

// --- LOGICA AI STABILE CON BILLING ATTIVO ---
async function tryGenerateContent(ai: GoogleGenAI, prompt: string, isJson: boolean = false): Promise<GenerateContentResponse> {
    // Ora che hai il billing, il modello gemini-2.0-flash funzionerà perfettamente!
    const modelName = 'gemini-2.0-flash'; 
    
    try {
        const finalPrompt = isJson 
            ? `${prompt}. Rispondi esclusivamente in formato JSON puro.` 
            : prompt;

        return await withTimeout<GenerateContentResponse>(
            ai.models.generateContent({
                model: modelName,
                contents: [{ role: 'user', parts: [{ text: finalPrompt }] }],
                config: { temperature: 0.8 }
            }),
            30000,
            "L'AI è un po' lenta, riprova..."
        );
    } catch (e: any) {
        console.error("Errore AI:", e.message);
        throw e;
    }
}

// ... [Mantieni qui tutto il resto del codice: generateLayout, findSolutionInGrid, generateCrossword, ecc.]
// Assicurati che le funzioni usino tryGenerateContent come abbiamo impostato nei messaggi precedenti.

export const generateCrossword = async (
  mode: 'ai' | 'manual', theme: ThemeType, inputData: string | ManualInput[], hiddenSolutionWord: string | undefined, extraData: any, onStatusUpdate?: (s: string) => void
): Promise<CrosswordData> => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey }); // Ora puoi usare la configurazione standard
  
  let generatedWords: {word: string, clue: string}[] = [];
  let message = '';

  if (extraData.contentType === 'crossword') {
      if (mode === 'manual') {
          generatedWords = (inputData as ManualInput[]).filter(i => i.word.trim()).map(i => ({ word: normalizeWord(i.word), clue: i.clue }));
      } else {
          if (onStatusUpdate) onStatusUpdate("L'IA inventa le parole...");
          const response = await tryGenerateContent(ai, `Genera 10 parole tema: ${inputData}`, true);
          const cleanText = (response.text || "{}").replace(/```json/g, "").replace(/```/g, "").trim();
          generatedWords = JSON.parse(cleanText).words.map((w: any) => ({ ...w, word: normalizeWord(w.word) }));
      }
  }

  // ... [Il resto della logica del cruciverba che avevamo già stabilizzato]
  return { /* ... dati ... */ } as any; 
};

export const regenerateGreetingOptions = async (msg: string, theme: string, recipient: string, tone: ToneType, customPrompt?: string): Promise<string[]> => {
    const apiKey = getApiKey();
    if (!apiKey) return ["Auguri!"];
    try {
        const inst = tone === 'custom' && customPrompt ? `Istruzioni: ${customPrompt}` : `Stile: ${tone}`;
        const response = await tryGenerateContent(new GoogleGenAI({ apiKey }), `Scrivi 5 auguri per ${recipient}, tema ${theme}, ${inst}`, true);
        const cleanText = (response.text || "{}").replace(/```json/g, "").replace(/```/g, "").trim();
        return JSON.parse(cleanText).options || ["Auguri!"];
    } catch (e) { return ["Auguri!"]; }
};

export const regenerateGreeting = async (m: string, th: string, r: string, t: ToneType, cp?: string) => (await regenerateGreetingOptions(m, th, r, t, cp))[0];
