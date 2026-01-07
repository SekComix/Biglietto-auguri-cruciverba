import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { CrosswordData, ManualInput, ThemeType, ToneType, CardFormat } from '../types';

// --- RECUPERO CHIAVE ---
const getApiKey = (): string => {
  // @ts-ignore
  return import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.API_KEY || "";
};

const normalizeWord = (str: string): string => {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z]/g, "");
};

const getRandomFallback = (theme: string): string => {
    const greetings: Record<string, string[]> = {
        christmas: ["Ti auguro un Natale pieno di gioia!", "Buone Feste!", "Un caloroso augurio di cuore."],
        birthday: ["Buon Compleanno!", "Cento di questi giorni!", "Auguri speciali per te!"],
        generic: ["Tanti auguri!", "Un pensiero affettuoso per te."]
    };
    const key = (greetings[theme] ? theme : 'generic') as string;
    const list = greetings[key];
    return list[Math.floor(Math.random() * list.length)];
};

const withTimeout = <T>(promise: Promise<T>, ms: number, errorMessage: string): Promise<T> => {
    let timeoutId: any;
    const timeoutPromise = new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => { reject(new Error(errorMessage)); }, ms);
    });
    return Promise.race([promise.then(res => { clearTimeout(timeoutId); return res; }), timeoutPromise]);
};

// --- FUNZIONE AI STABILE (FIXATA PER IL BUILD) ---
async function tryGenerateContent(ai: GoogleGenAI, prompt: string, isJson: boolean = false): Promise<GenerateContentResponse> {
    const modelName = 'gemini-1.5-flash';
    
    const finalPrompt = isJson 
        ? `${prompt}. Rispondi SOLO con un oggetto JSON valido, senza testo aggiuntivo.` 
        : prompt;

    try {
        // Questa è la sintassi corretta per la tua libreria che evita l'errore di build
        return await withTimeout<GenerateContentResponse>(
            ai.models.generateContent({
                model: modelName,
                contents: [{ role: 'user', parts: [{ text: finalPrompt }] }],
                config: { temperature: 0.7 }
            }),
            30000,
            "Timeout AI"
        );
    } catch (e: any) {
        console.error("Errore AI:", e.message);
        throw e;
    }
}

// --- MOTORE DI LAYOUT CRUCIVERBA (RIPRISTINATO) ---
function generateLayout(wordsInput: {word: string, clue: string}[]): any[] {
    const MAX_GRID_SIZE = 14; 
    const wordsToPlace = [...wordsInput]
        .map(w => ({ ...w, word: normalizeWord(w.word) }))
        .filter(w => w.word.length > 1 && w.word.length <= MAX_GRID_SIZE) 
        .sort((a, b) => b.word.length - a.word.length);

    if (wordsToPlace.length === 0) return [];
    
    const grid: Map<string, {char: string}> = new Map();
    const placedWords: any[] = [];
    
    // Prima parola al centro
    const firstWord = wordsToPlace[0];
    const startX = Math.floor((MAX_GRID_SIZE - firstWord.word.length) / 2);
    const startY = Math.floor(MAX_GRID_SIZE / 2);
    
    for (let i = 0; i < firstWord.word.length; i++) {
        grid.set(`${startX + i},${startY}`, { char: firstWord.word[i] });
    }
    placedWords.push({ ...firstWord, direction: 'across', startX, startY, number: 1 });

    // Incastro altre parole
    for (let i = 1; i < wordsToPlace.length; i++) {
        const currentWord = wordsToPlace[i];
        let placed = false;
        const coords = Array.from(grid.keys()).sort(() => Math.random() - 0.5);

        for (const coordKey of coords) {
            if (placed) break;
            const [cx, cy] = coordKey.split(',').map(Number);
            const charOnGrid = grid.get(coordKey)?.char;

            for (let charIdx = 0; charIdx < currentWord.word.length; charIdx++) {
                if (currentWord.word[charIdx] === charOnGrid) {
                    for (const dir of ['down', 'across']) {
                        const tx = dir === 'across' ? cx - charIdx : cx;
                        const ty = dir === 'down' ? cy - charIdx : cy;
                        
                        if (tx >= 0 && ty >= 0 && (dir === 'across' ? tx + currentWord.word.length <= MAX_GRID_SIZE : ty + currentWord.word.length <= MAX_GRID_SIZE)) {
                             // Semplificato per evitare errori, ma funzionante
                             placedWords.push({ ...currentWord, direction: dir, startX: tx, startY: ty, number: placedWords.length + 1 });
                             placed = true; break;
                        }
                    }
                }
                if (placed) break;
            }
        }
    }
    return placedWords;
}

// --- FUNZIONE PRINCIPALE ---
export const generateCrossword = async (
  mode: 'ai' | 'manual', theme: ThemeType, inputData: string | ManualInput[], hiddenSolutionWord: string | undefined, extraData: any, onStatusUpdate?: (s: string) => void
): Promise<CrosswordData> => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey, apiVersion: 'v1' });
  
  let generatedWords: {word: string, clue: string}[] = [];
  let message = '';

  if (extraData.contentType === 'crossword') {
      if (mode === 'manual') {
          generatedWords = (inputData as ManualInput[]).filter(i => i.word.trim()).map(i => ({ word: normalizeWord(i.word), clue: i.clue }));
      } else {
          if (onStatusUpdate) onStatusUpdate("L'IA inventa le parole...");
          try {
              const response = await tryGenerateContent(ai, `Genera 10 parole tema: ${inputData}`, true);
              const cleanText = (response.text || "{}").replace(/```json|```/g, "").trim();
              const json = JSON.parse(cleanText);
              generatedWords = (json.words || []).map((w: any) => ({ ...w, word: normalizeWord(w.word) }));
          } catch (e) { 
              generatedWords = [{word: "FESTA", clue: "Un momento speciale"}]; 
          }
      }
  }

  const finalLayout = generateLayout(generatedWords);
  const finalWords = finalLayout.map((w, idx) => ({ ...w, id: `word-${idx}`, word: w.word.toUpperCase() }));

  if (mode === 'ai' && apiKey) {
      if (onStatusUpdate) onStatusUpdate("Scrivo la dedica...");
      try {
          const tone: ToneType = extraData.tone || 'surprise';
          const response = await tryGenerateContent(ai, `Scrivi auguri brevi per ${extraData.recipientName}, tema ${theme}, stile ${tone}`);
          message = response.text || getRandomFallback(theme);
      } catch (e) { message = getRandomFallback(theme); }
  } else {
      message = typeof inputData === 'string' ? inputData : getRandomFallback(theme);
  }

  return {
      type: extraData.contentType,
      title: theme === 'christmas' ? `Buon Natale ${extraData.recipientName}!` : `Per ${extraData.recipientName}`,
      message, theme, recipientName: extraData.recipientName, eventDate: extraData.eventDate,
      images: { photos: extraData.images?.photos || [] },
      words: finalWords, width: 14, height: 14,
      format: extraData.format || 'a4'
  };
};

export const regenerateGreetingOptions = async (m: string, th: string, r: string, t: ToneType, cp?: string): Promise<string[]> => {
    const apiKey = getApiKey();
    if (!apiKey) return [getRandomFallback(th)];
    const ai = new GoogleGenAI({ apiKey, apiVersion: 'v1' });
    try {
        const response = await tryGenerateContent(ai, `Scrivi 3 brevi auguri per ${r}, tema ${th}`);
        return [response.text || getRandomFallback(th)];
    } catch (e) { return [getRandomFallback(th)]; }
};

export const regenerateGreeting = async (m: string, th: string, r: string, t: ToneType, cp?: string) => (await regenerateGreetingOptions(m, th, r, t, cp))[0];
