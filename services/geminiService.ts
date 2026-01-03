import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { CrosswordData, ManualInput, ThemeType, ToneType, CardFormat } from '../types';

const wordListSchema = {
  type: Type.OBJECT,
  properties: {
    words: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          word: { type: Type.STRING },
          clue: { type: Type.STRING }
        },
        required: ["word", "clue"]
      }
    }
  },
  required: ["words"]
};

const getApiKey = (): string => {
  // @ts-ignore
  return import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.API_KEY || "";
};

const normalizeWord = (str: string): string => {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z]/g, "");
};

const FALLBACK_GREETINGS: Record<string, string[]> = {
    christmas: ["Ti auguro un Natale pieno di gioia!", "Che la magia delle feste sia con te.", "Sotto l'albero tanta felicità."],
    birthday: ["Buon Compleanno!", "Cento di questi giorni!", "Auguri di cuore!"],
    generic: ["Tanti auguri!", "Un pensiero speciale per te."]
};

const getRandomFallback = (theme: string): string => {
    const keys = Object.keys(FALLBACK_GREETINGS);
    const key = keys.includes(theme) ? theme : 'generic';
    return FALLBACK_GREETINGS[key][Math.floor(Math.random() * FALLBACK_GREETINGS[key].length)];
};

const withTimeout = <T>(promise: Promise<T>, ms: number, errorMessage: string): Promise<T> => {
    let timeoutId: any;
    const timeoutPromise = new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => { reject(new Error(errorMessage)); }, ms);
    });
    return Promise.race([promise.then(res => { clearTimeout(timeoutId); return res; }), timeoutPromise]);
};

// --- LOGICA MODELLI AI (FORZATA SU FLASH PER EVITARE 404) ---
async function tryGenerateContent(ai: GoogleGenAI, prompt: string, schema: any = null): Promise<GenerateContentResponse> {
    // Abbiamo rimosso 'gemini-1.5-pro' perché ti causa l'errore 404
    const modelsToTry = [
        'gemini-1.5-flash', 
        'gemini-1.5-flash-latest', 
        'gemini-2.0-flash-exp'
    ];
    
    let lastError = null;
    for (const modelName of modelsToTry) {
        try {
            const config: any = { temperature: 0.7 };
            if (schema) {
                config.responseMimeType = "application/json";
                config.responseSchema = schema;
            }

            const response = await withTimeout<GenerateContentResponse>(
                ai.models.generateContent({
                    model: modelName,
                    contents: prompt,
                    config: config
                }),
                30000,
                "Timeout AI"
            );
            return response;
        } catch (e: any) {
            lastError = e;
            // Se è un errore di quota, aspetta, altrimenti prova subito il prossimo modello Flash
            if (e?.message?.includes('429')) {
                await new Promise(r => setTimeout(r, 2000));
            }
        }
    }
    throw lastError || new Error("AI non disponibile.");
}

// --- LOGICA CRUCIVERBA ---
function generateLayout(wordsInput: {word: string, clue: string}[]): any[] {
    const MAX_GRID_SIZE = 14; 
    const wordsToPlace = [...wordsInput].map(w => ({ ...w, word: normalizeWord(w.word) })).filter(w => w.word.length > 1 && w.word.length <= MAX_GRID_SIZE).sort((a, b) => b.word.length - a.word.length);
    if (wordsToPlace.length === 0) return [];
    const grid: Map<string, {char: string}> = new Map();
    const placedWords: any[] = [];
    const firstWord = wordsToPlace[0];
    const startX = Math.floor(MAX_GRID_SIZE / 2) - Math.floor(firstWord.word.length / 2);
    const startY = Math.floor(MAX_GRID_SIZE / 2);
    placeWordOnGrid(grid, firstWord.word, startX, startY, 'across');
    placedWords.push({ ...firstWord, direction: 'across', startX, startY, number: 1 });
    for (let i = 1; i < wordsToPlace.length; i++) {
        const currentWord = wordsToPlace[i];
        let placed = false;
        const occupiedCoords = Array.from(grid.keys()).sort(() => Math.random() - 0.5);
        for (const coordKey of occupiedCoords) {
            if (placed) break;
            const [cx, cy] = coordKey.split(',').map(Number);
            const charOnGrid = grid.get(coordKey)?.char;
            for (let charIdx = 0; charIdx < currentWord.word.length; charIdx++) {
                if (currentWord.word[charIdx] === charOnGrid) {
                    for (const dir of ['down', 'across']) {
                        const testX = dir === 'across' ? cx - charIdx : cx;
                        const testY = dir === 'down' ? cy - charIdx : cy;
                        if (isWithinBounds(testX, testY, currentWord.word.length, dir, MAX_GRID_SIZE) && isValidPlacement(grid, currentWord.word, testX, testY, dir)) {
                            placeWordOnGrid(grid, currentWord.word, testX, testY, dir);
                            placedWords.push({ ...currentWord, direction: dir, startX: testX, startY: testY, number: placedWords.length + 1 });
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
function isWithinBounds(x: number, y: number, len: number, dir: string, max: number) { return x>=0 && y>=0 && (dir==='across'?x+len<=max && y<max : x<max && y+len<=max); }
function isValidPlacement(grid: Map<string, {char: string}>, word: string, startX: number, startY: number, direction: string) {
    for (let i = 0; i < word.length; i++) {
        const x = direction === 'across' ? startX + i : startX;
        const y = direction === 'down' ? startY + i : startY;
        const existing = grid.get(`${x},${y}`);
        if (existing && existing.char !== word[i]) return false;
        if (!existing) {
            if (direction === 'across') { if (grid.has(`${x},${y-1}`) || grid.has(`${x},${y+1}`)) return false; }
            else { if (grid.has(`${x-1},${y}`) || grid.has(`${x+1},${y}`)) return false; }
        }
    }
    return true;
}
function placeWordOnGrid(grid: Map<string, {char: string}>, word: string, startX: number, startY: number, direction: string) {
    for (let i = 0; i < word.length; i++) {
        const x = direction === 'across' ? startX + i : startX;
        const y = direction === 'down' ? startY + i : startY;
        grid.set(`${x},${y}`, { char: word[i] });
    }
}

// --- RICERCA SOLUZIONE ---
const findSolutionInGrid = (words: any[], hiddenWord: string): any => {
    if (!hiddenWord) return undefined; 
    const cleanTarget = normalizeWord(hiddenWord);
    const availablePositions: Record<string, {x: number, y: number, wordIndex: number}[]> = {};
    words.forEach((w, wIdx) => {
        for(let i=0; i<w.word.length; i++) {
            const char = w.word[i];
            const x = w.direction === 'across' ? w.startX + i : w.startX;
            const y = w.direction === 'down' ? w.startY + i : w.startY;
            if (!availablePositions[char]) availablePositions[char] = [];
            availablePositions[char].push({ x, y, wordIndex: wIdx });
        }
    });
    const solutionCells: any[] = [];
    const usedCoords = new Set<string>();
    const usedWordIndices = new Set<number>();
    for (const char of cleanTarget.split('')) {
        const candidates = (availablePositions[char] || []).filter(c => !usedCoords.has(`${c.x},${c.y}`));
        if (candidates.length === 0) return undefined;
        let best = candidates.find(c => !usedWordIndices.has(c.wordIndex)) || candidates[0];
        solutionCells.push({ x: best.x, y: best.y, char, index: solutionCells.length });
        usedCoords.add(`${best.x},${best.y}`);
        usedWordIndices.add(best.wordIndex);
    }
    return { word: cleanTarget, original: hiddenWord.toUpperCase(), cells: solutionCells };
};

// --- FUNZIONE GENERATE CROSSWORD ---
export const generateCrossword = async (
  mode: 'ai' | 'manual', theme: ThemeType, inputData: string | ManualInput[], hiddenSolutionWord: string | undefined, extraData: any, onStatusUpdate?: (s: string) => void
): Promise<CrosswordData> => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });
  let generatedWords: {word: string, clue: string}[] = [];
  let message = '';

  if (extraData.contentType === 'crossword') {
      if (mode === 'manual') {
          generatedWords = (inputData as ManualInput[]).filter(i => i.word.trim()).map(i => ({ word: normalizeWord(i.word), clue: i.clue }));
      } else {
          if (onStatusUpdate) onStatusUpdate("L'IA inventa le parole...");
          const response = await tryGenerateContent(ai, `Genera 10 parole tema: ${inputData}. JSON {words:[{word,clue}]}`, wordListSchema);
          generatedWords = JSON.parse(response.text || "{}").words.map((w: any) => ({ ...w, word: normalizeWord(w.word) }));
      }
  }

  const rawLayout = generateLayout(generatedWords);
  let minX = 14, minY = 14, maxX = 0, maxY = 0;
  rawLayout.forEach(w => {
        const endX = w.direction === 'across' ? w.startX + w.word.length : w.startX + 1;
        const endY = w.direction === 'down' ? w.startY + w.word.length : w.startY + 1;
        minX = Math.min(minX, w.startX); minY = Math.min(minY, w.startY);
        maxX = Math.max(maxX, endX); maxY = Math.max(maxY, endY);
  });
  const finalWords = rawLayout.map((w, idx) => ({ ...w, id: `word-${idx}`, word: w.word.toUpperCase(), startX: w.startX - minX + 1, startY: w.startY - minY + 1 }));

  if (mode === 'ai' && apiKey) {
      if (onStatusUpdate) onStatusUpdate("Scrivo la dedica...");
      try {
          message = await regenerateGreeting(inputData as string, theme, extraData.recipientName, extraData.tone, extraData.customTone);
      } catch (e) { message = typeof inputData === 'string' ? inputData : getRandomFallback(theme); }
  } else {
      message = typeof inputData === 'string' ? inputData : getRandomFallback(theme);
  }

  return {
      type: extraData.contentType,
      title: theme === 'christmas' ? `Buon Natale ${extraData.recipientName}!` : `Per ${extraData.recipientName}`,
      message, theme, recipientName: extraData.recipientName, eventDate: extraData.eventDate,
      images: { photos: extraData.images?.photos || [] },
      words: finalWords, width: (maxX - minX) + 2, height: (maxY - minY) + 2,
      solution: hiddenSolutionWord ? findSolutionInGrid(finalWords, hiddenSolutionWord) : undefined,
      format: extraData.format || 'a4'
  };
};

export const regenerateGreetingOptions = async (msg: string, theme: string, recipient: string, tone: ToneType, customPrompt?: string): Promise<string[]> => {
    const apiKey = getApiKey();
    if (!apiKey) return [getRandomFallback(theme)];
    try {
        const inst = tone === 'custom' && customPrompt ? `Istruzioni: ${customPrompt}` : `Stile: ${tone}`;
        const response = await tryGenerateContent(new GoogleGenAI({ apiKey }), `Scrivi 5 auguri per ${recipient}, tema ${theme}, ${inst}. JSON {options:[]}`);
        return JSON.parse(response.text || "{}").options || [getRandomFallback(theme)];
    } catch (e) { return [getRandomFallback(theme)]; }
};

export const regenerateGreeting = async (m: string, th: string, r: string, t: ToneType, cp?: string) => (await regenerateGreetingOptions(m, th, r, t, cp))[0];
