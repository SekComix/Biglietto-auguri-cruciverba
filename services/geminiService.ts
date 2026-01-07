import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { CrosswordData, ManualInput, ThemeType, ToneType, CardFormat } from '../types';

// --- CONFIGURAZIONE CHIAVE ---
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

// --- FUNZIONE AI (VERSIONE BILLING STABILE) ---
async function tryGenerateContent(ai: GoogleGenAI, prompt: string, isJson: boolean = false): Promise<any> {
    const model = ai.models.get({ model: "gemini-1.5-flash" });
    const finalPrompt = isJson ? `${prompt}. Rispondi solo in formato JSON puro: { "words": [{ "word": "...", "clue": "..." }] }` : prompt;

    try {
        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: finalPrompt }] }],
            generationConfig: { temperature: 0.7 }
        });
        return result.response;
    } catch (e: any) {
        console.error("Errore AI:", e.message);
        throw e;
    }
}

// --- MOTORE DI LAYOUT CRUCIVERBA (LOGICA COMPLETA) ---
function generateLayout(wordsInput: {word: string, clue: string}[]): any[] {
    const MAX_GRID_SIZE = 14; 
    const wordsToPlace = [...wordsInput]
        .map(w => ({ ...w, word: normalizeWord(w.word) }))
        .filter(w => w.word.length > 1 && w.word.length <= MAX_GRID_SIZE) 
        .sort((a, b) => b.word.length - a.word.length);

    if (wordsToPlace.length === 0) return [];
    
    const grid: Map<string, {char: string}> = new Map();
    const placedWords: any[] = [];
    
    // Posizionamento prima parola
    const firstWord = wordsToPlace[0];
    const startX = Math.floor((MAX_GRID_SIZE - firstWord.word.length) / 2);
    const startY = Math.floor(MAX_GRID_SIZE / 2);
    
    for (let i = 0; i < firstWord.word.length; i++) {
        grid.set(`${startX + i},${startY}`, { char: firstWord.word[i] });
    }
    placedWords.push({ ...firstWord, direction: 'across', startX, startY, number: 1 });

    // Incastro delle altre parole
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
                        
                        if (isValidPlacement(grid, currentWord.word, tx, ty, dir, MAX_GRID_SIZE)) {
                            for (let j = 0; j < currentWord.word.length; j++) {
                                const gx = dir === 'across' ? tx + j : tx;
                                const gy = dir === 'down' ? ty + j : ty;
                                grid.set(`${gx},${gy}`, { char: currentWord.word[j] });
                            }
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

function isValidPlacement(grid: Map<string, {char: string}>, word: string, startX: number, startY: number, dir: string, max: number): boolean {
    if (startX < 0 || startY < 0) return false;
    if (dir === 'across' && startX + word.length > max) return false;
    if (dir === 'down' && startY + word.length > max) return false;

    for (let i = 0; i < word.length; i++) {
        const x = dir === 'across' ? startX + i : startX;
        const y = dir === 'down' ? startY + i : startY;
        const existing = grid.get(`${x},${y}`);
        if (existing && existing.char !== word[i]) return false;
    }
    return true;
}

// --- FUNZIONE GENERATORE PRINCIPALE ---
export const generateCrossword = async (
  mode: 'ai' | 'manual', theme: ThemeType, inputData: string | ManualInput[], hiddenSolutionWord: string | undefined, extraData: any, onStatusUpdate?: (s: string) => void
): Promise<CrosswordData> => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey, apiVersion: 'v1' });
  
  let generatedWords: {word: string, clue: string}[] = [];
  let message = '';

  // 1. Ottenimento parole
  if (extraData.contentType === 'crossword') {
      if (mode === 'manual') {
          generatedWords = (inputData as ManualInput[]).filter(i => i.word.trim()).map(i => ({ word: normalizeWord(i.word), clue: i.clue }));
      } else {
          if (onStatusUpdate) onStatusUpdate("L'IA inventa le parole...");
          try {
              const response = await tryGenerateContent(ai, `Genera 10 parole tema: ${inputData}`, true);
              const cleanText = (response.text() || "{}").replace(/```json|```/g, "").trim();
              const json = JSON.parse(cleanText);
              generatedWords = (json.words || []).map((w: any) => ({ ...w, word: normalizeWord(w.word) }));
          } catch (e) { 
              generatedWords = [{word: "FESTA", clue: "Momento di gioia"}]; 
          }
      }
  }

  // 2. Calcolo Layout
  const rawLayout = generateLayout(generatedWords);
  let minX = 14, minY = 14, maxX = 0, maxY = 0;
  rawLayout.forEach(w => {
        const endX = w.direction === 'across' ? w.startX + w.word.length : w.startX + 1;
        const endY = w.direction === 'down' ? w.startY + w.word.length : w.startY + 1;
        minX = Math.min(minX, w.startX); minY = Math.min(minY, w.startY);
        maxX = Math.max(maxX, endX); maxY = Math.max(maxY, endY);
  });
  
  const finalWords = rawLayout.map((w, idx) => ({ 
      ...w, id: `word-${idx}`, word: w.word.toUpperCase(), 
      startX: w.startX - minX + 1, startY: w.startY - minY + 1 
  }));

  // 3. Dedica AI
  if (mode === 'ai' && apiKey) {
      if (onStatusUpdate) onStatusUpdate("Scrivo la dedica...");
      try {
          const tone: ToneType = extraData.tone || 'surprise';
          const response = await tryGenerateContent(ai, `Scrivi un breve augurio per ${extraData.recipientName}, tema ${theme}, stile ${tone}`);
          message = response.text() || "Tanti auguri!";
      } catch (e) { message = "Tanti auguri!"; }
  } else {
      message = typeof inputData === 'string' ? inputData : "Tanti auguri!";
  }

  return {
      type: extraData.contentType,
      title: theme === 'christmas' ? `Buon Natale ${extraData.recipientName}!` : `Per ${extraData.recipientName}`,
      message, theme, recipientName: extraData.recipientName, eventDate: extraData.eventDate,
      images: { photos: extraData.images?.photos || [] },
      words: finalWords, width: (maxX - minX) + 2, height: (maxY - minY) + 2,
      format: extraData.format || 'a4'
  };
};

export const regenerateGreetingOptions = async (m: string, th: string, r: string, t: ToneType, cp?: string): Promise<string[]> => {
    const apiKey = getApiKey();
    if (!apiKey) return ["Auguri!"];
    const ai = new GoogleGenAI({ apiKey, apiVersion: 'v1' });
    try {
        const response = await tryGenerateContent(ai, `Scrivi 5 auguri brevi per ${r}, tema ${th}`);
        return [response.text() || "Auguri!"];
    } catch (e) { return ["Auguri!"]; }
};

export const regenerateGreeting = async (m: string, th: string, r: string, t: ToneType, cp?: string) => (await regenerateGreetingOptions(m, th, r, t, cp))[0];
