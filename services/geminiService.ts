import { GoogleGenAI, Type } from "@google/genai";
import { CrosswordData, ManualInput, ThemeType, CustomImages } from '../types';

// --- SCHEMA SEMPLIFICATO (SOLO TESTO) ---
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
  // @ts-ignore
  const key = process.env.API_KEY;
  if (!key) throw new Error("API Key mancante");
  return key;
};

// --- MOTORE DI LAYOUT LOCALE ---
type GridCell = { char: string; wordId?: string };
type Grid = Map<string, GridCell>; // key: "x,y"

const DIRECTIONS = ['across', 'down'] as const;

function generateLayout(wordsInput: {word: string, clue: string}[], maxGridSize = 12): any[] {
    const wordsToPlace = [...wordsInput]
        .map(w => ({ ...w, word: w.word.toUpperCase().replace(/[^A-Z]/g, '').trim() }))
        .filter(w => w.word.length > 1)
        .sort((a, b) => b.word.length - a.word.length);

    if (wordsToPlace.length === 0) return [];

    const grid: Grid = new Map();
    const placedWords: any[] = [];
    
    const firstWord = wordsToPlace[0];
    const startX = Math.floor(maxGridSize / 2) - Math.floor(firstWord.word.length / 2);
    const startY = Math.floor(maxGridSize / 2);
    
    placeWordOnGrid(grid, firstWord.word, startX, startY, 'across');
    placedWords.push({ 
        ...firstWord, 
        direction: 'across', 
        startX, 
        startY, 
        number: 1 
    });

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

                        if (isValidPlacement(grid, currentWord.word, testStartX, testStartY, dir)) {
                            placeWordOnGrid(grid, currentWord.word, testStartX, testStartY, dir);
                            placedWords.push({
                                ...currentWord,
                                direction: dir,
                                startX: testStartX,
                                startY: testStartY,
                                number: placedWords.length + 1
                            });
                            placed = true;
                            break;
                        }
                    }
                }
                if (placed) break;
            }
        }

        if (!placed) {
             const maxY = Math.max(...placedWords.map(w => w.startY + (w.direction === 'down' ? w.word.length : 0)), 0);
             const safeY = maxY + 2; 
             const safeX = 2; 
             placeWordOnGrid(grid, currentWord.word, safeX, safeY, 'across');
             placedWords.push({
                ...currentWord,
                direction: 'across',
                startX: safeX,
                startY: safeY,
                number: placedWords.length + 1
             });
        }
    }
    return placedWords;
}

function isValidPlacement(grid: Grid, word: string, startX: number, startY: number, direction: string): boolean {
    for (let i = 0; i < word.length; i++) {
        const x = direction === 'across' ? startX + i : startX;
        const y = direction === 'down' ? startY + i : startY;
        const key = `${x},${y}`;
        const existing = grid.get(key);
        if (existing && existing.char !== word[i]) return false;
        if (!existing) {
            if (direction === 'across') {
                if (grid.has(`${x},${y-1}`) || grid.has(`${x},${y+1}`)) return false;
                if (i === 0 && grid.has(`${x-1},${y}`)) return false;
                if (i === word.length - 1 && grid.has(`${x+1},${y}`)) return false;
            } else {
                if (grid.has(`${x-1},${y}`) || grid.has(`${x+1},${y}`)) return false;
                if (i === 0 && grid.has(`${x},${y-1}`)) return false;
                if (i === word.length - 1 && grid.has(`${x},${y+1}`)) return false;
            }
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
    const padding = 1;
    const width = (maxX - minX) + padding * 2;
    const height = (maxY - minY) + padding * 2;
    const normalizedWords = placedWords.map(w => ({
        ...w,
        startX: w.startX - minX + padding,
        startY: w.startY - minY + padding
    }));
    return { words: normalizedWords, width, height };
}

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
        for (const key in gridMap) {
            if (gridMap[key] === char && !usedCoords.has(key)) {
                const [x, y] = key.split(',').map(Number);
                solutionCells.push({ x, y, char, index: i });
                usedCoords.add(key);
                break;
            }
        }
    }
    // Ritorna la soluzione solo se abbiamo trovato TUTTE le lettere
    // O almeno la maggior parte. Per ora ritorniamo quello che troviamo.
    if (solutionCells.length > 0) {
        return { word: hiddenWord.toUpperCase(), cells: solutionCells };
    }
    return null;
};

// --- MAIN FUNCTION ---
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

  // NOTA: Cache disabilitata temporaneamente per permettere testing
  
  let generatedWords: {word: string, clue: string}[] = [];

  if (mode === 'manual') {
      const inputs = inputData as ManualInput[];
      generatedWords = inputs
        .filter(i => i.word.trim() && i.clue.trim())
        .map(i => ({ word: i.word.toUpperCase().trim(), clue: i.clue }));
  } else {
      const topic = inputData as string;
      
      // Costruiamo un prompt che guidi l'IA a usare le lettere della soluzione
      const solutionChars = hiddenSolutionWord 
        ? hiddenSolutionWord.toUpperCase().replace(/[^A-Z]/g, '').split('').join(', ')
        : '';
        
      const lettersInstruction = solutionChars 
        ? `IMPORTANTE: Devi generare parole che contengano le seguenti lettere sparse: ${solutionChars}. È fondamentale per il gioco.` 
        : '';

      const prompt = `Genera una lista di 6-8 parole e definizioni per un cruciverba sul tema: "${topic}". 
      ${lettersInstruction}
      Output JSON array di oggetti {word, clue}. 
      Parole semplici, definizioni divertenti.`;

      try {
        if (onStatusUpdate) onStatusUpdate("L'IA sta scrivendo le definizioni...");
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: wordListSchema,
                temperature: 0.8, // Leggermente più creativo per trovare parole varie
            },
        });

        if (response.text) {
            const json = JSON.parse(response.text);
            generatedWords = json.words || [];
        }
      } catch (e) {
        console.error("AI Error", e);
        throw new Error("Errore nella generazione delle parole. Riprova.");
      }
  }

  if (generatedWords.length === 0) {
      throw new Error("Nessuna parola generata.");
  }

  if (onStatusUpdate) onStatusUpdate("Calcolo incroci...");
  await new Promise(r => setTimeout(r, 500));

  const placedWordsRaw = generateLayout(generatedWords);
  const { words, width, height } = normalizeCoordinates(placedWordsRaw);

  const calculatedSolution = hiddenSolutionWord 
      ? findSolutionInGrid(words, hiddenSolutionWord) 
      : null;

  // Formattiamo le parole finali
  const finalWords = words.map((w: any, idx: number) => ({ 
      ...w, 
      id: `word-${idx}`,
      word: w.word.toUpperCase().trim() 
  }));

  const defaultTitle = theme === 'birthday' ? `Auguri ${extraData?.recipientName}!` : 
                       theme === 'christmas' ? `Buon Natale ${extraData?.recipientName}!` :
                       `Per ${extraData?.recipientName}`;

  const defaultMessage = `Tanti auguri! Ecco un cruciverba speciale per te.`;

  return {
      title: defaultTitle,
      message: defaultMessage,
      theme: theme,
      recipientName: extraData?.recipientName || '',
      eventDate: extraData?.eventDate || '',
      images: extraData?.images,
      stickers: extraData?.stickers,
      words: finalWords,
      width: Math.max(width, 8),
      height: Math.max(height, 8),
      solution: calculatedSolution,
  };
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
