export enum Direction {
  ACROSS = 'across',
  DOWN = 'down'
}

export type ThemeType = 'christmas' | 'easter' | 'birthday' | 'elegant' | 'generic';

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
  // Which cells in the grid correspond to the letters of the solution
  cells: { 
    x: number; 
    y: number; 
    char: string;
    index: number; // Position in the solution string (0, 1, 2...)
  }[]; 
}

export interface CrosswordData {
  title: string;
  message: string; // Greeting message
  theme: ThemeType;
  width: number;
  height: number;
  words: WordEntry[];
  solution?: SolutionData; // Optional hidden word
}

export interface CellData {
  x: number;
  y: number;
  char?: string; // Correct character
  userChar: string; // What user typed
  number?: number; // If it's the start of a word
  active?: boolean;
  isWordStart?: boolean;
  partOfWords: string[]; // IDs of words this cell belongs to
  isSolutionCell?: boolean; // If true, this cell helps form the hidden word
  solutionIndex?: number; // The number to display for the solution mapping
}

export interface ManualInput {
  word: string;
  clue: string;
}
