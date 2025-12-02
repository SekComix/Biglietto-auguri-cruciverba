import React, { useState, useEffect, useRef, useMemo } from 'react';
import { CrosswordData, CellData, Direction, ThemeType } from '../types';
import { Gift, PartyPopper, Egg, Crown, Printer, Edit, Check } from 'lucide-react';

interface CrosswordGridProps {
  data: CrosswordData;
  onComplete: () => void;
}

const THEME_STYLES: Record<ThemeType, any> = {
  christmas: {
    fontTitle: 'font-christmas',
    cell: 'bg-xmas-cream text-xmas-dark',
    cellActive: 'bg-yellow-200',
    cellSolution: 'ring-4 ring-xmas-gold bg-amber-50',
    successIcon: Gift,
    printFont: 'font-serif'
  },
  birthday: {
    fontTitle: 'font-fun',
    cell: 'bg-white text-indigo-900',
    cellActive: 'bg-pink-100',
    cellSolution: 'ring-4 ring-pink-500 bg-yellow-50',
    successIcon: PartyPopper,
    printFont: 'font-sans'
  },
  easter: {
    fontTitle: 'font-hand',
    cell: 'bg-yellow-50 text-gray-800',
    cellActive: 'bg-green-100',
    cellSolution: 'ring-4 ring-green-400 bg-white',
    successIcon: Egg,
    printFont: 'font-cursive'
  },
  elegant: {
    fontTitle: 'font-elegant',
    cell: 'bg-neutral-800 text-gold-500',
    cellActive: 'bg-neutral-700',
    cellSolution: 'ring-2 ring-white bg-neutral-600',
    successIcon: Crown,
    printFont: 'font-serif'
  },
  generic: {
     fontTitle: 'font-body',
     cell: 'bg-white text-black',
     cellActive: 'bg-blue-100',
     cellSolution: 'ring-4 ring-green-400 bg-green-50',
     successIcon: Gift,
     printFont: 'font-sans'
  }
};

const CrosswordGrid: React.FC<CrosswordGridProps> = ({ data, onComplete }) => {
  const [grid, setGrid] = useState<CellData[][]>([]);
  const [selectedCell, setSelectedCell] = useState<{ x: number; y: number } | null>(null);
  const [currentDirection, setCurrentDirection] = useState<Direction>(Direction.ACROSS);
  const [completed, setCompleted] = useState(false);
  const [solutionStatus, setSolutionStatus] = useState<string[]>([]);
  const [editableMessage, setEditableMessage] = useState(data.message);
  const [isEditingMessage, setIsEditingMessage] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[][]>([]);

  const theme = THEME_STYLES[data.theme] || THEME_STYLES.generic;
  const SuccessIcon = theme.successIcon;

  // Init
  useEffect(() => {
    const newGrid: CellData[][] = Array(data.height).fill(null).map((_, y) =>
      Array(data.width).fill(null).map((_, x) => ({ x, y, userChar: '', partOfWords: [] }))
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
        if (newGrid[solCell.y]?.[solCell.x]) {
          newGrid[solCell.y][solCell.x].isSolutionCell = true;
          newGrid[solCell.y][solCell.x].solutionIndex = solCell.index + 1;
        }
      });
    }

    inputRefs.current = Array(data.height).fill(null).map(() => Array(data.width).fill(null));
    setGrid(newGrid);
    setCompleted(false);
    setEditableMessage(data.message);
  }, [data]);

  // Validation
  useEffect(() => {
    if (!grid.length) return;
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
    
    // Update Hidden Solution Status
    if (data.solution) {
        const newSolStatus = [...solutionStatus];
        let changed = false;
        data.solution.cells.forEach(c => {
            const cell = grid[c.y][c.x];
            if (cell.userChar && newSolStatus[c.index] !== cell.userChar) {
                newSolStatus[c.index] = cell.userChar;
                changed = true;
            } else if (!cell.userChar && newSolStatus[c.index] !== '') {
                newSolStatus[c.index] = '';
                changed = true;
            }
        });
        if (changed) setSolutionStatus(newSolStatus);
    }

    if (isFull && isCorrect && !completed) {
      setCompleted(true);
      onComplete();
    }
  }, [grid]);

  const handleCellClick = (x: number, y: number) => {
    if (!grid[y][x].char) return;
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
    newGrid[y][x].userChar = char.toUpperCase();
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
    const cleanName = data.recipientName.replace(/\s+/g, '_').toUpperCase();
    document.title = `${data.theme.toUpperCase()}_${new Date().getFullYear()}_${cleanName}`;
    window.print();
    document.title = originalTitle;
  };

  const activeWord = useMemo(() => {
    if (!selectedCell) return null;
    const cell = grid[selectedCell.y]?.[selectedCell.x];
    if (!cell || !cell.partOfWords.length) return null;
    return data.words.find(w => cell.partOfWords.includes(w.id) && w.direction === currentDirection) || 
           data.words.find(w => cell.partOfWords.includes(w.id));
  }, [selectedCell, currentDirection, data]);

  if (!grid.length) return <div>Caricamento...</div>;

  // Render Grid Component (Shared between Screen and Print)
  const renderGridCells = (isPrint = false) => (
    <div 
      className="grid gap-[2px] bg-black/10 p-2 rounded-lg border-4 border-black/20"
      style={{ 
        gridTemplateColumns: `repeat(${data.width}, minmax(0, 1fr))`,
        aspectRatio: `${data.width}/${data.height}`
      }}
    >
      {grid.map((row, y) =>
        row.map((cell, x) => {
          const isSelected = !isPrint && selectedCell?.x === x && selectedCell?.y === y;
          const isInActiveWord = !isPrint && !isSelected && activeWord && 
            ((activeWord.direction === Direction.ACROSS && y === activeWord.startY && x >= activeWord.startX && x < activeWord.startX + activeWord.word.length) ||
             (activeWord.direction === Direction.DOWN && x === activeWord.startX && y >= activeWord.startY && y < activeWord.startY + activeWord.word.length));
          
          if (!cell.char) {
            return <div key={`${x}-${y}`} className="bg-black/5 rounded-sm print:bg-gray-300 print:border print:border-gray-400" />;
          }

          return (
            <div
              key={`${x}-${y}`}
              onClick={() => handleCellClick(x, y)}
              className={`
                relative flex items-center justify-center text-lg md:text-xl font-bold uppercase select-none cursor-pointer transition-colors
                ${isPrint ? 'bg-white border-2 border-black text-black' : `${theme.cell} rounded-md shadow-sm`}
                ${isSelected ? theme.cellActive : ''}
                ${isInActiveWord ? 'brightness-95' : ''}
                ${cell.isSolutionCell && !isPrint ? theme.cellSolution : ''}
                ${cell.isSolutionCell && isPrint ? 'border-4 border-double border-black' : ''}
              `}
            >
              {cell.number && (
                <span className="absolute top-0.5 left-0.5 text-[8px] md:text-[10px] leading-none opacity-70 font-sans">
                  {cell.number}
                </span>
              )}
              
              {/* Screen Input */}
              {!isPrint && (
                <input
                  ref={(el) => { inputRefs.current[y][x] = el; }}
                  className="w-full h-full bg-transparent text-center outline-none cursor-pointer"
                  value={cell.userChar}
                  maxLength={1}
                  onChange={(e) => handleInput(x, y, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Backspace' && !cell.userChar) {
                      // Move back logic could go here
                    }
                  }}
                />
              )}
              
              {/* Print Static - Empty box for writing */}
              {isPrint && cell.isSolutionCell && (
                  <span className="absolute bottom-0 right-1 text-[8px]">{cell.solutionIndex}</span>
              )}
            </div>
          );
        })
      )}
    </div>
  );

  return (
    <>
      <button onClick={handlePrint} className="fixed top-4 right-4 bg-white text-black p-3 rounded-full shadow-lg border z-50 hover:bg-gray-50 no-print">
        <Printer />
      </button>

      {/* --- SCREEN MODE --- */}
      <div className="max-w-4xl mx-auto no-print">
        
        {/* Header Editable */}
        <div className="text-center mb-6 text-white bg-black/20 p-4 rounded-xl backdrop-blur-sm">
             <div className="flex justify-center items-center gap-2 mb-2">
                <Edit size={16} className="opacity-50" />
                <span className="text-xs uppercase font-bold opacity-70">Modifica il messaggio prima di stampare</span>
             </div>
             <h2 className={`${theme.fontTitle} text-3xl font-bold`}>{data.title}</h2>
             {isEditingMessage ? (
               <div className="flex gap-2 justify-center mt-2">
                 <input 
                   className="text-black p-1 rounded w-full max-w-md"
                   value={editableMessage}
                   onChange={e => setEditableMessage(e.target.value)}
                 />
                 <button onClick={() => setIsEditingMessage(false)} className="bg-green-500 p-1 rounded"><Check size={16}/></button>
               </div>
             ) : (
               <p onClick={() => setIsEditingMessage(true)} className="cursor-pointer hover:bg-white/10 p-1 rounded transition-colors inline-block">{editableMessage}</p>
             )}
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Grid */}
          <div className="order-2 md:order-1">
             {renderGridCells(false)}
             
             {/* Hidden Solution Dashboard */}
             {data.solution && (
                 <div className="mt-6 p-4 bg-white/90 rounded-xl shadow-lg">
                    <h3 className="text-center text-sm font-bold uppercase text-gray-500 mb-2">Soluzione Misteriosa</h3>
                    <div className="flex justify-center gap-2">
                        {data.solution.cells.map((_, i) => (
                            <div key={i} className="w-8 h-10 border-b-2 border-gray-400 flex items-end justify-center font-bold text-xl relative">
                                {solutionStatus[i] || <span className="text-gray-300 text-xs absolute top-0 left-0">{i+1}</span>}
                            </div>
                        ))}
                    </div>
                 </div>
             )}
          </div>

          {/* Clues */}
          <div className="order-1 md:order-2 bg-white/90 backdrop-blur rounded-xl p-6 shadow-xl h-[600px] overflow-hidden flex flex-col">
            <h3 className="font-bold text-xl mb-4 flex items-center gap-2 text-gray-800">
              <span className="text-2xl">🔍</span> Indizi
            </h3>
            
            <div className="overflow-y-auto clue-scroll pr-2 flex-1">
               {activeWord && (
                 <div className="sticky top-0 bg-blue-50 border-l-4 border-blue-500 p-3 mb-4 rounded shadow-sm">
                   <span className="text-xs font-bold text-blue-500 uppercase tracking-wider block mb-1">
                     Selezionato ({activeWord.direction === 'across' ? 'Orizzontale' : 'Verticale'})
                   </span>
                   <p className="font-medium text-lg text-blue-900">
                     {activeWord.number}. {activeWord.clue} <span className="text-sm text-blue-400">({activeWord.word.length})</span>
                   </p>
                 </div>
               )}

               <div className="space-y-6">
                 <div>
                   <h4 className="font-bold text-gray-400 text-xs uppercase tracking-wider mb-3">Orizzontali</h4>
                   <ul className="space-y-3">
                     {data.words.filter(w => w.direction === Direction.ACROSS).map(w => (
                       <li key={w.id} 
                           className={`text-sm p-2 rounded cursor-pointer hover:bg-gray-100 transition-colors ${activeWord?.id === w.id ? 'bg-blue-50 text-blue-800 font-bold' : 'text-gray-700'}`}
                           onClick={() => {
                             setSelectedCell({ x: w.startX, y: w.startY });
                             setCurrentDirection(Direction.ACROSS);
                           }}
                       >
                         <span className="font-bold mr-1">{w.number}.</span> {w.clue} <span className="text-gray-400 text-xs">({w.word.length})</span>
                       </li>
                     ))}
                   </ul>
                 </div>

                 <div>
                   <h4 className="font-bold text-gray-400 text-xs uppercase tracking-wider mb-3">Verticali</h4>
                   <ul className="space-y-3">
                     {data.words.filter(w => w.direction === Direction.DOWN).map(w => (
                       <li key={w.id} 
                           className={`text-sm p-2 rounded cursor-pointer hover:bg-gray-100 transition-colors ${activeWord?.id === w.id ? 'bg-blue-50 text-blue-800 font-bold' : 'text-gray-700'}`}
                           onClick={() => {
                             setSelectedCell({ x: w.startX, y: w.startY });
                             setCurrentDirection(Direction.DOWN);
                           }}
                       >
                         <span className="font-bold mr-1">{w.number}.</span> {w.clue} <span className="text-gray-400 text-xs">({w.word.length})</span>
                       </li>
                     ))}
                   </ul>
                 </div>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- PRINT MODE (Double Page Booklet) --- */}
      {/* Page 1: External (Back | Front) */}
      <div className="print-page hidden print:flex">
         {/* Left: Back Cover (Empty or Logo small) */}
         <div className="w-1/2 h-full border-r border-dashed border-gray-300 flex items-end justify-center pb-10">
            <div className="text-center opacity-50 text-xs">
                Creato con Enigmistica Auguri
            </div>
         </div>
         {/* Right: Front Cover */}
         <div className="w-1/2 h-full flex flex-col items-center justify-center p-12 text-center">
             {data.images?.extraImage && <img src={data.images.extraImage} className="w-32 h-32 object-contain mb-8 opacity-80" />}
             <h1 className={`${theme.fontTitle} text-6xl mb-4`}>Per</h1>
             <div className="text-4xl font-bold border-b-4 border-black pb-2 px-8 min-w-[200px]">
                 {data.recipientName}
             </div>
             {data.eventDate && <div className="mt-8 text-xl text-gray-500">{data.eventDate}</div>}
             <div className="absolute top-0 right-0 p-8">
                 {data.stickers?.[0] && <span className="text-6xl">{data.stickers[0]}</span>}
             </div>
         </div>
      </div>

      {/* Page 2: Internal (Grid | Message) */}
      <div className="print-page hidden print:flex">
          {/* Left: Grid & Clues */}
          <div className="w-1/2 h-full p-8 border-r border-dashed border-gray-300 flex flex-col">
              <h2 className="text-2xl font-bold mb-4 text-center">Cruciverba</h2>
              <div className="mb-6 mx-auto w-full max-w-[90%]">
                 {renderGridCells(true)}
              </div>
              <div className="flex-1 grid grid-cols-2 gap-4 text-[10px]">
                  <div>
                      <h4 className="font-bold border-b border-black mb-1">Orizzontali</h4>
                      <ul className="list-none space-y-1">
                          {data.words.filter(w => w.direction === Direction.ACROSS).map(w => (
                              <li key={w.id}><span className="font-bold">{w.number}.</span> {w.clue} ({w.word.length})</li>
                          ))}
                      </ul>
                  </div>
                  <div>
                      <h4 className="font-bold border-b border-black mb-1">Verticali</h4>
                      <ul className="list-none space-y-1">
                          {data.words.filter(w => w.direction === Direction.DOWN).map(w => (
                              <li key={w.id}><span className="font-bold">{w.number}.</span> {w.clue} ({w.word.length})</li>
                          ))}
                      </ul>
                  </div>
              </div>
          </div>

          {/* Right: Greetings */}
          <div className="w-1/2 h-full p-12 flex flex-col items-center relative">
              <div className="text-right w-full mb-12">
                  <p className="text-lg italic text-gray-500">{data.eventDate}</p>
              </div>
              
              <div className="flex-1 flex flex-col justify-center text-center">
                  <h3 className={`${theme.fontTitle} text-4xl mb-6`}>{data.title}</h3>
                  <p className={`text-2xl leading-relaxed whitespace-pre-wrap ${theme.printFont}`}>
                      {editableMessage}
                  </p>
                  
                  {data.solution && (
                      <div className="mt-12 p-4 border-2 border-black rounded-lg">
                          <p className="text-sm uppercase font-bold mb-2">Soluzione:</p>
                          <div className="flex gap-2 justify-center">
                             {Array(data.solution.word.length).fill(0).map((_,i) => (
                                 <div key={i} className="w-8 h-8 border-b-2 border-black relative">
                                     <span className="absolute top-0 left-0 text-[8px]">{i+1}</span>
                                 </div>
                             ))}
                          </div>
                      </div>
                  )}
              </div>

              {data.images?.photo && (
                  <div className="mt-8">
                      <img src={data.images.photo} className="max-h-48 rounded shadow-lg grayscale" style={{ filter: 'grayscale(100%)' }} />
                  </div>
              )}

              {/* Stickers Corners */}
              <div className="absolute bottom-4 right-4 text-4xl">{data.stickers?.[1]}</div>
              <div className="absolute top-4 left-4 text-4xl">{data.stickers?.[2]}</div>
          </div>
      </div>
    </>
  );
};

export default CrosswordGrid;
