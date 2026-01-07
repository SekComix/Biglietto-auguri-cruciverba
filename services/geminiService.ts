import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { CrosswordData, ManualInput, ThemeType, ToneType, CardFormat } from '../types';

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

// --- MOTORE AI (FISSA L'ERRORE 400) ---
async function tryGenerateContent(ai: GoogleGenAI, prompt: string, isJson: boolean = false): Promise<string> {
    const modelName = 'gemini-1.5-flash';
    
    // Per evitare l'errore 400, non usiamo più responseMimeType nel config.
    // Chiediamo il formato JSON direttamente nel testo del prompt.
    const finalPrompt = isJson 
        ? `${prompt}. RISPONDI ESCLUSIVAMENTE IN FORMATO JSON PURO. Non aggiungere commenti o blocchi di codice markdown.` 
        : prompt;

    try {
        const result = await withTimeout(
            ai.models.generateContent({
                model: modelName,
                contents: [{ role: 'user', parts: [{ text: finalPrompt }] }],
                config: { temperature: 0.7 } // Configurazione minima per evitare errori di schema
            }),
            35000,
            "Timeout AI"
        );
        
        // Pulizia del testo ricevuto per garantire che sia un JSON valido
        const text = result.text || "";
        return text.replace(/```json|```/g, "").trim();
    } catch (e: any) {
        console.error("Errore durante la chiamata AI:", e.message);
        throw e;
    }
}

// --- IL TUO MOTORE DI LAYOUT INTEGRALE ---
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
    
    for (let i = 0; i < firstWord.word.length; i++) {
        grid.set(`${startX + i},${startY}`, { char: firstWord.word[i] });
    }
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
                        const tx = dir === 'across' ? cx - charIdx : cx;
                        const ty = dir === 'down' ? cy - charIdx : cy;
                        if (tx >= 0 && ty >= 0 && (dir === 'across' ? tx + currentWord.word.length <= MAX_GRID_SIZE : ty + currentWord.word.length <= MAX_GRID_SIZE)) {
                             if (isValidPlacement(grid, currentWord.word, tx, ty, dir)) {
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

// --- FUNZIONE GENERATORE PRINCIPALE (RIPRISTINO FOTO E LOGICA) ---
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
  let message = '';

  if (extraData.contentType === 'crossword') {
      if (mode === 'manual') {
          const inputs = inputData as ManualInput[];
          generatedWords = inputs.filter(i => i.word.trim() && i.clue.trim()).map(i => ({ word: normalizeWord(i.word), clue: i.clue }));
      } else {
          if (onStatusUpdate) onStatusUpdate("L'IA inventa le parole...");
          try {
            const prompt = `Genera 10 parole e definizioni tema: "${inputData}" in ITALIANO. JSON: { "words": [{ "word": "...", "clue": "..." }] }`;
            const responseJson = await tryGenerateContent(ai, prompt, true);
            const json = JSON.parse(responseJson);
            generatedWords = (json.words || []).map((w: any) => ({ ...w, word: normalizeWord(w.word) }));
          } catch (e) { generatedWords = [{word: "AI", clue: "Errore AI"}]; }
      }
  }

  // Motore Layout originale
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

  // Dedica AI
  if (mode === 'ai' && apiKey) {
      if (onStatusUpdate) onStatusUpdate("Scrivo la dedica...");
      try {
          const tone = extraData.tone || 'surprise';
          message = await tryGenerateContent(ai, `Scrivi un breve augurio per ${extraData.recipientName}, tema ${theme}, stile ${tone}`);
      } catch (e) { message = "Tanti auguri!"; }
  } else {
      message = typeof inputData === 'string' ? inputData : "Tanti auguri!";
  }

  // --- IL RITORNO DATI CHE RIPRISTINA IL CESTINO E IL COLLAGE ---
  return {
      type: extraData.contentType,
      title: theme === 'christmas' ? `Buon Natale ${extraData.recipientName}!` : `Per ${extraData.recipientName}`,
      message, theme, recipientName: extraData.recipientName, eventDate: extraData.eventDate,
      images: extraData.images || { photos: [] }, // <--- Fondamentale per non perdere i comandi collage
      words: finalWords, width: (maxX - minX) + 2, height: (maxY - minY) + 2,
      format: extraData.format || 'a4'
  };
};

export const regenerateGreetingOptions = async (m: string, th: string, r: string, t: ToneType, cp?: string): Promise<string[]> => {
    const apiKey = getApiKey();
    if (!apiKey) return ["Auguri!"];
    const ai = new GoogleGenAI({ apiKey, apiVersion: 'v1' });
    try {
        const prompt = `Scrivi 5 auguri per ${r}, tema ${th}. JSON: { "options": ["msg1"] }`;
        const responseJson = await tryGenerateContent(ai, prompt, true);
        const json = JSON.parse(responseJson);
        return json.options || ["Auguri!"];
    } catch (e) { return ["Auguri!"]; }
};

export const regenerateGreeting = async (m: string, th: string, r: string, t: ToneType, cp?: string) => (await regenerateGreetingOptions(m, th, r, t, cp))[0];
