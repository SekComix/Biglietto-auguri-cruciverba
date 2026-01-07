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

// --- MOTORE AI (VERSIONE STABILE V1) ---
async function tryGenerateContent(ai: GoogleGenAI, prompt: string, schema: any = null): Promise<GenerateContentResponse> {
    const modelName = 'gemini-1.5-flash';
    try {
        const finalPrompt = schema ? `${prompt}. Rispondi in JSON.` : prompt;
        return await withTimeout<GenerateContentResponse>(
            ai.models.generateContent({
                model: modelName,
                contents: [{ role: 'user', parts: [{ text: finalPrompt }] }],
                config: { temperature: 0.7 }
            }),
            35000,
            "Timeout AI"
        );
    } catch (e: any) {
        if (e?.message?.includes('429')) await new Promise(r => setTimeout(r, 2000));
        throw e;
    }
}

// --- MOTORE DI LAYOUT (IL TUO ORIGINALE PERFETTO) ---
function generateLayout(wordsInput: {word: string, clue: string}[]): any[] {
    const MAX_GRID_SIZE = 14;
    const wordsToPlace = [...wordsInput].map(w => ({ ...w, word: normalizeWord(w.word) })).filter(w => w.word.length > 1 && w.word.length <= MAX_GRID_SIZE).sort((a, b) => b.word.length - a.word.length);
    if (wordsToPlace.length === 0) return [];
    const grid: Map<string, {char: string}> = new Map();
    const placedWords: any[] = [];
    const firstWord = wordsToPlace[0];
    const startX = Math.floor(MAX_GRID_SIZE / 2) - Math.floor(firstWord.word.length / 2);
    const startY = Math.floor(MAX_GRID_SIZE / 2);
    for (let i = 0; i < firstWord.word.length; i++) { grid.set(`${startX + i},${startY}`, { char: firstWord.word[i] }); }
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

// --- FIX ANTI-PAGINA NERA (MOLTO IMPORTANTE) ---
function normalizeCoordinates(placedWords: any[]) {
    if (placedWords.length === 0) return { words: [], width: 10, height: 10 };
    // Inizializziamo con valori reali invece di Infinity per evitare crash
    let minX = 14, minY = 14, maxX = 0, maxY = 0;
    placedWords.forEach(w => {
        const endX = w.direction === 'across' ? w.startX + w.word.length : w.startX + 1;
        const endY = w.direction === 'down' ? w.startY + w.word.length : w.startY + 1;
        minX = Math.min(minX, w.startX); minY = Math.min(minY, w.startY);
        maxX = Math.max(maxX, endX); maxY = Math.max(maxY, endY);
    });
    // Se il calcolo fallisce, usiamo 10 come default
    const width = isFinite(maxX - minX) ? (maxX - minX) + 2 : 10;
    const height = isFinite(maxY - minY) ? (maxY - minY) + 2 : 10;
    return { words: placedWords.map(w => ({ ...w, startX: w.startX - minX + 1, startY: w.startY - minY + 1 })), width, height };
}

function reindexGridNumbering(words: any[]) {
    const startPoints: {x: number, y: number}[] = [];
    const pointsSet = new Set<string>();
    words.forEach(w => {
        const key = `${w.startX},${w.startY}`;
        if (!pointsSet.has(key)) { pointsSet.add(key); startPoints.push({ x: w.startX, y: w.startY }); }
    });
    startPoints.sort((a, b) => (a.y !== b.y) ? a.y - b.y : a.x - b.x);
    const map = new Map();
    startPoints.forEach((p, i) => map.set(`${p.x},${p.y}`, i + 1));
    return words.map(w => ({ ...w, number: map.get(`${w.startX},${w.startY}`) })).sort((a,b) => a.number - b.number); 
}

const findSolutionInGrid = (words: any[], hiddenWord: string): any => {
    if (!hiddenWord) return undefined; 
    const cleanTarget = normalizeWord(hiddenWord);
    const targetChars = cleanTarget.split('');
    const solutionCells: any[] = [];
    const usedCoords = new Set<string>();
    const available: Record<string, {x: number, y: number, wordIndex: number}[]> = {};
    words.forEach((w, wIdx) => {
        for(let i=0; i<w.word.length; i++) {
            const char = w.word[i];
            const x = w.direction === 'across' ? w.startX + i : w.startX;
            const y = w.direction === 'down' ? w.startY + i : w.startY;
            if (!available[char]) available[char] = [];
            available[char].push({ x, y, wordIndex: wIdx });
        }
    });
    const usedIndices = new Set<number>();
    for (let i = 0; i < targetChars.length; i++) {
        const char = targetChars[i];
        const candidates = (available[char] || []).filter(c => !usedCoords.has(`${c.x},${c.y}`));
        if (candidates.length === 0) return undefined;
        let best = candidates.find(c => !usedIndices.has(c.wordIndex)) || candidates[0];
        solutionCells.push({ x: best.x, y: best.y, char, index: i });
        usedCoords.add(`${best.x},${best.y}`);
        usedIndices.add(best.wordIndex);
    }
    return { word: cleanTarget, original: hiddenWord.toUpperCase(), cells: solutionCells };
};

// --- FUNZIONE GENERATORE PRINCIPALE ---
export const generateCrossword = async (
  mode: 'ai' | 'manual',
  theme: ThemeType,
  inputData: string | ManualInput[],
  hiddenSolutionWord: string | undefined,
  extraData: {
    recipientName: string;
    eventDate: string;
    images?: { extraImage?: string; photos?: string[]; photo?: string; brandLogo?: string }; 
    stickers?: string[];
    contentType: 'crossword' | 'simple';
    tone?: ToneType;
    customTone?: string;
    format?: CardFormat; 
    hasWatermark?: boolean; 
  },
  onStatusUpdate?: (status: string) => void
): Promise<CrosswordData> => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey, apiVersion: 'v1' });
  
  let generatedWords: {word: string, clue: string}[] = [];
  let finalWords: any[] = [];
  let width = 10, height = 10;
  let calculatedSolution = undefined;
  let message = '';

  if (extraData.contentType === 'crossword') {
      if (mode === 'manual') {
          const inputs = inputData as ManualInput[];
          generatedWords = inputs.filter(i => i.word.trim() && i.clue.trim()).map(i => ({ word: normalizeWord(i.word), clue: i.clue }));
      } else {
          if (onStatusUpdate) onStatusUpdate("L'IA inventa le parole...");
          try {
            const prompt = `Genera 10 parole e definizioni per cruciverba tema: "${inputData}". Rispondi in JSON: { "words": [{ "word": "...", "clue": "..." }] }`;
            const response = await tryGenerateContent(ai, prompt, wordListSchema);
            const json = JSON.parse(response?.text?.replace(/```json|```/g, "").trim() || "{}");
            generatedWords = (json.words || []).map((w: any) => ({ ...w, word: normalizeWord(w.word) }));
          } catch (e) { generatedWords = [{word: "AUGURI", clue: "Un pensiero felice"}]; }
      }

      const placedWordsRaw = generateLayout(generatedWords);
      const normalized = normalizeCoordinates(placedWordsRaw);
      const reindexed = reindexGridNumbering(normalized.words);
      width = normalized.width; height = normalized.height;
      finalWords = reindexed.map((w: any, idx: number) => ({ ...w, id: `word-${idx}`, word: w.word.toUpperCase().trim() }));
      calculatedSolution = hiddenSolutionWord ? findSolutionInGrid(reindexed, hiddenSolutionWord) : undefined;
  }

  // LOGICA DEDICA (PRIORITA' AL TUO PROMPT)
  if (typeof inputData === 'string' && inputData.trim().length > 0) {
      if (mode === 'ai' && apiKey) {
          if (onStatusUpdate) onStatusUpdate("Scrivo la dedica...");
          try {
              message = await regenerateGreeting(inputData, theme, extraData.recipientName, extraData.tone || 'surprise', extraData.customTone);
          } catch (e) { message = inputData; }
      } else { message = inputData; }
  } else { message = getRandomFallback(theme); }

  // RIPRISTINO IMAGES INTEGRALE (CESTINO E COLLAGE)
  let photoArray = extraData.images?.photos || [];
  if (photoArray.length === 0 && extraData.images?.photo) photoArray = [extraData.images.photo];

  return {
      type: extraData.contentType,
      title: theme === 'christmas' ? `Buon Natale ${extraData.recipientName}!` : `Per ${extraData.recipientName}`,
      message: message, theme: theme, recipientName: extraData.recipientName || '', eventDate: extraData.eventDate || '',
      images: { extraImage: extraData.images?.extraImage, photos: photoArray, brandLogo: extraData.images?.brandLogo },
      stickers: extraData.stickers,
      words: finalWords, width: Math.max(width, 8), height: Math.max(height, 8),
      solution: calculatedSolution,
      originalInput: inputData, originalMode: mode, originalHiddenSolution: hiddenSolutionWord,
      originalTone: extraData.tone, originalCustomTone: extraData.customTone,
      hasWatermark: extraData.hasWatermark, format: extraData.format || 'a4'
  };
};

export const regenerateGreetingOptions = async (
    userPrompt: string, theme: string, recipient: string, tone: ToneType, customPrompt?: string
): Promise<string[]> => {
    const apiKey = getApiKey();
    if (!apiKey) return [getRandomFallback(theme)];
    const ai = new GoogleGenAI({ apiKey, apiVersion: 'v1' });
    try {
        const stile = tone === 'custom' && customPrompt ? customPrompt : tone;
        // Prompt forzato per seguire il tuo testo
        const prompt = `Scrivi 5 messaggi auguri per ${recipient}. Tema: ${theme}. Stile: ${stile}. ARGOMENTO PRIORITARIO DA SEGUIRE: "${userPrompt}". JSON { "options": ["msg1"] }`;
        const response = await tryGenerateContent(ai, prompt);
        const json = JSON.parse(response?.text?.replace(/```json|```/g, "").trim() || "{}");
        return json.options || [getRandomFallback(theme)];
    } catch (e) { return [getRandomFallback(theme)]; }
};

export const regenerateGreeting = async (m: string, th: string, r: string, t: ToneType, cp?: string) => (await regenerateGreetingOptions(m, th, r, t, cp))[0];
