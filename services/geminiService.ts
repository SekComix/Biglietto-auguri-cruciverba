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

const getApiKey = () => {
  // Tenta diversi modi per recuperare la chiave
  // @ts-ignore
  const key = import.meta.env.VITE_GEMINI_API_KEY || process.env.API_KEY || process.env.GEMINI_API_KEY;
  
  if (!key || key.includes("YOUR_API_KEY")) {
      console.error("API KEY MANCANTE O NON VALIDA:", key);
      throw new Error("Manca la API KEY! Controlla il file .env o la configurazione.");
  }
  return key;
};

const normalizeWord = (str: string): string => {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z]/g, "");
};

const FALLBACK_GREETINGS: Record<string, string[]> = {
    christmas: [
        "Ti auguro un Natale pieno di gioia, calore e momenti indimenticabili!",
        "Che la magia delle feste porti serenità a te e alla tua famiglia. Auguri!",
        "Sotto l'albero spero tu trovi felicità e sorrisi. Buon Natale!"
    ],
    birthday: [
        "Buon Compleanno! Che la tua giornata sia speciale come te.",
        "Cento di questi giorni! Ti auguro un anno pieno di successi.",
        "Tanti auguri! Festeggia alla grande e goditi ogni momento."
    ],
    generic: [
        "Tanti auguri! Spero che questa giornata ti porti tanta felicità.",
        "Un pensiero speciale per una persona speciale."
    ]
};

const getRandomFallback = (theme: string): string => {
    const keys = Object.keys(FALLBACK_GREETINGS);
    const key = keys.includes(theme) ? theme : 'generic';
    const messages = FALLBACK_GREETINGS[key] || FALLBACK_GREETINGS['generic'];
    return messages[Math.floor(Math.random() * messages.length)];
};

// Funzione Timeout con messaggio dettagliato
const withTimeout = <T>(promise: Promise<T>, ms: number, errorMessage: string): Promise<T> => {
    let timeoutId: any;
    const timeoutPromise = new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => {
            reject(new Error(errorMessage));
        }, ms);
    });
    return Promise.race([
        promise.then(res => {
            clearTimeout(timeoutId);
            return res;
        }),
        timeoutPromise
    ]);
};

// --- LOGICA LAYOUT ---
type GridCell = { char: string; wordId?: string };
type Grid = Map<string, GridCell>; 
const MAX_GRID_SIZE = 14; 

function generateLayout(wordsInput: {word: string, clue: string}[]): any[] {
    const wordsToPlace = [...wordsInput]
        .map(w => ({ ...w, word: normalizeWord(w.word) }))
        .filter(w => w.word.length > 1 && w.word.length <= MAX_GRID_SIZE) 
        .sort((a, b) => b.word.length - a.word.length);

    if (wordsToPlace.length === 0) return [];
    
    const grid: Grid = new Map();
    const placedWords: any[] = [];
    
    const firstWord = wordsToPlace[0];
    const startX = Math.floor(MAX_GRID_SIZE / 2) - Math.floor(firstWord.word.length / 2);
    const startY = Math.floor(MAX_GRID_SIZE / 2);
    
    placeWordOnGrid(grid, firstWord.word, startX, startY, 'across');
    placedWords.push({ ...firstWord, direction: 'across', startX, startY, number: 1 });

    for (let i = 1; i < wordsToPlace.length; i++) {
        const currentWord = wordsToPlace[i];
        let placed = false;
        const occupiedCoords = Array.from(grid.keys());
        occupiedCoords.sort(() => Math.random() - 0.5);

        for (const coordKey of occupiedCoords) {
            if (placed) break;
            const [cx, cy] = coordKey.split(',').map(Number);
            const charOnGrid = grid.get(coordKey)?.char;

            for (let charIdx = 0; charIdx < currentWord.word.length; charIdx++) {
                if (currentWord.word[charIdx] === charOnGrid) {
                    const directionsToTry = ['down', 'across'];
                    for (const dir of directionsToTry) {
                        const testStartX = dir === 'across' ? cx - charIdx : cx;
                        const testStartY = dir === 'down' ? cy - charIdx : cy;
                        if (isWithinBounds(testStartX, testStartY, currentWord.word.length, dir, MAX_GRID_SIZE)) {
                             if (isValidPlacement(grid, currentWord.word, testStartX, testStartY, dir)) {
                                placeWordOnGrid(grid, currentWord.word, testStartX, testStartY, dir);
                                placedWords.push({ ...currentWord, direction: dir, startX: testStartX, startY: testStartY, number: placedWords.length + 1 });
                                placed = true;
                                break;
                            }
                        }
                    }
                }
                if (placed) break;
            }
        }
        if (!placed) { /* Tentativo posizionamento libero omesso per brevità, non critico per l'errore AI */ }
    }
    return placedWords;
}

function isWithinBounds(x: number, y: number, length: number, direction: string, maxSize: number): boolean {
    if (x < 0 || y < 0) return false;
    if (direction === 'across') return (x + length) <= maxSize && y < maxSize;
    return x < maxSize && (y + length) <= maxSize;
}

function isValidPlacement(grid: Grid, word: string, startX: number, startY: number, direction: string): boolean {
    for (let i = 0; i < word.length; i++) {
        const x = direction === 'across' ? startX + i : startX;
        const y = direction === 'down' ? startY + i : startY;
        const key = `${x},${y}`;
        const existing = grid.get(key);
        if (existing && existing.char !== word[i]) return false;
        if (!existing) {
            // Semplificato controllo adiacenza
            if (direction === 'across') { if (grid.has(`${x},${y-1}`) || grid.has(`${x},${y+1}`)) return false; }
            else { if (grid.has(`${x-1},${y}`) || grid.has(`${x+1},${y}`)) return false; }
        }
    }
    return true;
}

function placeWordOnGrid(grid: Grid, word: string, startX: number, startY: number, direction: string) {
    for (let i = 0; i < word.length; i++) {
        const x = direction === 'across' ? startX + i : startX;
        const y = direction === 'down' ? startY + i : startY;
        grid.set(`${x},${y}`, { char: word[i] });
    }
}

function normalizeCoordinates(placedWords: any[]) {
    if (placedWords.length === 0) return { words: [], width: 10, height: 10 };
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    placedWords.forEach(w => {
        const endX = w.direction === 'across' ? w.startX + w.word.length : w.startX + 1;
        const endY = w.direction === 'down' ? w.startY + w.word.length : w.startY + 1;
        minX = Math.min(minX, w.startX);
        minY = Math.min(minY, w.startY);
        maxX = Math.max(maxX, endX);
        maxY = Math.max(maxY, endY);
    });
    const width = (maxX - minX) + 2;
    const height = (maxY - minY) + 2;
    const normalizedWords = placedWords.map(w => ({
        ...w,
        startX: w.startX - minX + 1,
        startY: w.startY - minY + 1
    }));
    return { words: normalizedWords, width, height };
}

function reindexGridNumbering(words: any[]) {
    const startPoints: {x: number, y: number}[] = [];
    const pointsSet = new Set<string>();
    words.forEach(w => {
        const key = `${w.startX},${w.startY}`;
        if (!pointsSet.has(key)) { pointsSet.add(key); startPoints.push({ x: w.startX, y: w.startY }); }
    });
    startPoints.sort((a, b) => (a.y !== b.y) ? a.y - b.y : a.x - b.x);
    const coordToNumber = new Map<string, number>();
    startPoints.forEach((p, index) => { coordToNumber.set(`${p.x},${p.y}`, index + 1); });
    return words.map(w => ({ ...w, number: coordToNumber.get(`${w.startX},${w.startY}`) })).sort((a,b) => a.number - b.number); 
}

// --- MAIN FUNCTION ---
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
  let apiKey = '';
  try {
      apiKey = getApiKey();
  } catch (e: any) {
      throw new Error(e.message);
  }

  const ai = new GoogleGenAI({ apiKey });
  
  let generatedWords: {word: string, clue: string}[] = [];
  let finalWords: any[] = [];
  let width = 0;
  let height = 0;
  let calculatedSolution = null;
  let message = '';

  // --- LOGICA CROSSWORD ---
  if (extraData.contentType === 'crossword') {
      if (mode === 'manual') {
          const inputs = inputData as ManualInput[];
          generatedWords = inputs.filter(i => i.word.trim() && i.clue.trim()).map(i => ({ word: normalizeWord(i.word), clue: i.clue }));
      } else {
          // AI MODE
          const topic = inputData as string;
          const prompt = `Genera 8 parole e definizioni per cruciverba in ITALIANO. Tema: "${topic}". Output JSON {words: [{word, clue}]}.`;
          
          try {
            if (onStatusUpdate) onStatusUpdate("L'IA inventa le parole...");
            // Usiamo il modello standard Flash
            const responsePromise = ai.models.generateContent({
                model: 'gemini-1.5-flash',
                contents: prompt,
                config: { responseMimeType: "application/json", responseSchema: wordListSchema },
            });
            const response = await withTimeout<GenerateContentResponse>(responsePromise, 30000, "Timeout AI.");
            if (response.text) {
                const json = JSON.parse(response.text);
                generatedWords = json.words.map((w: any) => ({ ...w, word: normalizeWord(w.word) }));
            }
          } catch (e: any) {
            console.error("AI Error:", e);
            // MOSTRO L'ERRORE REALE ALL'UTENTE
            throw new Error(`Errore AI: ${e.message || e.toString()}`);
          }
      }

      if (generatedWords.length === 0) throw new Error("Nessuna parola generata.");
      if (onStatusUpdate) onStatusUpdate("Costruisco la griglia...");
      const placedWordsRaw = generateLayout(generatedWords);
      if (placedWordsRaw.length < 2) throw new Error("Impossibile creare incroci con queste parole.");
      const normalized = normalizeCoordinates(placedWordsRaw);
      const reindexedWords = reindexGridNumbering(normalized.words);
      width = normalized.width; height = normalized.height;
      finalWords = reindexedWords.map((w: any, idx: number) => ({ ...w, id: `word-${idx}`, word: w.word.toUpperCase().trim() }));
  }

  // --- LOGICA MESSAGGIO AUGURI ---
  if (typeof inputData === 'string' && inputData.trim().length > 0) {
      if (mode === 'ai') {
          if (onStatusUpdate) onStatusUpdate("Scrivo la dedica...");
          try {
              const generatedMessage = await regenerateGreeting(
                  inputData, theme, extraData.recipientName, extraData.tone || 'surprise', extraData.customTone
              );
              message = generatedMessage;
          } catch (e) {
              console.warn("Errore generazione messaggio, uso fallback", e);
              message = inputData; // Fallback al prompt
          }
      } else {
          message = inputData;
      }
  } else {
      message = getRandomFallback(theme);
  }

  let defaultTitle = `Per ${extraData?.recipientName}`;
  if (theme === 'christmas') defaultTitle = `Buon Natale ${extraData?.recipientName}!`;
  // ... altri temi ...

  let photoArray = extraData.images?.photos || [];
  if (photoArray.length === 0 && extraData.images?.photo) photoArray = [extraData.images.photo];

  return {
      type: extraData.contentType,
      title: defaultTitle,
      message: message,
      theme: theme,
      recipientName: extraData?.recipientName || '',
      eventDate: extraData?.eventDate || '',
      images: { extraImage: extraData.images?.extraImage, photos: photoArray, brandLogo: extraData.images?.brandLogo },
      stickers: extraData?.stickers,
      words: finalWords,
      width: Math.max(width, 8),
      height: Math.max(height, 8),
      solution: calculatedSolution,
      originalInput: inputData,
      originalMode: mode,
      originalHiddenSolution: hiddenSolutionWord,
      originalTone: extraData.tone,
      originalCustomTone: extraData.customTone,
      hasWatermark: extraData.hasWatermark,
      format: extraData.format || 'a4'
  };
};

export const regenerateGreetingOptions = async (
    currentMessage: string,
    theme: string,
    recipient: string,
    tone: ToneType,
    customPrompt?: string
): Promise<string[]> => {
    let apiKey = '';
    try { apiKey = getApiKey(); } catch(e) { return [getRandomFallback(theme)]; }

    const ai = new GoogleGenAI({ apiKey });
    let instructions = tone === 'custom' && customPrompt ? `Istruzioni: "${customPrompt}".` : `Stile: ${tone}.`;
    let context = currentMessage !== 'placeholder' ? `Argomento: "${currentMessage}".` : '';

    const prompt = `Scrivi 5 messaggi di auguri brevi in ITALIANO per ${recipient}. Evento: ${theme}. ${instructions} ${context} Max 25 parole. JSON: { "options": ["msg1", "msg2"] }`;
    
    const schema = {
        type: Type.OBJECT,
        properties: { options: { type: Type.ARRAY, items: { type: Type.STRING } } },
        required: ["options"]
    };

    try {
        const apiCall = ai.models.generateContent({ 
            model: 'gemini-1.5-flash', 
            contents: prompt, 
            config: { temperature: 0.9, responseMimeType: "application/json", responseSchema: schema } 
        });
        const response = await withTimeout<GenerateContentResponse>(apiCall, 30000, "Timeout");
        const json = JSON.parse(response.text || "{}");
        return json.options || [getRandomFallback(theme)];
    } catch (e) {
        console.error("Errore generazione auguri", e);
        return [getRandomFallback(theme)];
    }
};

export const regenerateGreeting = async (
    currentMessage: string, theme: string, recipient: string, tone: ToneType, customPrompt?: string
): Promise<string> => {
     const options = await regenerateGreetingOptions(currentMessage, theme, recipient, tone, customPrompt);
     return options[0];
}
