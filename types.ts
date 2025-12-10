
export enum Direction {
  ACROSS = 'across',
  DOWN = 'down'
}

export type ThemeType = 'christmas' | 'easter' | 'birthday' | 'elegant' | 'generic' | 'halloween' | 'graduation' | 'confirmation' | 'communion' | 'wedding';

export type ToneType = 'funny' | 'heartfelt' | 'rhyme' | 'surprise' | 'custom';

export interface WordEntry {
  id: string;
  word: string;
  clue: string;
  direction: Direction;
  startX: number; // 0-indexed column
  startY: number; // 0-indexed row
  number: number; // The number displayed in the grid
}

export interface SolutionData {
  word: string;
  cells: { 
    x: number; 
    y: number; 
    char: string;
    index: number; 
  }[]; 
}

export interface CustomImages {
  extraImage?: string; // Base64 string (Logo, QR, Vignetta)
  photos?: string[]; // Array of Base64 strings (Collage)
  photo?: string; // Legacy support
  brandLogo?: string; // Logo Autore/Copyright
}

export interface CrosswordData {
  type: 'crossword' | 'simple';
  title: string;
  recipientName: string;
  eventDate: string;
  message: string;
  theme: ThemeType;
  width: number;
  height: number;
  words: WordEntry[];
  solution?: SolutionData;
  images?: CustomImages;
  stickers?: string[];
  // Campi per la modifica
  originalInput?: string | ManualInput[];
  originalMode?: 'ai' | 'manual';
  originalHiddenSolution?: string;
  originalTone?: ToneType;
  originalCustomTone?: string;
}

export interface CellData {
  x: number;
  y: number;
  char?: string;
  userChar: string;
  number?: number;
  active?: boolean;
  isWordStart?: boolean;
  partOfWords: string[];
  isSolutionCell?: boolean;
  solutionIndex?: number;
}

export interface ManualInput {
  word: string;
  clue: string;
}
