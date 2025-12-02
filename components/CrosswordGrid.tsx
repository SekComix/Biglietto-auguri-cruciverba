import React, { useState, useEffect, useRef, useMemo } from 'react';
import { CrosswordData, CellData, Direction, ThemeType } from '../types';
import { Gift, PartyPopper, Egg, Crown, KeyRound, Printer } from 'lucide-react';

interface CrosswordGridProps {
  data: CrosswordData;
  onComplete: () => void;
}

const THEME_STYLES: Record<ThemeType, any> = {
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
  const [solutionStatus, setSolutionStatus] = useState<string[]>([]);
  const inputRefs = useRef<(HTMLInputElement | null)[][]>([]);

  const theme = THEME_STYLES[data.theme] || THEME_STYLES.generic;
  const SuccessIcon = theme.successIcon;

  // Initialize Grid
  useEffect(() => {
    const newGrid: CellData[][] = Array(data.height).fill(null).map((_, y) =>
      Array(data.width).fill(null).map((_, x) => ({
        x,
        y,
        userChar: '',
        partOfWords: []
      }))
    );

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

    if (data.solution) {
      setSolutionStatus(Array(data.solution.word.length).fill(''));
      data.solution.cells.forEach(solCell => {
        if (newGrid[solCell.y] && newGrid[solCell.y][solCell.x]) {
          newGrid[solCell.y][solCell.x].isSolutionCell = true;
          newGrid[solCell.y][solCell.x].solutionIndex = solCell.index + 1;
        }
      });
    }

    inputRefs.current = Array(data.height).fill(null).map(() => Array(data.width).fill(null));
    setGrid(newGrid);
    setCompleted(false);
  }, [data]);

  // Validation
  useEffect(() => {
    if (grid.length === 0) return;
    let isFull = true, isCorrect = true;

    for (let y = 0; y < data.height; y++) {
      for (let x = 0; x < data.width; x++) {
        const cell = grid[y][x];
        if (cell.char) {
          if (!cell.userChar) isFull = false;
          if (cell.userChar.toUpperCase() !== cell.char) isCorrect = false;
        }
      }
    }

    if (data.solution) {
      const newSolStatus = [...solutionStatus];
      let solChanged = false;
      data.solution.cells.forEach(solCell => {
        const cell = grid[solCell.y]?.[solCell.x];
        if (cell && cell.userChar && newSolStatus[solCell.index] !== cell.userChar) {
            newSolStatus[solCell.index] = cell.userChar;
            solChanged = true;
        } else if ((!cell || !cell.userChar) && newSolStatus[solCell.index] !== '') {
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
  }, [grid, data]);

  // Interaction Handlers
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
      let nextX = x, nextY = y;
      if (currentDirection === Direction.ACROSS) nextX++; else nextY++;
      if (nextX < data.width && nextY < data.height && grid[nextY][nextX].char) {
          setSelectedCell({ x: nextX, y: nextY });
          inputRefs.current[nextY][nextX]?.focus();
      }
    }
  };

  const handlePrint = () => {
    const originalTitle = document.title;
    const year = new Date().getFullYear();
    const cleanName = data.recipientName.replace(/\s+/g, '_').toUpperCase();
    const cleanEvent = data.theme.toUpperCase();
    document.title = `${cleanEvent}_${year}_${cleanName}`;
    window.print();
    document.title = originalTitle;
  };

  const activeWord = useMemo(() => {
    if (!selectedCell) return null;
    const cell = grid[selectedCell.y]?.[selectedCell.x];
    if (!cell || cell.partOfWords.length === 0) return null;
    return data.words.find(w => cell.partOfWords.includes(w.id) && w.direction === currentDirection) || 
           data.words.find(w => cell.partOfWords.includes(w.id));
  }, [selectedCell, currentDirection, data]);

  const isCellInActiveWord = (x: number, y: number) => {
    if (!activeWord) return false;
    if (activeWord.direction === Direction.ACROSS) {
      return y === activeWord.startY && x >= activeWord.startX && x < activeWord.startX + activeWord.word.length;
    } else {
      return x === activeWord.startX && y >= activeWord.startY && y < activeWord.startY + activeWord.word.length;
    }
  };

  if (!grid.length) return <div>Caricamento...</div>;
  const cellSizeClass = data.width > 10 ? 'w-6 h-6 text-xs sm:w-8 sm:h-8 sm:text-base' : 'w-8 h-8 text-base sm:w-11 sm:h-11 sm:text-xl';

  return (
    <div className={`flex flex-col items-center gap-6 w-full max-w-5xl mx-auto ${theme.fontBody} relative print:w-full print:max-w-none`}>
      
      {/* Print Button (Hidden when printing) */}
      <button 
        onClick={handlePrint}
        className="fixed top-4 right-4 bg-white text-gray-800 p-3 rounded-full shadow-lg border border-gray-200 z-50 hover:bg-gray-50 print:hidden"
        title="Stampa Biglietto"
      >
        <Printer size={24} />
      </button>

      {/* Stickers (Visual Decoration) */}
      {data.stickers?.map((sticker, i) => (
        <div key={i} className={`absolute text-4xl sm:text-6xl animate-bounce pointer-events-none select-none print:animate-none
          ${i === 0 ? '-top-4 -left-4' : i === 1 ? '-top-4 -right-4' : i === 2 ? '-bottom-4 -left-4' : '-bottom-4 -right-4'}
        `}>
          {sticker}
        </div>
      ))}

      {/* Header Info (Print optimized) */}
      <div className="w-full flex justify-between items-start mb-4 print:mb-2">
         {data.images?.logo ? (
            <img src={data.images.logo} className="h-12 sm:h-16 object-contain" alt="Logo" />
         ) : <div/>}
         <div className="text-right">
             <h2 className={`${theme.fontTitle} text-xl sm:text-2xl font-bold ${theme.textTitle} print:text-black`}>Per {data.recipientName}</h2>
             <p className="text-sm opacity-70 print:text-black">{new Date().getFullYear()}</p>
         </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start w-full print:flex-row print:gap-4">
        
        {/* Left Column: Grid + Photo + Solution */}
        <div className="flex flex-col gap-6 mx-auto w-full lg:w-auto items-center">
          
          {data.images?.photo && (
              <div className="p-2 bg-white shadow-lg rotate-1 rounded-lg max-w-[200px] mb-4 print:border print:shadow-none">
                  <img src={data.images.photo} alt="Ricordo" className="rounded w-full" />
              </div>
          )}

          <div className={`relative p-2 rounded-lg shadow-2xl border-4 ${theme.bgGrid} ${theme.border} print:border-2 print:shadow-none print:bg-transparent print:border-black`}>
             <div 
               className={`grid gap-[1px] ${theme.bgGrid} print:gap-0 print:bg-black`}
               style={{ gridTemplateColumns: `repeat(${data.width}, min-content)` }}
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
                         relative ${cellSizeClass} flex items-center justify-center
                         ${isBlack ? `${theme.bgGrid} print:bg-gray-800` : `${theme.cell} print:bg-white print:text-black`}
                         ${isActive ? `z-10 ring-2 ${theme.cellActive} print:ring-0` : ''}
                         ${!isActive && isSolution ? `${theme.cellSolution} print:ring-4 print:ring-black` : ''}
                         ${!isActive && !isSolution && isInWord ? theme.cellWord : ''}
                         print:border print:border-black
                       `}
                       onClick={() => !isBlack && handleCellClick(x, y)}
                     >
                       {cell.number && <span className="absolute top-0 left-0.5 text-[0.5rem] leading-none font-bold opacity-60 pointer-events-none print:text-black">{cell.number}</span>}
                       {isSolution && <span className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-black text-white text-[0.4rem] flex items-center justify-center print:bg-white print:text-black print:border print:border-black">{cell.solutionIndex}</span>}
                       
                       {!isBlack && (
                         <input
                           ref={(el) => { inputRefs.current[y][x] = el; }}
                           type="text"
                           maxLength={1}
                           value={cell.userChar}
                           onChange={(e) => handleInput(x, y, e.target.value)}
                           className={`w-full h-full text-center bg-transparent border-none outline-none p-0 font-bold uppercase cursor-pointer print:text-black`}
                         />
                       )}
                     </div>
                   );
                 })
               ))}
             </div>
          </div>

          {/* Solution Dashboard */}
          {data.solution && (
             <div className={`${theme.bgCard} p-4 rounded-xl border-2 ${theme.border} text-center print:bg-white print:border-black print:w-full`}>
                <h4 className={`text-sm font-bold uppercase tracking-widest mb-3 flex items-center justify-center gap-2 ${theme.textTitle} print:text-black`}>
                   <KeyRound size={14} /> Soluzione Misteriosa
                </h4>
                <div className="flex flex-wrap justify-center gap-2">
                   {solutionStatus.map((char, i) => (
                      <div key={i} className="flex flex-col items-center gap-1">
                         <div className={`w-8 h-10 flex items-center justify-center text-xl font-bold uppercase border-b-4 rounded-t-md print:border border-black/20 bg-white/50 print:bg-white`}>
                            {char}
                         </div>
                         <span className="text-[10px] font-bold opacity-50 print:text-black">{i + 1}</span>
                      </div>
                   ))}
                </div>
             </div>
          )}
        </div>

        {/* Right Column: Clues */}
        <div className={`flex-1 w-full rounded-xl p-6 shadow-lg backdrop-blur-sm border ${theme.bgCard} ${theme.border} print:shadow-none print:border-0 print:bg-transparent`}>
          <h3 className={`${theme.fontTitle} text-2xl mb-4 text-center border-b pb-2 ${theme.textTitle} print:text-black`}>Indizi</h3>
          <div className="space-y-6">
            <div>
              <h4 className={`font-bold uppercase text-xs tracking-wider mb-2 ${theme.textAccent} print:text-black`}>Orizzontali</h4>
              <ul className={`space-y-1 text-sm ${data.theme === 'elegant' ? 'text-gray-300' : 'text-gray-700'} print:text-black`}>
                {data.words.filter(w => w.direction === Direction.ACROSS).map(w => (
                  <li key={w.id} className="leading-snug">
                    <span className="font-bold mr-1">{w.number}.</span> {w.clue} <span className="opacity-60 text-xs">({w.word.length})</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className={`font-bold uppercase text-xs tracking-wider mb-2 ${theme.textAccent} print:text-black`}>Verticali</h4>
              <ul className={`space-y-1 text-sm ${data.theme === 'elegant' ? 'text-gray-300' : 'text-gray-700'} print:text-black`}>
                {data.words.filter(w => w.direction === Direction.DOWN).map(w => (
                   <li key={w.id} className="leading-snug">
                   <span className="font-bold mr-1">{w.number}.</span> {w.clue} <span className="opacity-60 text-xs">({w.word.length})</span>
                 </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {completed && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 print:hidden">
           <div className={`${theme.bgCard} p-8 rounded-2xl max-w-md w-full text-center shadow-2xl border-4 ${theme.border} animate-bounce-in relative overflow-hidden`}>
              <SuccessIcon className={`w-16 h-16 mx-auto mb-4 ${theme.textTitle}`} />
              <h2 className={`${theme.fontTitle} text-4xl mb-4 ${theme.textTitle}`}>Congratulazioni!</h2>
              <button onClick={() => setCompleted(false)} className="bg-blue-500 text-white font-bold py-2 px-6 rounded-full">Chiudi</button>
           </div>
        </div>
      )}
    </div>
  );
};

export default CrosswordGrid;
