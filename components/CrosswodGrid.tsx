import React, { useState, useEffect, useRef, useMemo } from 'react';
import { CrosswordData, CellData, Direction, ThemeType } from '../types';
import { Gift, PartyPopper, Egg, Crown, KeyRound } from 'lucide-react';

interface CrosswordGridProps {
  data: CrosswordData;
  onComplete: () => void;
}

// Style configuration based on theme
const THEME_STYLES: Record<ThemeType, {
  fontTitle: string;
  fontBody: string;
  bgCard: string;
  bgGrid: string;
  cell: string;
  cellActive: string;
  cellWord: string;
  cellSolution: string; // New style for solution cells
  border: string;
  textTitle: string;
  textAccent: string;
  clueBanner: string;
  successIcon: any;
}> = {
  christmas: {
    fontTitle: 'font-christmas',
    fontBody: 'font-body',
    bgCard: 'bg-white/90',
    bgGrid: 'bg-xmas-dark',
    cell: 'bg-xmas-cream text-xmas-dark',
    cellActive: 'bg-yellow-200 ring-xmas-red',
    cellWord: 'bg-yellow-50',
    cellSolution: 'ring-4 ring-inset ring-xmas-gold bg-amber-50',
    border: 'border-xmas-gold',
    textTitle: 'text-xmas-red',
    textAccent: 'text-xmas-green',
    clueBanner: 'bg-xmas-gold/20 border-xmas-gold text-xmas-dark',
    successIcon: Gift
  },
  birthday: {
    fontTitle: 'font-fun',
    fontBody: 'font-body',
    bgCard: 'bg-white/95',
    bgGrid: 'bg-indigo-900',
    cell: 'bg-white text-indigo-900',
    cellActive: 'bg-bday-accent ring-bday-primary',
    cellWord: 'bg-pink-50',
    cellSolution: 'ring-4 ring-inset ring-bday-accent bg-yellow-50',
    border: 'border-bday-primary',
    textTitle: 'text-bday-primary',
    textAccent: 'text-bday-secondary',
    clueBanner: 'bg-bday-secondary/10 border-bday-secondary text-indigo-900',
    successIcon: PartyPopper
  },
  easter: {
    fontTitle: 'font-hand',
    fontBody: 'font-body',
    bgCard: 'bg-white/80',
    bgGrid: 'bg-teal-700',
    cell: 'bg-easter-yellow text-gray-800',
    cellActive: 'bg-easter-pink ring-white',
    cellWord: 'bg-white/50',
    cellSolution: 'ring-4 ring-inset ring-easter-pink bg-white',
    border: 'border-easter-green',
    textTitle: 'text-purple-600',
    textAccent: 'text-teal-600',
    clueBanner: 'bg-white/50 border-white text-gray-700',
    successIcon: Egg
  },
  elegant: {
    fontTitle: 'font-elegant',
    fontBody: 'font-body',
    bgCard: 'bg-neutral-900/90',
    bgGrid: 'bg-black',
    cell: 'bg-neutral-800 text-elegant-gold',
    cellActive: 'bg-neutral-700 ring-elegant-gold',
    cellWord: 'bg-neutral-800/80',
    cellSolution: 'ring-2 ring-inset ring-white bg-neutral-700',
    border: 'border-elegant-gold',
    textTitle: 'text-elegant-gold',
    textAccent: 'text-white',
    clueBanner: 'bg-elegant-gold/10 border-elegant-gold text-elegant-gold',
    successIcon: Crown
  },
  generic: {
     fontTitle: 'font-body',
     fontBody: 'font-body',
     bgCard: 'bg-white',
     bgGrid: 'bg-gray-800',
     cell: 'bg-white text-black',
     cellActive: 'bg-blue-200 ring-blue-500',
     cellWord: 'bg-blue-50',
     cellSolution: 'ring-4 ring-inset ring-green-400 bg-green-50',
     border: 'border-gray-300',
     textTitle: 'text-black',
     textAccent: 'text-gray-600',
     clueBanner: 'bg-gray-100 border-gray-300 text-black',
     successIcon: Gift
  }
};

const CrosswordGrid: React.FC<CrosswordGridProps> = ({ data, onComplete }) => {
  const [grid, setGrid] = useState<CellData[][]>([]);
  const [selectedCell, setSelectedCell] = useState<{ x: number; y: number } | null>(null);
  const [currentDirection, setCurrentDirection] = useState<Direction>(Direction.ACROSS);
  const [completed, setCompleted] = useState(false);
  
  // Solution state
  const [solutionStatus, setSolutionStatus] = useState<string[]>([]);
  
  const inputRefs = useRef<(HTMLInputElement | null)[][]>([]);

  const theme = THEME_STYLES[data.theme] || THEME_STYLES.generic;
  const SuccessIcon = theme.successIcon;

  useEffect(() => {
    const newGrid: CellData[][] = Array(data.height).fill(null).map((_, y) =>
      Array(data.width).fill(null).map((_, x) => ({
        x,
        y,
        userChar: '',
        partOfWords: []
      }))
    );

    // Map Words
    data.words.forEach(w => {
      for (let i = 0; i < w.word.length; i++) {
        const x = w.direction === Direction.ACROSS ? w.startX + i : w.startX;
        const y = w.direction === Direction.DOWN ? w.startY + i : w.startY;
        
        if (y < data.height && x < data.width) {
            newGrid[y][x].char = w.word[i].toUpperCase();
            newGrid[y][x].partOfWords.push(w.id);
            if (i === 0) {
              newGrid[y][x].number = w.number;
              newGrid[y][x].isWordStart = true;
            }
        }
      }
    });

    // Map Solution Cells if they exist
    if (data.solution) {
      setSolutionStatus(Array(data.solution.word.length).fill(''));
      data.solution.cells.forEach(solCell => {
        if (newGrid[solCell.y] && newGrid[solCell.y][solCell.x]) {
          newGrid[solCell.y][solCell.x].isSolutionCell = true;
          newGrid[solCell.y][solCell.x].solutionIndex = solCell.index + 1; // 1-based index for display
        }
      });
    }

    inputRefs.current = Array(data.height).fill(null).map(() => Array(data.width).fill(null));
    setGrid(newGrid);
    setCompleted(false);
  }, [data]);

  useEffect(() => {
    if (grid.length === 0) return;
    
    let isFull = true;
    let isCorrect = true;

    // Grid Validation
    for (let y = 0; y < data.height; y++) {
      for (let x = 0; x < data.width; x++) {
        const cell = grid[y][x];
        if (cell.char) {
          if (!cell.userChar) isFull = false;
          if (cell.userChar.toUpperCase() !== cell.char) isCorrect = false;
        }
      }
    }

    // Solution Mapping Update
    if (data.solution) {
      const newSolStatus = [...solutionStatus];
      let solChanged = false;
      data.solution.cells.forEach(solCell => {
        const cell = grid[solCell.y]?.[solCell.x];
        if (cell && cell.userChar) {
          if (newSolStatus[solCell.index] !== cell.userChar) {
            newSolStatus[solCell.index] = cell.userChar;
            solChanged = true;
          }
        } else if (newSolStatus[solCell.index] !== '') {
            newSolStatus[solCell.index] = '';
            solChanged = true;
        }
      });
      if (solChanged) setSolutionStatus(newSolStatus);
    }

    if (isFull && isCorrect && !completed) {
      setCompleted(true);
      onComplete();
    }
  }, [grid, data, completed, onComplete]);

  const activeWord = useMemo(() => {
    if (!selectedCell) return null;
    const cell = grid[selectedCell.y]?.[selectedCell.x];
    if (!cell || cell.partOfWords.length === 0) return null;

    const wordEntry = data.words.find(w => 
      cell.partOfWords.includes(w.id) && w.direction === currentDirection
    );

    return wordEntry || data.words.find(w => cell.partOfWords.includes(w.id));
  }, [selectedCell, currentDirection, data.words, grid]);

  useEffect(() => {
    if (activeWord && activeWord.direction !== currentDirection) {
      setCurrentDirection(activeWord.direction);
    }
  }, [activeWord]);

  const handleCellClick = (x: number, y: number) => {
    const cell = grid[y][x];
    if (!cell.char) return;

    if (selectedCell?.x === x && selectedCell?.y === y) {
      setCurrentDirection(prev => prev === Direction.ACROSS ? Direction.DOWN : Direction.ACROSS);
    } else {
      setSelectedCell({ x, y });
    }
    inputRefs.current[y][x]?.focus();
  };

  const handleInput = (x: number, y: number, char: string) => {
    if (!grid[y][x].char) return;

    const newGrid = [...grid];
    newGrid[y][x] = { ...newGrid[y][x], userChar: char.toUpperCase() };
    setGrid(newGrid);

    if (char) {
      let nextX = x;
      let nextY = y;
      if (currentDirection === Direction.ACROSS) nextX++;
      else nextY++;

      if (activeWord) {
         if (nextX < data.width && nextY < data.height && grid[nextY][nextX].char) {
            setSelectedCell({ x: nextX, y: nextY });
            inputRefs.current[nextY][nextX]?.focus();
         }
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, x: number, y: number) => {
    if (e.key === 'Backspace') {
      const newGrid = [...grid];
      if (!newGrid[y][x].userChar) {
         let prevX = x;
         let prevY = y;
         if (currentDirection === Direction.ACROSS) prevX--;
         else prevY--;
         
         if (prevX >= 0 && prevY >= 0 && grid[prevY][prevX].char) {
           setSelectedCell({ x: prevX, y: prevY });
           inputRefs.current[prevY][prevX]?.focus();
         }
      } else {
        newGrid[y][x].userChar = '';
        setGrid(newGrid);
      }
    }
  };

  const isCellInActiveWord = (x: number, y: number) => {
    if (!activeWord) return false;
    if (activeWord.direction === Direction.ACROSS) {
      return y === activeWord.startY && x >= activeWord.startX && x < activeWord.startX + activeWord.word.length;
    } else {
      return x === activeWord.startX && y >= activeWord.startY && y < activeWord.startY + activeWord.word.length;
    }
  };

  if (!grid.length) return <div>Caricamento griglia...</div>;

  const cellSizeClass = data.width > 10 ? 'w-6 h-6 text-xs sm:w-8 sm:h-8 sm:text-base' : 'w-8 h-8 text-base sm:w-11 sm:h-11 sm:text-xl';

  return (
    <div className={`flex flex-col items-center gap-6 w-full max-w-5xl mx-auto ${theme.fontBody}`}>
      
      {/* Current Clue Banner */}
      <div className={`${theme.clueBanner} border-l-4 p-4 w-full rounded-r-lg min-h-[4rem] flex items-center justify-center shadow-sm`}>
        {activeWord ? (
          <p className="font-medium text-center">
            <span className={`font-bold mr-2 ${data.theme === 'elegant' ? 'text-white' : ''}`}>{activeWord.number} {activeWord.direction === Direction.ACROSS ? 'Orizzontale' : 'Verticale'}:</span>
            {activeWord.clue}
          </p>
        ) : (
          <p className="opacity-60 italic">Seleziona una casella per iniziare</p>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start w-full">
        
        <div className="flex flex-col gap-6 mx-auto">
          {/* The Grid */}
          <div className={`relative p-2 rounded-lg shadow-2xl border-4 ${theme.bgGrid} ${theme.border}`}>
             <div 
               className={`grid gap-[1px] ${theme.bgGrid}`}
               style={{ 
                 gridTemplateColumns: `repeat(${data.width}, min-content)` 
               }}
             >
               {grid.map((row, y) => (
                 row.map((cell, x) => {
                   const isBlack = !cell.char;
                   const isActive = selectedCell?.x === x && selectedCell?.y === y;
                   const isInWord = !isBlack && isCellInActiveWord(x, y);
                   const isSolution = cell.isSolutionCell;
                   
                   return (
                     <div 
                       key={`${x}-${y}`} 
                       className={`
                         relative ${cellSizeClass} flex items-center justify-center transition-all duration-150
                         ${isBlack ? theme.bgGrid : theme.cell}
                         ${isActive ? `z-10 ring-2 ${theme.cellActive}` : ''}
                         ${!isActive && isSolution ? theme.cellSolution : ''}
                         ${!isActive && !isSolution && isInWord ? theme.cellWord : ''}
                       `}
                       onClick={() => !isBlack && handleCellClick(x, y)}
                     >
                       {/* Word Number */}
                       {cell.number && (
                         <span className="absolute top-0 left-0.5 text-[0.5rem] leading-none font-bold opacity-60 pointer-events-none">
                           {cell.number}
                         </span>
                       )}
                       
                       {/* Solution Index (Badge) */}
                       {isSolution && (
                         <span className="absolute -bottom-1 -right-1 flex items-center justify-center w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-black text-white text-[0.5rem] font-bold z-20 pointer-events-none shadow-sm">
                           {cell.solutionIndex}
                         </span>
                       )}

                       {!isBlack && (
                         <input
                           ref={(el) => { inputRefs.current[y][x] = el; }}
                           type="text"
                           maxLength={1}
                           value={cell.userChar}
                           onChange={(e) => handleInput(x, y, e.target.value)}
                           onKeyDown={(e) => handleKeyDown(e, x, y)}
                           className={`
                             w-full h-full text-center bg-transparent border-none outline-none p-0 font-bold uppercase
                             focus:ring-0 cursor-pointer caret-transparent text-inherit
                           `}
                         />
                       )}
                     </div>
                   );
                 })
               ))}
             </div>
          </div>

          {/* Solution Dashboard (Wheel of Fortune style) */}
          {data.solution && (
             <div className={`${theme.bgCard} p-4 rounded-xl border-2 ${theme.border} text-center`}>
                <h4 className={`text-sm font-bold uppercase tracking-widest mb-3 flex items-center justify-center gap-2 ${theme.textTitle}`}>
                   <KeyRound size={14} /> Soluzione Misteriosa
                </h4>
                <div className="flex flex-wrap justify-center gap-2">
                   {solutionStatus.map((char, i) => (
                      <div key={i} className="flex flex-col items-center gap-1">
                         <div className={`
                            w-8 h-10 sm:w-10 sm:h-12 flex items-center justify-center text-xl font-bold uppercase border-b-4 rounded-t-md transition-all
                            ${char ? `${theme.cellActive} border-transparent` : 'bg-black/10 border-black/20'}
                            ${theme.textTitle}
                         `}>
                            {char}
                         </div>
                         <span className="text-[10px] font-bold opacity-50">{i + 1}</span>
                      </div>
                   ))}
                </div>
             </div>
          )}
        </div>

        {/* Clue Lists */}
        <div className={`flex-1 w-full rounded-xl p-6 shadow-lg backdrop-blur-sm border ${theme.bgCard} ${theme.border} max-h-[500px] overflow-hidden flex flex-col`}>
          <h3 className={`${theme.fontTitle} text-2xl mb-4 text-center border-b pb-2 ${theme.textTitle}`}>Indizi</h3>
          <div className="overflow-y-auto clue-scroll flex-1 pr-2 space-y-6">
            
            <div>
              <h4 className={`font-bold uppercase text-xs tracking-wider mb-2 ${theme.textAccent}`}>Orizzontali</h4>
              <ul className={`space-y-2 text-sm ${data.theme === 'elegant' ? 'text-gray-300' : 'text-gray-700'}`}>
                {data.words.filter(w => w.direction === Direction.ACROSS).map(w => (
                  <li 
                    key={w.id} 
                    className={`cursor-pointer p-1 rounded hover:opacity-75 transition-colors ${activeWord?.id === w.id ? 'font-bold opacity-100 ring-1 ring-current' : 'opacity-80'}`}
                    onClick={() => {
                      setSelectedCell({ x: w.startX, y: w.startY });
                      setCurrentDirection(Direction.ACROSS);
                      inputRefs.current[w.startY][w.startX]?.focus();
                    }}
                  >
                    <span className="font-bold mr-1">{w.number}.</span> {w.clue}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className={`font-bold uppercase text-xs tracking-wider mb-2 ${theme.textAccent}`}>Verticali</h4>
              <ul className={`space-y-2 text-sm ${data.theme === 'elegant' ? 'text-gray-300' : 'text-gray-700'}`}>
                {data.words.filter(w => w.direction === Direction.DOWN).map(w => (
                   <li 
                   key={w.id} 
                   className={`cursor-pointer p-1 rounded hover:opacity-75 transition-colors ${activeWord?.id === w.id ? 'font-bold opacity-100 ring-1 ring-current' : 'opacity-80'}`}
                   onClick={() => {
                     setSelectedCell({ x: w.startX, y: w.startY });
                     setCurrentDirection(Direction.DOWN);
                     inputRefs.current[w.startY][w.startX]?.focus();
                   }}
                 >
                   <span className="font-bold mr-1">{w.number}.</span> {w.clue}
                 </li>
                ))}
              </ul>
            </div>

          </div>
        </div>
      </div>

      {completed && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
           <div className={`${theme.bgCard} p-8 rounded-2xl max-w-md w-full text-center shadow-2xl border-4 ${theme.border} animate-bounce-in relative overflow-hidden`}>
              <SuccessIcon className={`w-16 h-16 mx-auto mb-4 ${theme.textTitle}`} />
              <h2 className={`${theme.fontTitle} text-4xl mb-4 ${theme.textTitle}`}>Congratulazioni!</h2>
              {data.solution && (
                 <div className="mb-6 p-4 bg-yellow-50 rounded-xl border-2 border-yellow-200">
                    <p className="text-xs uppercase text-yellow-600 font-bold mb-1">Parola Misteriosa</p>
                    <p className="text-2xl font-bold tracking-widest text-black">{data.solution.word}</p>
                 </div>
              )}
              <p className={`font-body text-lg mb-6 ${data.theme === 'elegant' ? 'text-gray-300' : 'text-gray-700'}`}>{data.message}</p>
              <button 
                onClick={() => setCompleted(false)}
                className={`text-white font-bold py-2 px-6 rounded-full transition-colors shadow-lg ${
                  data.theme === 'christmas' ? 'bg-xmas-red' : 
                  data.theme === 'birthday' ? 'bg-bday-primary' :
                  data.theme === 'easter' ? 'bg-easter-green' : 'bg-elegant-gold text-black'
                }`}
              >
                Chiudi
              </button>
           </div>
        </div>
      )}
    </div>
  );
};

export default CrosswordGrid;
