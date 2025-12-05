import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
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

// --- FALLBACK MESSAGES ---
const FALLBACK_GREETINGS: Record<string, string[]> = {
    christmas: [
        "Ti auguro un Natale pieno di gioia, calore e momenti indimenticabili!",
        "Che la magia delle feste porti serenità a te e alla tua famiglia. Auguri!",
        "Sotto l'albero spero tu trovi felicità e sorrisi. Buon Natale!",
        "Un mondo di auguri per un Natale scintillante e felice.",
        "Che questo Natale brilli di luce, amore e allegria!"
    ],
    birthday: [
        "Buon Compleanno! Che la tua giornata sia speciale come te.",
        "Cento di questi giorni! Ti auguro un anno pieno di successi.",
        "Tanti auguri! Festeggia alla grande e goditi ogni momento.",
        "Un altro anno è passato, ma sei sempre fantastico! Auguri!",
        "Auguri di cuore! Che tutti i tuoi desideri si avverino oggi."
    ],
    easter: [
        "Buona Pasqua! Che sia una giornata piena di dolcezza.",
        "Auguri di una serena e felice Pasqua a te e ai tuoi cari.",
        "Tra colombe e uova di cioccolato, ti auguro una Pasqua speciale!",
        "Che la pace e la gioia della Pasqua siano con te oggi."
    ],
    halloween: [
        "Dolcetto o scherzetto? Ti auguro un Halloween spaventosamente divertente!",
        "Una notte da brividi e risate! Buon Halloween!",
        "Che la magia di Halloween ti porti tanti dolci e zero brutti scherzi.",
        "Streghe, fantasmi e zucche... oggi tutto è permesso. Buon Halloween!"
    ],
    graduation: [
        "Congratulazioni Dottore! Hai raggiunto un traguardo straordinario.",
        "Tutti i tuoi sacrifici sono stati ripagati. Ad Maiora!",
        "Oggi festeggiamo il tuo successo e il tuo futuro radioso. Congratulazioni!",
        "Sei l'orgoglio di tutti noi. Auguri per la tua Laurea!"
    ],
    confirmation: [
        "Che lo Spirito Santo ti guidi sempre nel cammino della vita.",
        "Tanti auguri per la tua Santa Cresima, giorno di gioia e consapevolezza.",
        "Un giorno importante per la tua crescita spirituale. Auguri di cuore!",
        "Che la luce di questo giorno ti accompagni per sempre."
    ],
    communion: [
        "Auguri per la tua Prima Comunione, un incontro speciale con Gesù.",
        "Che la gioia di questo giorno resti per sempre nel tuo cuore.",
        "Un passo importante nella fede. Tanti auguri per la tua Comunione!",
        "Possa la purezza di oggi accompagnarti ogni giorno."
    ],
    wedding: [
        "Che il vostro amore sia eterno e sempre pieno di gioia. Viva gli sposi!",
        "Oggi inizia la vostra avventura più bella. Tanti auguri di felicità!",
        "Che la vostra vita insieme sia una meravigliosa favola. Congratulazioni!",
        "Due cuori, un'unica anima. Felicitazioni per il vostro Matrimonio!"
    ],
    elegant: [
        "I miei più sinceri auguri per questa occasione speciale.",
        "Con l'augurio che la serenità possa accompagnarti sempre.",
        "Un pensiero gentile per augurarti il meglio in questo giorno.",
        "Auguri raffinati per una persona di grande stile."
    ],
    generic: [
        "Tanti auguri! Spero che questa giornata ti porti tanta felicità.",
        "Un pensiero speciale per te in questo giorno di festa.",
        "Con affetto, ti auguro il meglio oggi e sempre!",
        "Che sia un giorno indimenticabile. Auguri di cuore!"
    ]
};

const getRandomFallback = (theme: string): string => {
    const keys = Object.keys(FALLBACK_GREETINGS);
    const key = keys.includes(theme) ? theme : 'generic';
    const messages = FALLBACK_GREETINGS[key];
    return messages[Math.floor(Math.random() * messages.length)];
};

// --- HELPER TIMEOUT ---
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
    images?: { extraImage?: string; photos?: string[]; photo?: string }; // Support legacy photo
    stickers?: string[];
    contentType: 'crossword' | 'simple'; 
  },
  onStatusUpdate?: (status: string) => void
): Promise<CrosswordData> => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });
  
  let generatedWords: {word: string, clue: string}[] = [];
  let finalWords: any[] = [];
  let width = 0;
  let height = 0;
  let calculatedSolution = null;

  // LOGICA CROSSWORD vs SIMPLE
  if (extraData.contentType === 'crossword') {
      if (mode === 'manual') {
          const inputs = inputData as ManualInput[];
          generatedWords = inputs
            .filter(i => i.word.trim() && i.clue.trim())
            .map(i => ({ word: i.word.toUpperCase().trim(), clue: i.clue }));
      } else {
          const topic = inputData as string;
          
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
            if (onStatusUpdate) onStatusUpdate("L'IA inventa le parole...");
            
            const responsePromise = ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: wordListSchema,
                    temperature: 0.8,
                },
            });

            const response = await withTimeout<GenerateContentResponse>(responsePromise, 30000, "Timeout generazione parole. Riprova.");

            if (response.text) {
                const json = JSON.parse(response.text);
                generatedWords = json.words || [];
            }
          } catch (e) {
            console.error("AI Error", e);
            throw new Error("Errore AI o Timeout. Riprova.");
          }
      }

      if (generatedWords.length === 0) {
          throw new Error("Nessuna parola generata.");
      }

      if (onStatusUpdate) onStatusUpdate("Costruisco la griglia...");
      await new Promise(r => setTimeout(r, 500));

      const placedWordsRaw = generateLayout(generatedWords);
      const normalized = normalizeCoordinates(placedWordsRaw);
      width = normalized.width;
      height = normalized.height;
      
      finalWords = normalized.words.map((w: any, idx: number) => ({ 
          ...w, 
          id: `word-${idx}`,
          word: w.word.toUpperCase().trim() 
      }));

      calculatedSolution = hiddenSolutionWord 
          ? findSolutionInGrid(normalized.words, hiddenSolutionWord) 
          : null;
  }

  // Costruzione Titolo
  let defaultTitle = `Per ${extraData?.recipientName}`;
  switch(theme) {
      case 'birthday': defaultTitle = `Buon Compleanno ${extraData?.recipientName}!`; break;
      case 'christmas': defaultTitle = `Buon Natale ${extraData?.recipientName}!`; break;
      case 'easter': defaultTitle = `Buona Pasqua ${extraData?.recipientName}!`; break;
      case 'halloween': defaultTitle = `Buon Halloween ${extraData?.recipientName}!`; break;
      case 'graduation': defaultTitle = `Congratulazioni Dott. ${extraData?.recipientName}!`; break;
      case 'confirmation': defaultTitle = `Santa Cresima di ${extraData?.recipientName}`; break;
      case 'communion': defaultTitle = `Prima Comunione di ${extraData?.recipientName}`; break;
      case 'wedding': defaultTitle = `Viva gli Sposi!`; break;
  }

  const defaultMessage = `Tanti auguri! Ecco un pensiero speciale per te.`;
  
  // Normalizzazione Foto (se c'è legacy photo, mettiamola in array photos)
  let photoArray = extraData.images?.photos || [];
  if (photoArray.length === 0 && extraData.images?.photo) {
      photoArray = [extraData.images.photo];
  }

  return {
      type: extraData.contentType,
      title: defaultTitle,
      message: defaultMessage,
      theme: theme,
      recipientName: extraData?.recipientName || '',
      eventDate: extraData?.eventDate || '',
      images: {
          extraImage: extraData.images?.extraImage,
          photos: photoArray
      },
      stickers: extraData?.stickers,
      words: finalWords,
      width: Math.max(width, 8),
      height: Math.max(height, 8),
      solution: calculatedSolution,
      // Salva i dati originali per permettere la modifica
      originalInput: inputData,
      originalMode: mode,
      originalHiddenSolution: hiddenSolutionWord
  };
};

export const regenerateGreeting = async (
    currentMessage: string,
    theme: string,
    recipient: string,
    tone: 'funny' | 'heartfelt' | 'rhyme' | 'custom',
    customPrompt?: string
): Promise<string> => {
    const apiKey = getApiKey();
    const ai = new GoogleGenAI({ apiKey });
    
    let instructions = "";
    if (tone === 'custom' && customPrompt) {
      instructions = `Istruzioni specifiche: "${customPrompt}".`;
    } else {
      instructions = `Stile: ${tone}.`;
    }

    const prompt = `
    Scrivi un breve messaggio di auguri originale per ${recipient}.
    Evento: ${theme}.
    ${instructions}
    
    Massimo 30 parole. Solo testo semplice.
    Seed casuale: ${Math.random()}
    `;

    try {
        const apiCall = ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { 
                temperature: 0.9 
            } 
        });

        const response = await withTimeout<GenerateContentResponse>(apiCall, 15000, "Timeout");
        const newText = response.text?.replace(/"/g, '').trim();

        if (!newText || newText === currentMessage) {
            throw new Error("Messaggio vuoto o identico");
        }

        return newText;
    } catch (e) {
        console.error("Errore o Timeout rigenerazione (uso fallback):", e);
        let fallback = getRandomFallback(theme);
        if (fallback === currentMessage) {
             fallback = getRandomFallback(theme);
        }
        return fallback;
    }
};
