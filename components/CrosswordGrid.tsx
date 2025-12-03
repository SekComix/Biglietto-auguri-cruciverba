import React, { useState, useEffect, useRef, useMemo } from 'react';
import { CrosswordData, CellData, Direction, ThemeType } from '../types';
import { Gift, PartyPopper, Egg, Crown, Printer, Edit, Check, Scissors } from 'lucide-react';

interface CrosswordGridProps {
  data: CrosswordData;
  onComplete: () => void;
}

// Visual Themes Configuration for "Wow" Effect
const THEME_ASSETS: Record<ThemeType, any> = {
  christmas: {
    fontTitle: 'font-christmas',
    printBorder: 'border-double border-8 border-red-800',
    bgPattern: 'radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(240,255,240,0.4) 100%)',
    decoration: '🎄',
    accentColor: '#165B33'
  },
  birthday: {
    fontTitle: 'font-fun',
    printBorder: 'border-dashed border-4 border-pink-500',
    bgPattern: 'radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(255,240,245,0.4) 100%)',
    decoration: '🎈',
    accentColor: '#FF006E'
  },
  easter: {
    fontTitle: 'font-hand',
    printBorder: 'border-dotted border-8 border-green-400',
    bgPattern: 'radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(240,255,255,0.5) 100%)',
    decoration: '🐰',
    accentColor: '#3A86FF'
  },
  elegant: {
    fontTitle: 'font-elegant',
    printBorder: 'border-4 border-double border-gray-800',
    bgPattern: 'linear-gradient(45deg, #fdfbfb 0%, #ebedee 100%)',
    decoration: '✨',
    accentColor: '#121212'
  },
  generic: {
     fontTitle: 'font-body',
     printBorder: 'border-4 border-gray-300',
     bgPattern: 'white',
     decoration: '🎁',
     accentColor: '#000000'
  }
};

const CrosswordGrid: React.FC<CrosswordGridProps> = ({ data, onComplete }) => {
  const [grid, setGrid] = useState<CellData[][]>([]);
  const [selectedCell, setSelectedCell] = useState<{ x: number; y: number } | null>(null);
  const [currentDirection, setCurrentDirection] = useState<Direction>(Direction.ACROSS);
  const [completed, setCompleted] = useState(false);
  const [editableMessage, setEditableMessage] = useState(data.message);
  const [isEditingMessage, setIsEditingMessage] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[][]>([]);

  const themeAssets = THEME_ASSETS[data.theme] || THEME_ASSETS.generic;

  // Init Grid Logic
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

  const renderGridCells = (isPrint = false) => (
    <div 
      className={`grid gap-[1px] ${isPrint ? '' : 'bg-black/10 p-2 rounded-lg border-4 border-black/20'}`}
      style={{ 
        gridTemplateColumns: `repeat(${data.width}, minmax(0, 1fr))`,
        aspectRatio: `${data.width}/${data.height}`,
        width: isPrint ? '100%' : 'auto'
      }}
    >
      {grid.map((row, y) =>
        row.map((cell, x) => {
          const isSelected = !isPrint && selectedCell?.x === x && selectedCell?.y === y;
          const isInActiveWord = !isPrint && !isSelected && activeWord && 
            ((activeWord.direction === Direction.ACROSS && y === activeWord.startY && x >= activeWord.startX && x < activeWord.startX + activeWord.word.length) ||
             (activeWord.direction === Direction.DOWN && x === activeWord.startX && y >= activeWord.startY && y < activeWord.startY + activeWord.word.length));
          
          if (!cell.char) {
             // Blocked cells
             return <div key={`${x}-${y}`} className={`${isPrint ? 'bg-gray-200 border border-gray-300' : 'bg-black/5 rounded-sm'}`} />;
          }

          return (
            <div
              key={`${x}-${y}`}
              onClick={() => !isPrint && handleCellClick(x, y)}
              className={`
                relative flex items-center justify-center text-lg md:text-xl font-bold uppercase select-none
                ${isPrint ? 'bg-white border border-gray-800 text-black h-full' : 'bg-white rounded-md shadow-sm cursor-pointer transition-colors'}
                ${isSelected ? 'bg-yellow-200' : ''}
                ${isInActiveWord ? 'brightness-95' : ''}
                ${cell.isSolutionCell && isPrint ? 'bg-yellow-50 !border-2 !border-black' : ''}
              `}
            >
              {cell.number && (
                <span className={`absolute top-0.5 left-0.5 leading-none opacity-70 font-sans ${isPrint ? 'text-[8px]' : 'text-[10px]'}`}>
                  {cell.number}
                </span>
              )}
              
              {!isPrint ? (
                <input
                  ref={(el) => { inputRefs.current[y][x] = el; }}
                  className="w-full h-full bg-transparent text-center outline-none cursor-pointer"
                  value={cell.userChar}
                  maxLength={1}
                  onChange={(e) => handleInput(x, y, e.target.value)}
                />
              ) : (
                // Print mode empty cell
                cell.isSolutionCell && <span className="absolute bottom-0 right-0.5 text-[7px] font-bold text-gray-500">SOL.{cell.solutionIndex}</span>
              )}
            </div>
          );
        })
      )}
    </div>
  );

  return (
    <>
      <button onClick={handlePrint} className="fixed top-4 right-4 bg-white text-black p-3 rounded-full shadow-lg border z-50 hover:bg-gray-50 no-print flex items-center gap-2 font-bold">
        <Printer size={20} /> Stampa Biglietto
      </button>

      {/* --- SCREEN MODE (INTERACTIVE) --- */}
      <div className="max-w-4xl mx-auto no-print pb-20">
         {/* ... (Existing Screen Interface omitted for brevity, keeping same logic as before) ... */}
         {/* For the sake of XML limit, assuming screen render logic is same as previous step. Focused on PRINT below */}
         <div className="text-center mb-6 text-white bg-black/20 p-4 rounded-xl backdrop-blur-sm">
             <div className="flex justify-center items-center gap-2 mb-2">
                <Edit size={16} className="opacity-50" />
                <span className="text-xs uppercase font-bold opacity-70">Modifica il messaggio prima di stampare</span>
             </div>
             <h2 className={`${themeAssets.fontTitle} text-3xl font-bold`}>{data.title}</h2>
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
            <div className="bg-white/90 p-4 rounded-xl shadow-xl">{renderGridCells(false)}</div>
            <div className="bg-white/90 p-4 rounded-xl shadow-xl h-[500px] overflow-y-auto clue-scroll">
                <h3 className="font-bold mb-2">Indizi</h3>
                <div className="space-y-4 text-sm">
                    <div>
                        <h4 className="font-bold text-gray-500 text-xs uppercase">Orizzontali</h4>
                        <ul>{data.words.filter(w => w.direction === Direction.ACROSS).map(w => <li key={w.id}><b className="mr-1">{w.number}.</b>{w.clue}</li>)}</ul>
                    </div>
                    <div>
                        <h4 className="font-bold text-gray-500 text-xs uppercase">Verticali</h4>
                        <ul>{data.words.filter(w => w.direction === Direction.DOWN).map(w => <li key={w.id}><b className="mr-1">{w.number}.</b>{w.clue}</li>)}</ul>
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* --- PRINT MODE (A4 FOLDABLE BOOKLET) --- */}
      
      {/* SHEET 1 (SIDE A): RETRO (Left) + COVER (Right) */}
      <div className="print-sheet hidden print:flex" style={{ background: themeAssets.bgPattern }}>
         
         {/* LEFT HALF: BACK COVER (RETRO) */}
         <div className="print-half justify-end items-center border-r border-gray-300 border-dashed relative">
            <div className="absolute top-10 left-10 opacity-10 text-6xl rotate-12">{themeAssets.decoration}</div>
            <div className="text-center opacity-40">
                <p className="text-xs uppercase tracking-widest font-sans">Realizzato con</p>
                <p className="font-bold font-serif">Enigmistica Auguri</p>
                <div className="mt-2 w-8 h-8 mx-auto border border-gray-400 rounded-full flex items-center justify-center text-xs">©</div>
            </div>
         </div>

         {/* RIGHT HALF: FRONT COVER (FRONTE) */}
         <div className={`print-half flex-col items-center justify-center text-center p-12 ${themeAssets.printBorder} m-4 rounded-xl bg-white/50`}>
             <div className="mb-12">
                {data.stickers?.[0] ? <span className="text-[100px]">{data.stickers[0]}</span> : <span className="text-[100px]">{themeAssets.decoration}</span>}
             </div>
             
             <h1 className={`${themeAssets.fontTitle} text-7xl mb-6 leading-tight`} style={{ color: themeAssets.accentColor }}>Per</h1>
             <div className="text-5xl font-bold border-b-4 border-black pb-4 px-12 inline-block min-w-[200px]">
                 {data.recipientName}
             </div>
             
             <div className="mt-auto opacity-75 font-serif italic text-xl">
                 Apri per giocare ✨
             </div>
         </div>
      </div>

      {/* SHEET 2 (SIDE B): INSIDE LEFT (Grid) + INSIDE RIGHT (Greetings) */}
      <div className="print-sheet hidden print:flex" style={{ background: themeAssets.bgPattern }}>
         
         {/* LEFT HALF: PUZZLE */}
         <div className="print-half p-8 border-r border-gray-300 border-dashed">
            <h2 className="text-3xl font-bold text-center mb-6 uppercase tracking-wider" style={{ color: themeAssets.accentColor }}>Il Cruciverba</h2>
            
            {/* Grid Container - Scaled to fit */}
            <div className="w-full max-w-[90%] mx-auto mb-6 aspect-square bg-white shadow-sm border-2 border-gray-800 p-2">
                {renderGridCells(true)}
            </div>

            {/* Compact Clues */}
            <div className="grid grid-cols-2 gap-4 text-[9px] leading-tight font-sans bg-white/80 p-4 rounded-lg flex-1 overflow-hidden">
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

         {/* RIGHT HALF: GREETINGS */}
         <div className={`print-half items-center text-center p-10 flex flex-col relative`}>
             
             {/* Date Header */}
             <div className="w-full text-right mb-8">
                <span className="font-serif italic text-xl border-b border-gray-400 pb-1">{data.eventDate || new Date().toLocaleDateString()}</span>
             </div>

             {/* Main Greeting Area */}
             <div className="flex-1 flex flex-col justify-center items-center w-full">
                 <h3 className={`${themeAssets.fontTitle} text-5xl mb-8 leading-tight`} style={{ color: themeAssets.accentColor }}>
                    {data.title}
                 </h3>
                 
                 <p className="font-script text-3xl leading-relaxed whitespace-pre-wrap max-w-sm mx-auto text-gray-800">
                     {editableMessage}
                 </p>

                 {/* Custom Image / QR */}
                 {data.images?.extraImage && (
                    <div className="mt-8 mb-4 border-4 border-white shadow-lg rotate-2 bg-white p-2">
                        <img src={data.images.extraImage} className="h-32 object-contain" />
                    </div>
                 )}
                 
                 {/* Photo (if exists) */}
                 {data.images?.photo && (
                    <div className="mt-4 border-8 border-white shadow-xl -rotate-2 bg-white">
                        <img src={data.images.photo} className="max-h-40 max-w-[200px] object-cover" />
                    </div>
                 )}
             </div>

             {/* Solution Footer */}
             {data.solution && (
                <div className="w-full mt-auto pt-6 border-t border-gray-300">
                    <p className="text-xs uppercase font-bold text-gray-500 mb-2 tracking-widest">Soluzione Segreta</p>
                    <div className="flex gap-2 justify-center">
                        {Array(data.solution.word.length).fill(0).map((_, i) => (
                             <div key={i} className="w-6 h-8 border-b-2 border-black relative">
                                 <span className="absolute top-0 left-0 text-[6px] text-gray-400">{i+1}</span>
                             </div>
                        ))}
                    </div>
                </div>
             )}

             {/* Corner Sticker */}
             {data.stickers?.[1] && <div className="absolute bottom-4 right-4 text-3xl opacity-80">{data.stickers[1]}</div>}
         </div>
      </div>
    </>
  );
};

export default CrosswordGrid;
