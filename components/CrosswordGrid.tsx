import React, { useState, useEffect, useRef, useMemo } from 'react';
import { CrosswordData, CellData, Direction, ThemeType } from '../types';
import { Printer, Edit } from 'lucide-react';

interface CrosswordGridProps {
  data: CrosswordData;
  onComplete: () => void;
}

// Visual Themes Configuration for "Wow" Effect
const THEME_ASSETS: Record<ThemeType, any> = {
  christmas: {
    fontTitle: 'font-christmas',
    printBorder: 'border-double border-8 border-red-800',
    decoration: '🎄',
    watermark: '❄️',
    accentColor: '#165B33'
  },
  birthday: {
    fontTitle: 'font-fun',
    printBorder: 'border-dashed border-4 border-pink-500',
    decoration: '🎈',
    watermark: '🎂',
    accentColor: '#FF006E'
  },
  easter: {
    fontTitle: 'font-hand',
    printBorder: 'border-dotted border-8 border-green-400',
    decoration: '🐰',
    watermark: '🥚',
    accentColor: '#3A86FF'
  },
  elegant: {
    fontTitle: 'font-elegant',
    printBorder: 'border-4 border-double border-gray-800',
    decoration: '✨',
    watermark: '⚜️',
    accentColor: '#121212'
  },
  generic: {
     fontTitle: 'font-body',
     printBorder: 'border-4 border-gray-300',
     decoration: '🎁',
     watermark: '🎉',
     accentColor: '#000000'
  }
};

const CrosswordGrid: React.FC<CrosswordGridProps> = ({ data, onComplete }) => {
  const [grid, setGrid] = useState<CellData[][]>([]);
  const [selectedCell, setSelectedCell] = useState<{ x: number; y: number } | null>(null);
  const [currentDirection, setCurrentDirection] = useState<Direction>(Direction.ACROSS);
  const [editableMessage, setEditableMessage] = useState(data.message);
  const [showPrintGuide, setShowPrintGuide] = useState(false);
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

  const triggerPrint = () => {
    const originalTitle = document.title;
    const cleanName = data.recipientName.replace(/\s+/g, '_').toUpperCase();
    document.title = `${data.theme.toUpperCase()}_${new Date().getFullYear()}_${cleanName}`;
    window.print();
    document.title = originalTitle;
    setShowPrintGuide(false);
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
             return <div key={`${x}-${y}`} className={`${isPrint ? 'bg-gray-100 border border-gray-200' : 'bg-black/5 rounded-sm'}`} />;
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
                cell.isSolutionCell && <span className="absolute bottom-0 right-0.5 text-[7px] font-bold text-gray-500 bg-white px-0.5 rounded border border-gray-300">{cell.solutionIndex}</span>
              )}
            </div>
          );
        })
      )}
    </div>
  );

  return (
    <>
      {/* --- PRINT GUIDE MODAL --- */}
      {showPrintGuide && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4">
           <div className="bg-white rounded-2xl max-w-md w-full p-6 text-center shadow-2xl animate-fade-in">
              <Printer size={48} className="mx-auto text-blue-600 mb-4" />
              <h3 className="text-2xl font-bold mb-2 text-gray-800">Pronto per la Stampa?</h3>
              <p className="text-gray-600 mb-6">
                Per ottenere un biglietto pieghevole perfetto, imposta la stampante (o il salvataggio PDF) così:
              </p>
              <ul className="text-left text-sm space-y-2 bg-gray-50 p-4 rounded-lg mb-6 border border-gray-200">
                  <li className="flex gap-2">📄 <b>Formato:</b> A4 Orizzontale (Landscape)</li>
                  <li className="flex gap-2">🔄 <b>Fronte/Retro:</b> Sì, lato corto (Short Edge)</li>
                  <li className="flex gap-2">📐 <b>Margini:</b> Nessuno (o Minimi)</li>
              </ul>
              <div className="flex gap-3">
                 <button onClick={() => setShowPrintGuide(false)} className="flex-1 py-3 bg-gray-200 font-bold rounded-xl">Annulla</button>
                 <button onClick={triggerPrint} className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700">STAMPA ORA</button>
              </div>
           </div>
        </div>
      )}

      <button onClick={() => setShowPrintGuide(true)} className="fixed top-4 right-4 bg-white text-black p-3 rounded-full shadow-lg border z-50 hover:bg-gray-50 no-print flex items-center gap-2 font-bold transition-transform hover:scale-105">
        <Printer size={20} /> Stampa Biglietto
      </button>

      {/* --- SCREEN MODE (INTERACTIVE) --- */}
      <div className="max-w-4xl mx-auto no-print pb-20">
         <div className="text-center mb-6 text-white bg-black/20 p-4 rounded-xl backdrop-blur-sm">
             <div className="flex justify-center items-center gap-2 mb-2">
                <Edit size={16} className="opacity-50" />
                <span className="text-xs uppercase font-bold opacity-70">Modifica il messaggio qui sotto</span>
             </div>
             <h2 className={`${themeAssets.fontTitle} text-3xl font-bold mb-4`}>{data.title}</h2>
             
             <textarea 
               className="w-full bg-white/10 text-white text-center p-4 rounded-xl border border-white/20 font-hand text-xl focus:bg-white/20 focus:outline-none placeholder-white/50"
               rows={3}
               value={editableMessage}
               onChange={e => setEditableMessage(e.target.value)}
             />
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
      <div className="print-sheet hidden print:flex">
         <div className="watermark">{themeAssets.watermark}</div>
         
         {/* LEFT HALF: BACK COVER (RETRO) - CLEAN, NO DUPLICATE TEXT */}
         <div className="print-half justify-end items-center border-r border-gray-300 border-dashed relative z-10">
            <div className="text-center opacity-30 scale-75">
                <p className="text-xs uppercase tracking-widest font-sans text-black">Realizzato con</p>
                <p className="font-bold font-serif text-black">Enigmistica Auguri</p>
                <div className="mt-2 w-8 h-8 mx-auto border border-black rounded-full flex items-center justify-center text-xs text-black">©</div>
            </div>
         </div>

         {/* RIGHT HALF: FRONT COVER (FRONTE) */}
         <div className={`print-half flex-col items-center justify-center text-center p-12 m-4 rounded-xl relative z-10`}>
             <div className={`absolute inset-4 ${themeAssets.printBorder} opacity-50 pointer-events-none`}></div>
             
             <div className="mb-12">
                {data.stickers?.[0] ? <span className="text-[100px]">{data.stickers[0]}</span> : <span className="text-[100px]">{themeAssets.decoration}</span>}
             </div>
             
             <h1 className={`${themeAssets.fontTitle} text-7xl mb-6 leading-tight`} style={{ color: themeAssets.accentColor }}>Per</h1>
             <div className="text-5xl font-bold border-b-4 border-black pb-4 px-12 inline-block min-w-[200px] text-black">
                 {data.recipientName}
             </div>
             
             <div className="mt-auto opacity-75 font-serif italic text-xl text-black">
                 Apri per giocare ✨
             </div>
         </div>
      </div>

      {/* SHEET 2 (SIDE B): INSIDE LEFT (Grid) + INSIDE RIGHT (Greetings) */}
      <div className="print-sheet hidden print:flex">
         <div className="watermark" style={{ transform: 'translate(-50%, -50%) rotate(10deg)' }}>{themeAssets.watermark}</div>

         {/* LEFT HALF: PUZZLE */}
         <div className="print-half p-8 border-r border-gray-300 border-dashed z-10">
            <h2 className="text-3xl font-bold text-center mb-6 uppercase tracking-wider" style={{ color: themeAssets.accentColor }}>Il Cruciverba</h2>
            
            <div className="w-full max-w-[90%] mx-auto mb-6 aspect-square bg-white shadow-none border-2 border-gray-800 p-2">
                {renderGridCells(true)}
            </div>

            <div className="grid grid-cols-2 gap-4 text-[9px] leading-tight font-sans bg-white/80 p-2 rounded-lg flex-1 overflow-hidden">
                <div>
                   <h4 className="font-bold border-b border-black mb-1 text-black">Orizzontali</h4>
                   <ul className="list-none space-y-1 text-black">
                      {data.words.filter(w => w.direction === Direction.ACROSS).map(w => (
                          <li key={w.id}><span className="font-bold">{w.number}.</span> {w.clue} ({w.word.length})</li>
                      ))}
                   </ul>
                </div>
                <div>
                   <h4 className="font-bold border-b border-black mb-1 text-black">Verticali</h4>
                   <ul className="list-none space-y-1 text-black">
                      {data.words.filter(w => w.direction === Direction.DOWN).map(w => (
                          <li key={w.id}><span className="font-bold">{w.number}.</span> {w.clue} ({w.word.length})</li>
                      ))}
                   </ul>
                </div>
            </div>
         </div>

         {/* RIGHT HALF: GREETINGS & SOLUTION */}
         <div className={`print-half items-center text-center p-10 flex flex-col relative z-10`}>
             <div className={`absolute inset-4 ${themeAssets.printBorder} opacity-30 pointer-events-none`}></div>

             <div className="w-full text-right mb-6">
                <span className="font-serif italic text-xl border-b border-gray-400 pb-1 text-black">{data.eventDate || new Date().toLocaleDateString()}</span>
             </div>

             <div className="flex-1 flex flex-col justify-center items-center w-full">
                 <h3 className={`${themeAssets.fontTitle} text-5xl mb-6 leading-tight`} style={{ color: themeAssets.accentColor }}>
                    {data.title}
                 </h3>
                 
                 <div className="font-script text-3xl leading-relaxed whitespace-pre-wrap max-w-sm mx-auto text-black mb-4">
                     {editableMessage}
                 </div>

                 {/* Custom Images Row - Horizontal Layout */}
                 <div className="flex flex-row gap-4 justify-center items-center w-full mt-2">
                     {data.images?.extraImage && (
                        <div className="border border-gray-200 bg-white p-2">
                            <img src={data.images.extraImage} className="h-24 w-auto object-contain grayscale" />
                        </div>
                     )}
                     
                     {data.images?.photo && (
                        <div className="border-4 border-white shadow bg-white -rotate-2">
                            <img src={data.images.photo} className="h-28 w-auto object-cover grayscale contrast-125" />
                        </div>
                     )}
                 </div>
             </div>

             {/* Solution Footer (Wheel of Fortune Style) */}
             {data.solution && (
                <div className="w-full mt-auto pt-4 border-t-2 border-dashed border-gray-400">
                    <p className="text-xs uppercase font-bold text-black mb-2 tracking-[0.3em]">Soluzione Segreta</p>
                    <div className="flex gap-2 justify-center">
                        {Array(data.solution.word.length).fill(0).map((_, i) => (
                             <div key={i} className="w-8 h-10 border-2 border-black relative bg-white flex items-end justify-center pb-1">
                                 <span className="absolute top-0.5 left-0.5 text-[7px] text-gray-500 font-bold">{i+1}</span>
                                 <span className="w-4 h-0.5 bg-black/10 rounded-full"></span>
                             </div>
                        ))}
                    </div>
                </div>
             )}

             {data.stickers?.[1] && <div className="absolute bottom-4 right-4 text-3xl opacity-80">{data.stickers[1]}</div>}
         </div>
      </div>
    </>
  );
};

export default CrosswordGrid;
