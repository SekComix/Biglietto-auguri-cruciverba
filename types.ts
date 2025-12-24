export enum Direction {
  ACROSS = 'across',
  DOWN = 'down'
}

export type ThemeType = 'christmas' | 'easter' | 'birthday' | 'elegant' | 'generic' | 'halloween' | 'graduation' | 'confirmation' | 'communion' | 'wedding';

export type ToneType = 'funny' | 'heartfelt' | 'rhyme' | 'surprise' | 'custom';

// Aggiunto 'a6_2x' qui sotto
export type CardFormat = 'a4' | 'a3' | 'square' | 'tags' | 'a6_2x';

export interface WordEntry {
  id: string;
  word: string;
  clue: string;
  direction: Direction;
  startX: number; 
  startY: number; 
  number: number; 
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
  extraImage?: string; 
  photos?: string[]; 
  photo?: string; 
  brandLogo?: string; 
}

export interface CrosswordData {
  type: 'crossword' | 'simple';
  title: string;
  recipientName: string;
  eventDate: string;
  message: string;
  theme: ThemeType;
  format: CardFormat; 
  width: number;
  height: number;
  words: WordEntry[];
  solution?: SolutionData;
  images?: CustomImages;
  stickers?: string[];
  hasWatermark?: boolean;
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
