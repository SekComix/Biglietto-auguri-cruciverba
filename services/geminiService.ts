
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { CrosswordData, ManualInput, ThemeType, ToneType } from '../types';

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

// Helper function to normalize words (remove accents, keep only A-Z)
const normalizeWord = (str: string): string => {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z]/g, "");
};

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
        "Auguri di una serena e felice Pasqua a te e ai tuoi cari."
    ],
    halloween: [
        "Dolcetto o scherzetto? Ti auguro un Halloween spaventosamente divertente!",
    ],
    graduation: [
        "Congratulazioni Dottore! Hai raggiunto un traguardo straordinario.",
    ],
    confirmation: [
        "Che lo Spirito Santo ti guidi sempre nel cammino della vita.",
    ],
    communion: [
        "Auguri per la tua Prima Comunione, un incontro speciale con Gesù.",
    ],
    wedding: [
        "Che il vostro amore sia eterno e sempre pieno di gioia. Viva gli sposi!",
    ],
    elegant: [
        "I miei più sinceri auguri per questa occasione speciale.",
    ],
    generic: [
        "Tanti auguri! Spero che questa giornata ti porti tanta felicità.",
    ]
};

const getRandomFallback = (theme: string): string => {
    const keys = Object.keys(FALLBACK_GREETINGS);
    const key = keys.includes(theme) ? theme : 'generic';
    const messages = FALLBACK_GREETINGS[key] || FALLBACK_GREETINGS['generic'];
    return messages[Math.floor(Math.random() * messages.length)];
};

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

// --- MOTORE DI LAYOUT LOCALE (STRICLY BOUNDED) ---
type GridCell = { char: string; wordId?: string };
type Grid = Map<string, GridCell>; 

// Limite massimo rigido per evitare parole fuori griglia
const MAX_GRID_SIZE = 14; 

function generateLayout(wordsInput: {word: string, clue: string}[]): any[] {
    const wordsToPlace = [...wordsInput]
        .map(w => ({ ...w, word: normalizeWord(w.word) }))
        .filter(w => w.word.length > 1 && w.word.length <= MAX_GRID_SIZE) // Scarta parole troppo lunghe per la griglia
        .sort((a, b) => b.word.length - a.word.length);

    if (wordsToPlace.length === 0) return [];
    
    const grid: Grid = new Map();
    const placedWords: any[] = [];
    
    // Piazza la prima parola al centro
    const firstWord = wordsToPlace[0];
    const startX = Math.floor(MAX_GRID_SIZE / 2) - Math.floor(firstWord.word.length / 2);
    const startY = Math.floor(MAX_GRID_SIZE / 2);
    
    placeWordOnGrid(grid, firstWord.word, startX, startY, 'across');
    placedWords.push({ ...firstWord, direction: 'across', startX, startY, number: 1 });

    // Piazza le altre
    for (let i = 1; i < wordsToPlace.length; i++) {
        const currentWord = wordsToPlace[i];
        let placed = false;
        
        // 1. Tenta INTERSEZIONE (Preferito)
        const occupiedCoords = Array.from(grid.keys());
        // Randomizza l'ordine di controllo per variare il layout
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
                        
                        // Check Bounds STRICTLY
                        if (isWithinBounds(testStartX, testStartY, currentWord.word.length, dir, MAX_GRID_SIZE)) {
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
                }
                if (placed) break;
            }
        }

        // 2. Tenta POSIZIONAMENTO LIBERO (Se fallisce intersezione)
        // Cerca uno spazio vuoto compatto
        if (!placed) {
             // Scansiona la griglia per trovare un buco
             for (let y = 1; y < MAX_GRID_SIZE - 1; y++) {
                if (placed) break;
                for (let x = 1; x < MAX_GRID_SIZE - 1; x++) {
                    // Try across
                     if (isWithinBounds(x, y, currentWord.word.length, 'across', MAX_GRID_SIZE)) {
                        if (isValidPlacement(grid, currentWord.word, x, y, 'across')) {
                             placeWordOnGrid(grid, currentWord.word, x, y, 'across');
                             placedWords.push({ ...currentWord, direction: 'across', startX: x, startY: y, number: placedWords.length + 1 });
                             placed = true;
                             break;
                        }
                     }
                }
             }
        }

        // Se ancora !placed, la parola viene SCARTATA per non rompere il layout
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
        
        // Collisione con lettera diversa
        if (existing && existing.char !== word[i]) return false;
        
        // Regole adiacenza (se casella vuota)
        if (!existing) {
            // Non deve toccare altre parole ai lati (tranne incroci validi)
            // Across: check sopra/sotto
            // Down: check sinistra/destra
            // E check prima/dopo la parola
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

function reindexGridNumbering(words: any[]) {
    const startPoints: {x: number, y: number}[] = [];
    const pointsSet = new Set<string>();

    words.forEach(w => {
        const key = `${w.startX},${w.startY}`;
        if (!pointsSet.has(key)) {
            pointsSet.add(key);
            startPoints.push({ x: w.startX, y: w.startY });
        }
    });

    startPoints.sort((a, b) => {
        if (a.y !== b.y) return a.y - b.y;
        return a.x - b.x;
    });

    const coordToNumber = new Map<string, number>();
    startPoints.forEach((p, index) => {
        coordToNumber.set(`${p.x},${p.y}`, index + 1);
    });

    return words.map(w => ({
        ...w,
        number: coordToNumber.get(`${w.startX},${w.startY}`)
    })).sort((a,b) => a.number - b.number); 
}

const findSolutionInGrid = (words: any[], hiddenWord: string): any => {
    if (!hiddenWord) return null;
    const cleanTarget = normalizeWord(hiddenWord);
    const targetChars = cleanTarget.split('');
    const solutionCells: any[] = [];
    const usedCoords = new Set<string>();
    
    const availablePositions: Record<string, {x: number, y: number, wordIndex: number}[]> = {};

    words.forEach((w: any, wIdx: number) => {
        for(let i=0; i<w.word.length; i++) {
            const char = w.word[i];
            const x = w.direction === 'across' ? w.startX + i : w.startX;
            const y = w.direction === 'down' ? w.startY + i : w.startY;
            
            if (!availablePositions[char]) availablePositions[char] = [];
            availablePositions[char].push({ x, y, wordIndex: wIdx });
        }
    });

    const usedWordIndices = new Set<number>();

    for (let i = 0; i < targetChars.length; i++) {
        const char = targetChars[i];
        const candidates = availablePositions[char] || [];
        
        const validCandidates = candidates.filter(c => !usedCoords.has(`${c.x},${c.y}`));

        if (validCandidates.length === 0) return null; 

        validCandidates.sort(() => Math.random() - 0.5);

        let bestCandidate = validCandidates.find(c => !usedWordIndices.has(c.wordIndex));
        
        if (!bestCandidate) {
            bestCandidate = validCandidates[0];
        }

        const { x, y, wordIndex } = bestCandidate;
        solutionCells.push({ x, y, char, index: i });
        usedCoords.add(`${x},${y}`);
        usedWordIndices.add(wordIndex);
    }

    // Return sia la parola pulita per la logica, sia l'originale per la visualizzazione (con spazi o accenti)
    if (solutionCells.length > 0) return { word: cleanTarget, original: hiddenWord.toUpperCase(), cells: solutionCells };
    return null;
};

const getMissingLetters = (existingWords: string[], targetWord: string): string[] => {
    const pool = existingWords.join('').toUpperCase().split('');
    const target = normalizeWord(targetWord).split('');
    const missing: string[] = [];
    
    const poolMap = new Map<string, number>();
    pool.forEach(c => poolMap.set(c, (poolMap.get(c) || 0) + 1));
    
    target.forEach(c => {
        if (poolMap.get(c) && poolMap.get(c)! > 0) {
            poolMap.set(c, poolMap.get(c)! - 1);
        } else {
            missing.push(c);
        }
    });
    return missing;
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
    images?: { extraImage?: string; photos?: string[]; photo?: string; brandLogo?: string }; 
    stickers?: string[];
    contentType: 'crossword' | 'simple';
    tone?: ToneType;
    customTone?: string;
    hasWatermark?: boolean; // NEW: Controllo opzionale filigrana
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
  let message = '';

  // --- LOGICA CROSSWORD ---
  if (extraData.contentType === 'crossword') {
      if (mode === 'manual') {
          const inputs = inputData as ManualInput[];
          generatedWords = inputs
            .filter(i => i.word.trim() && i.clue.trim())
            .map(i => ({ word: normalizeWord(i.word), clue: i.clue }));
          
          if (hiddenSolutionWord) {
             const cleanSol = normalizeWord(hiddenSolutionWord);
             const missingLetters = getMissingLetters(generatedWords.map(w => w.word), cleanSol);
             
             if (missingLetters.length > 0) {
                 if (onStatusUpdate) onStatusUpdate(`Integro lettere mancanti: ${missingLetters.join(', ')}...`);
                 try {
                     const prompt = `Devo completare un cruciverba IN ITALIANO con soluzione nascosta "${cleanSol}". 
                     Ho già queste parole: ${generatedWords.map(w => w.word).join(', ')}.
                     Mancano le lettere: ${missingLetters.join(', ')}.
                     Genera 4 parole AGGIUNTIVE in ITALIANO che contengano queste lettere mancanti.
                     Tema: ${theme}. Output JSON array di oggetti {word, clue} con definizioni in italiano.`;
                     
                     const response = await ai.models.generateContent({
                        model: 'gemini-2.5-flash',
                        contents: prompt,
                        config: { responseMimeType: "application/json", responseSchema: wordListSchema, temperature: 0.7 },
                     });
                     
                     const json = JSON.parse(response.text || "{}");
                     if (json.words && Array.isArray(json.words)) {
                         // Normalize AI added words too
                         generatedWords = [...generatedWords, ...json.words.map((w: any) => ({ ...w, word: normalizeWord(w.word) }))];
                     }
                 } catch (e) {
                     console.warn("Fallita integrazione AI parole mancanti", e);
                 }
             }
          }

      } else {
          // MODALITA' AI PURA
          const topic = inputData as string;
          const solutionChars = hiddenSolutionWord ? normalizeWord(hiddenSolutionWord).split('').join(', ') : '';
          const lettersInstruction = solutionChars ? `IMPORTANTE: Devi generare parole che contengano le seguenti lettere sparse: ${solutionChars}.` : '';
          
          const prompt = `Genera una lista di 8-10 parole e definizioni per un cruciverba IN LINGUA ITALIANA sul tema: "${topic}". ${lettersInstruction} Le definizioni devono essere in italiano. Output JSON array di oggetti {word, clue}.`;
          
          try {
            if (onStatusUpdate) onStatusUpdate("L'IA inventa le parole...");
            const responsePromise = ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: { responseMimeType: "application/json", responseSchema: wordListSchema, temperature: 0.8 },
            });
            const response = await withTimeout<GenerateContentResponse>(responsePromise, 30000, "Timeout generazione parole.");
            if (response.text) {
                const json = JSON.parse(response.text);
                const rawWords = json.words || [];
                generatedWords = rawWords.map((w: any) => ({ ...w, word: normalizeWord(w.word) }));
            }
          } catch (e) {
            console.error("AI Error", e);
            throw new Error("Errore AI o Timeout. Riprova.");
          }
      }

      if (generatedWords.length === 0) throw new Error("Nessuna parola generata.");

      if (onStatusUpdate) onStatusUpdate("Costruisco la griglia...");
      await new Promise(r => setTimeout(r, 500));
      
      const placedWordsRaw = generateLayout(generatedWords);
      
      if (placedWordsRaw.length < 2) throw new Error("Non sono riuscito a incastrare abbastanza parole. Riprova.");

      const normalized = normalizeCoordinates(placedWordsRaw);
      const reindexedWords = reindexGridNumbering(normalized.words);

      width = normalized.width;
      height = normalized.height;
      finalWords = reindexedWords.map((w: any, idx: number) => ({ ...w, id: `word-${idx}`, word: w.word.toUpperCase().trim() }));
      
      // La soluzione viene cercata SOLO tra le parole effettivamente piazzate
      calculatedSolution = hiddenSolutionWord ? findSolutionInGrid(reindexedWords, hiddenSolutionWord) : null;
  }

  // --- LOGICA MESSAGGIO AUGURI ---
  if (typeof inputData === 'string' && inputData.trim().length > 0) {
      if (mode === 'ai') {
          if (onStatusUpdate) onStatusUpdate("Scrivo la dedica...");
          try {
              const generatedMessage = await regenerateGreeting(
                  inputData, 
                  theme, 
                  extraData.recipientName, 
                  extraData.tone || 'surprise', 
                  extraData.customTone
              );
              message = generatedMessage;
          } catch (e) {
              message = inputData;
          }
      } else {
          message = inputData;
      }
  } else {
      message = getRandomFallback(theme);
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
      hasWatermark: extraData.hasWatermark // NEW
  };
};

export const regenerateGreetingOptions = async (
    currentMessage: string,
    theme: string,
    recipient: string,
    tone: ToneType,
    customPrompt?: string
): Promise<string[]> => {
    const apiKey = getApiKey();
    const ai = new GoogleGenAI({ apiKey });
    let instructions = tone === 'custom' && customPrompt ? `Istruzioni specifiche: "${customPrompt}".` : `Stile: ${tone}.`;
    let context = currentMessage !== 'placeholder' ? `Contesto/Argomento: "${currentMessage}".` : '';

    const prompt = `Scrivi 5 diverse opzioni di messaggi di auguri brevi IN ITALIANO per ${recipient}. Evento: ${theme}. ${instructions} ${context} Max 30 parole per opzione. Restituisci JSON: { "options": ["messaggio 1", "messaggio 2", "messaggio 3", "messaggio 4", "messaggio 5"] }`;
    
    const schema = {
        type: Type.OBJECT,
        properties: {
            options: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["options"]
    };

    try {
        const apiCall = ai.models.generateContent({ 
            model: 'gemini-2.5-flash', 
            contents: prompt, 
            config: { temperature: 0.9, responseMimeType: "application/json", responseSchema: schema } 
        });
        const response = await withTimeout<GenerateContentResponse>(apiCall, 15000, "Timeout");
        const json = JSON.parse(response.text || "{}");
        return json.options || [getRandomFallback(theme)];
    } catch (e) {
        return [getRandomFallback(theme)];
    }
};

export const regenerateGreeting = async (
    currentMessage: string,
    theme: string,
    recipient: string,
    tone: ToneType,
    customPrompt?: string
): Promise<string> => {
     const options = await regenerateGreetingOptions(currentMessage, theme, recipient, tone, customPrompt);
     return options[0];
}
