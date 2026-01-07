import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { CrosswordData, ManualInput, ThemeType, ToneType, CardFormat } from '../types';

// --- SCHEMI PER L'AI (Garantiscono che l'AI risponda nel formato giusto) ---
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

const greetingSchema = {
  type: Type.OBJECT,
  properties: {
    options: {
      type: Type.ARRAY,
      items: { type: Type.STRING }
    }
  },
  required: ["options"]
};

// --- FUNZIONI DI SERVIZIO ---
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

// --- IL MOTORE AI (BILLING V1 + PULIZIA TESTO) ---
async function tryGenerateContent(ai: GoogleGenAI, prompt: string, schema: any = null): Promise<GenerateContentResponse> {
    const modelName = 'gemini-1.5-flash';
    try {
        const config: any = { temperature: 0.8 };
        if (schema) {
            config.responseMimeType = "application/json";
            config.responseSchema = schema;
        }

        return await withTimeout<GenerateContentResponse>(
            ai.models.generateContent({
                model: modelName,
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                config: config
            }),
            35000,
            "L'AI sta impiegando troppo tempo."
        );
    } catch (e: any) {
        if (e?.message?.includes('429')) await new Promise(r => setTimeout(r, 2000));
        throw e;
    }
}

// --- IL TUO MOTORE DI LAYOUT ORIGINALE (INTEGRALE) ---
function generateLayout(wordsInput: {word: string, clue: string}[]): any[] {
    const MAX_GRID_SIZE = 14;
    const wordsToPlace = [...wordsInput]
        .map(w => ({ ...w, word: normalizeWord(w.word) }))
        .filter(w => w.word.length > 1 && w.word.length <= MAX_GRID_SIZE)
        .sort((a, b) => b.word.length - a.word.length);

    if (wordsToPlace.length === 0) return [];
    const grid: Map<string, {char: string}> = new Map();
    const placedWords: any[] = [];
    
    const firstWord = wordsToPlace[0];
    const startX = Math.floor((MAX_GRID_SIZE - firstWord.word.length) / 2);
    const startY = Math.floor(MAX_GRID_SIZE / 2);
    for (let i = 0; i < firstWord.word.length; i++) grid.set(`${startX + i},${startY}`, { char: firstWord.word[i] });
    placedWords.push({ ...firstWord, direction: 'across', startX, startY, number: 1 });

    for (let i = 1; i < wordsToPlace.length; i++) {
        const currentWord = wordsToPlace[i];
        let placed = false;
        const coords = Array.from(grid.keys()).sort(() => Math.random() - 0.5);
        for (const key of coords) {
            if (placed) break;
            const [cx, cy] = key.split(',').map(Number);
            const charOnGrid = grid.get(key)?.char;
            for (let charIdx = 0; charIdx < currentWord.word.length; charIdx++) {
                if (currentWord.word[charIdx] === charOnGrid) {
                    for (const dir of ['down', 'across']) {
                        const tx = dir === 'across' ? cx - charIdx : cx;
                        const ty = dir === 'down' ? cy - charIdx : cy;
                        if (tx >= 0 && ty >= 0 && (dir === 'across' ? tx + currentWord.word.length <= MAX_GRID_SIZE : ty + currentWord.word.length <= MAX_GRID_SIZE)) {
                            if (isValidPlacement(grid, currentWord.word, tx, ty, dir)) {
                                for (let j = 0; j < currentWord.word.length; j++) {
                                    grid.set(dir === 'across' ? `${tx+j},${ty}` : `${tx},${ty+j}`, { char: currentWord.word[j] });
                                }
                                placedWords.push({ ...currentWord, direction: dir, startX: tx, startY: ty, number: placedWords.length + 1 });
                                placed = true; break;
                            }
                        }
                    }
                }
                if (placed) break;
            }
        }
    }
    return placedWords;
}

function isValidPlacement(grid: Map<string, {char: string}>, word: string, startX: number, startY: number, direction: string): boolean {
    for (let i = 0; i < word.length; i++) {
        const x = direction === 'across' ? startX + i : startX;
        const y = direction === 'down' ? startY + i : startY;
        const existing = grid.get(`${x},${y}`);
        if (existing && existing.char !== word[i]) return false;
    }
    return true;
}

function normalizeCoordinates(placedWords: any[]) {
    if (placedWords.length === 0) return { words: [], width: 10, height: 10 };
    let minX = 14, minY = 14, maxX = 0, maxY = 0;
    placedWords.forEach(w => {
        const endX = w.direction === 'across' ? w.startX + w.word.length : w.startX + 1;
        const endY = w.direction === 'down' ? w.startY + w.word.length : w.startY + 1;
        minX = Math.min(minX, w.startX); minY = Math.min(minY, w.startY);
        maxX = Math.max(maxX, endX); maxY = Math.max(maxY, endY);
    });
    return { words: placedWords.map(w => ({ ...w, startX: w.startX - minX + 1, startY: w.startY - minY + 1 })), width: (maxX - minX) + 2, height: (maxY - minY) + 2 };
}

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
    for (let i = 0; i < cleanTarget.length; i++) {
        const char = cleanTarget[i];
        const candidates = (availablePositions[char] || []).filter(c => !usedCoords.has(`${c.x},${c.y}`));
        if (candidates.length === 0) return undefined;
        let best = candidates.find(c => !usedWordIndices.has(c.wordIndex)) || candidates[0];
        solutionCells.push({ x: best.x, y: best.y, char, index: i });
        usedCoords.add(`${best.x},${best.y}`);
        usedWordIndices.add(best.wordIndex);
    }
    return { word: cleanTarget, original: hiddenWord.toUpperCase(), cells: solutionCells };
};

// --- FUNZIONE GENERATORE PRINCIPALE ---
export const generateCrossword = async (
  mode: 'ai' | 'manual', theme: ThemeType, inputData: string | ManualInput[], hiddenSolutionWord: string | undefined, extraData: any, onStatusUpdate?: (status: string) => void
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
          const prompt = `Genera 10 parole e definizioni tema: "${inputData}" in ITALIANO. JSON {words:[{word,clue}]}`;
          const response = await tryGenerateContent(ai, prompt, wordListSchema);
          generatedWords = JSON.parse(response.text || "{}").words.map((w: any) => ({ ...w, word: normalizeWord(w.word) }));
      }
  }

  const rawLayout = generateLayout(generatedWords);
  const normalized = normalizeCoordinates(rawLayout);
  const finalWords = normalized.words.map((w, idx) => ({ ...w, id: `word-${idx}`, word: w.word.toUpperCase() }));
  const solution = hiddenSolutionWord ? findSolutionInGrid(finalWords, hiddenSolutionWord) : undefined;

  if (mode === 'ai' && apiKey) {
      if (onStatusUpdate) onStatusUpdate("Scrivo la dedica...");
      message = await regenerateGreeting(inputData as string, theme, extraData.recipientName, extraData.tone || 'surprise', extraData.customTone);
  } else {
      message = typeof inputData === 'string' ? inputData : "Tanti auguri!";
  }

  return {
      type: extraData.contentType,
      title: theme === 'christmas' ? `Buon Natale ${extraData.recipientName}!` : `Per ${extraData.recipientName}`,
      message, theme, recipientName: extraData.recipientName, eventDate: extraData.eventDate,
      images: { photos: extraData.images?.photos || [] },
      words: finalWords, width: normalized.width, height: normalized.height,
      solution, format: extraData.format || 'a4'
  };
};

export const regenerateGreetingOptions = async (msg: string, theme: string, recipient: string, tone: ToneType, customPrompt?: string): Promise<string[]> => {
    const apiKey = getApiKey();
    if (!apiKey) return ["Auguri di cuore!"];
    const ai = new GoogleGenAI({ apiKey, apiVersion: 'v1' });
    try {
        const inst = tone === 'custom' && customPrompt ? `Istruzioni: ${customPrompt}` : `Stile: ${tone}`;
        const prompt = `Scrivi 5 auguri brevi in ITALIANO per ${recipient}, tema ${theme}, ${inst}. JSON {options:[]}`;
        const response = await tryGenerateContent(ai, prompt, greetingSchema);
        const json = JSON.parse(response.text || "{}");
        return json.options && json.options.length > 0 ? json.options : ["Auguri di cuore!"];
    } catch (e) { return ["Auguri di cuore!"]; }
};

export const regenerateGreeting = async (m: string, th: string, r: string, t: ToneType, cp?: string) => (await regenerateGreetingOptions(m, th, r, t, cp))[0];
