import React, { useState, useEffect, useRef, useMemo } from 'react';
import { CrosswordData, CellData, Direction, ThemeType } from '../types';
import { regenerateGreeting } from '../services/geminiService';
import { Printer, Edit, Wand2, Dice5, Eye, EyeOff, Sparkles, Send } from 'lucide-react';

interface CrosswordGridProps {
  data: CrosswordData;
  onComplete: () => void;
}

const THEME_ASSETS: Record<ThemeType, any> = {
  christmas: {
    fontTitle: 'font-christmas',
    printBorder: 'border-double border-8 border-red-800',
    decoration: '🎄',
    watermark: '🎄',
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
    watermark: '🐣',
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
     watermark: '🎁',
     accentColor: '#000000'
  }
};

const CrosswordGrid: React.FC<CrosswordGridProps> = ({ data, onComplete }) => {
  const [grid, setGrid] = useState<CellData[][]>([]);
  const [selectedCell, setSelectedCell] = useState<{ x: number; y: number } | null>(null);
  const [currentDirection, setCurrentDirection] = useState<Direction>(Direction.ACROSS);
  const [editableMessage, setEditableMessage] = useState(data.message);
  
  // Message Editing States
  const [isEditingMsg, setIsEditingMsg] = useState(false);
  const [isRegeneratingMsg, setIsRegeneratingMsg] = useState(false);
  const [customPromptMode, setCustomPromptMode] = useState(false);
  const [customPromptText, setCustomPromptText] = useState("");
  
  const [showPrintGuide, setShowPrintGuide] = useState(false);
  const [revealAnswers, setRevealAnswers] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[][]>([]);

  const themeAssets = THEME_ASSETS[data.theme] || THEME_ASSETS.generic;

  useEffect(() => {
    // 1. Initialize empty grid
    const newGrid: CellData[][] = Array(data.height).fill(null).map((_, y) =>
      Array(data.width).fill(null).map((_, x) => ({ x, y, userChar: '', partOfWords: [] }))
    );

    // 2. Map words to grid
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

    // 3. Map Solution cells
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
    setRevealAnswers(false);
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

  const handleRegenerateMessage = async (tone: 'funny' | 'heartfelt' | 'rhyme' | 'custom') => {
      if (isRegeneratingMsg) return;
      if (tone === 'custom' && !customPromptText.trim()) return;

      setIsRegeneratingMsg(true);
      setCustomPromptMode(false); // Close the custom input if open
      
      try {
          const newMsg = await regenerateGreeting(
              editableMessage, 
              data.theme, 
              data.recipientName, 
              tone, 
              tone === 'custom' ? customPromptText : undefined
          );
          setEditableMessage(newMsg);
          setCustomPromptText(""); // Reset custom input
      } catch (e) {
          console.error(e);
      } finally {
          setIsRegeneratingMsg(false);
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
             return <div key={`${x}-${y}`} className={`${isPrint ? 'bg-gray-100 border border-gray-300' : 'bg-black/5 rounded-sm'}`} />;
          }

          const displayChar = (!isPrint && revealAnswers) ? cell.char : cell.userChar;

          return (
            <div
              key={`${x}-${y}`}
              onClick={() => !isPrint && handleCellClick(x, y)}
              className={`
                relative flex items-center justify-center text-lg md:text-xl font-bold uppercase select-none
                ${isPrint ? 'bg-white border-2 border-black text-black h-full' : 'bg-white rounded-md shadow-sm cursor-pointer transition-colors'}
                ${isSelected ? 'bg-yellow-200' : ''}
                ${isInActiveWord ? 'brightness-95' : ''}
                ${cell.isSolutionCell && isPrint ? 'bg-yellow-50 !border-[3px] !border-black' : ''}
                ${cell.isSolutionCell && !isPrint ? 'ring-2 ring-yellow-400 ring-inset' : ''}
              `}
            >
              {cell.number && (
                <span className={`absolute top-0 left-0.5 leading-none z-10 font-sans font-extrabold text-black ${isPrint ? 'text-[9px]' : 'text-[10px] opacity-70'}`}>
                  {cell.number}
                </span>
              )}

              {/* Soluzione Number */}
              {cell.isSolutionCell && (
                  <span className={`absolute bottom-0 right-0.5 font-bold z-10 flex items-center justify-center
                    ${isPrint ? 'text-[7px] text-gray-600 bg-white px-0.5 border border-gray-400' : 'text-[8px] bg-yellow-400 text-yellow-900 w-3 h-3 rounded-full'}
                  `}>
                      {cell.solutionIndex}
                  </span>
              )}
              
              {!isPrint ? (
                <input
                  ref={(el) => { inputRefs.current[y][x] = el; }}
                  className={`w-full h-full bg-transparent text-center outline-none cursor-pointer pt-2 ${revealAnswers ? 'text-blue-600 font-extrabold' : 'text-black'}`}
                  value={displayChar}
                  maxLength={1}
                  readOnly={revealAnswers}
                  onChange={(e) => handleInput(x, y, e.target.value)}
                />
              ) : null}
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
                Per ottenere un biglietto pieghevole perfetto:
              </p>
              <ul className="text-left text-sm space-y-2 bg-gray-50 p-4 rounded-lg mb-6 border border-gray-200">
                  <li className="flex gap-2">📄 <b>Formato:</b> A4 Orizzontale</li>
                  <li className="flex gap-2">🔄 <b>Fronte/Retro:</b> Sì (Lato Corto)</li>
              </ul>
              <div className="flex gap-3">
                 <button onClick={() => setShowPrintGuide(false)} className="flex-1 py-3 bg-gray-200 font-bold rounded-xl">Annulla</button>
                 <button onClick={triggerPrint} className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700">STAMPA ORA</button>
              </div>
           </div>
        </div>
      )}
      
      {/* --- SCREEN MODE --- */}
      <div className="max-w-6xl mx-auto no-print pb-20">
      
        {/* NEW TOOLBAR - Buttons moved here from fixed position */}
        <div className="bg-white/90 backdrop-blur rounded-full px-6 py-2 mb-6 flex justify-between items-center shadow-lg border-2 border-white/50">
             <div className="flex items-center gap-2 text-sm font-bold text-gray-500 uppercase tracking-widest">
                 <Sparkles size={16} className="text-yellow-500"/> Anteprima
             </div>
             <div className="flex gap-2">
                 <button 
                    onClick={() => setRevealAnswers(!revealAnswers)}
                    className="hover:bg-gray-100 text-gray-700 p-2 px-4 rounded-full flex items-center gap-2 font-bold transition-all text-sm"
                  >
                     {revealAnswers ? <EyeOff size={16} className="text-blue-600" /> : <Eye size={16} />}
                     <span className="hidden sm:inline">{revealAnswers ? 'Nascondi' : 'Soluzioni'}</span>
                  </button>

                  <button 
                    onClick={() => setShowPrintGuide(true)} 
                    className="bg-blue-600 hover:bg-blue-700 text-white p-2 px-4 rounded-full shadow-md flex items-center gap-2 font-bold transition-all text-sm"
                  >
                    <Printer size={16} /> <span className="hidden sm:inline">Stampa</span>
                  </button>
             </div>
        </div>
      
        <div className="bg-white p-6 rounded-xl shadow-2xl mb-8 border-4 border-dashed border-gray-300">
            <h3 className="text-center font-bold text-gray-400 uppercase text-xs mb-4">Pagina Interna</h3>
            
            <div className="flex flex-col md:flex-row gap-8 bg-white border shadow-sm p-4 min-h-[500px]">
                 {/* LEFT: GRID */}
                 <div className="flex-1 border-r border-dashed border-gray-200 pr-4">
                     <h2 className="text-center font-bold mb-4" style={{ color: themeAssets.accentColor }}>Il Cruciverba</h2>
                     <div className="max-w-[300px] mx-auto">{renderGridCells(false)}</div>
                 </div>

                 {/* RIGHT: CONTENT EDITING */}
                 <div className="flex-1 flex flex-col items-center justify-center text-center">
                      <div className="w-full text-right border-b mb-4">
                         <p className="font-serif italic">{data.eventDate || 'Data Evento'}</p>
                      </div>

                      {/* STICKERS IN PREVIEW */}
                      {data.stickers && data.stickers.length > 0 && (
                          <div className="flex gap-2 mb-2 justify-center">
                              {data.stickers.map((s, i) => (
                                  <span key={i} className="text-3xl drop-shadow-sm">{s}</span>
                              ))}
                          </div>
                      )}
                      
                      <h3 className={`${themeAssets.fontTitle} text-4xl mb-4`} style={{ color: themeAssets.accentColor }}>{data.title}</h3>

                      {/* MESSAGE EDITOR */}
                      <div className="relative group w-full max-w-sm mb-4">
                            {!customPromptMode ? (
                                <div className="mb-2 p-2 bg-blue-50 rounded-lg border border-blue-100 shadow-sm transition-all">
                                    <p className="text-[10px] uppercase font-bold text-blue-600 mb-1">Cambia testo:</p>
                                    <div className="grid grid-cols-2 gap-2 mb-2">
                                        <button onClick={() => handleRegenerateMessage('heartfelt')} className="p-1.5 bg-white border rounded hover:bg-purple-50 text-xs flex justify-center gap-1 items-center shadow-sm font-bold text-purple-700"><Wand2 size={12}/> Dolce</button>
                                        <button onClick={() => handleRegenerateMessage('funny')} className="p-1.5 bg-white border rounded hover:bg-orange-50 text-xs flex justify-center gap-1 items-center shadow-sm font-bold text-orange-700"><Dice5 size={12}/> Simpatico</button>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => setCustomPromptMode(true)} className="flex-1 p-1.5 bg-white border rounded hover:bg-green-50 text-xs flex justify-center gap-1 items-center shadow-sm font-bold text-green-700"><Sparkles size={12}/> Magic</button>
                                        <button onClick={() => setIsEditingMsg(!isEditingMsg)} className="flex-1 p-1.5 bg-white border rounded hover:bg-gray-50 text-xs flex justify-center gap-1 items-center shadow-sm text-gray-700"><Edit size={12}/> A mano</button>
                                    </div>
                                </div>
                            ) : (
                                <div className="mb-2 p-2 bg-green-50 rounded-lg border border-green-200 shadow-sm animate-fade-in">
                                    <p className="text-[10px] uppercase font-bold text-green-800 mb-1">Cosa devo scrivere?</p>
                                    <div className="flex gap-1">
                                        <input 
                                            autoFocus
                                            type="text" 
                                            className="flex-1 text-xs p-2 rounded border focus:ring-2 focus:ring-green-400 outline-none" 
                                            placeholder="Es. Da Zio Pino, parla di vino..."
                                            value={customPromptText}
                                            onChange={(e) => setCustomPromptText(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleRegenerateMessage('custom')}
                                        />
                                        <button 
                                            onClick={() => handleRegenerateMessage('custom')}
                                            disabled={!customPromptText.trim()} 
                                            className="bg-green-600 text-white p-2 rounded hover:bg-green-700 disabled:opacity-50"
                                        >
                                            <Send size={14}/>
                                        </button>
                                    </div>
                                    <button onClick={() => setCustomPromptMode(false)} className="text-[10px] text-gray-500 underline mt-1 w-full text-center">Annulla</button>
                                </div>
                            )}
                            
                            {/* Text Display Area */}
                            {isEditingMsg ? (
                                <textarea 
                                    className="w-full p-2 border-2 border-blue-400 rounded-lg text-lg font-hand bg-white"
                                    value={editableMessage}
                                    onChange={e => setEditableMessage(e.target.value)}
                                    rows={4}
                                />
                            ) : (
                                <p className="font-script text-2xl whitespace-pre-wrap cursor-pointer hover:bg-yellow-50 rounded p-2 border border-transparent hover:border-yellow-200 transition-all min-h-[80px] flex items-center justify-center" onClick={() => setIsEditingMsg(true)}>
                                    {editableMessage}
                                </p>
                            )}
                            
                            {/* Loading State */}
                            {isRegeneratingMsg && <div className="absolute inset-0 bg-white/90 z-10 flex items-center justify-center backdrop-blur-sm rounded-lg border border-purple-200"><span className="text-sm text-purple-600 font-bold animate-pulse flex flex-col items-center gap-1"><Sparkles className="animate-spin"/> Scrivo...</span></div>}
                      </div>

                      <div className="flex gap-4 justify-center">
                          {data.images?.extraImage && <img src={data.images.extraImage} className="h-20 object-contain border p-1" />}
                          {data.images?.photo && <img src={data.images.photo} className="h-20 object-cover border p-1 shadow-sm" />}
                      </div>
                 </div>
            </div>
        </div>

        {/* CLUES LIST */}
        <div className="bg-white/90 p-6 rounded-xl shadow-xl max-w-2xl mx-auto">
            <h3 className="font-bold mb-4 text-center">Definizioni</h3>
            <div className="grid grid-cols-2 gap-8 text-sm">
                <div>
                    <h4 className="font-bold text-gray-500 text-xs uppercase border-b mb-2">Orizzontali</h4>
                    <ul>{data.words.filter(w => w.direction === Direction.ACROSS).map(w => <li key={w.id} className="mb-1"><b className="mr-1">{w.number}.</b>{w.clue} <span className="font-bold text-gray-500">({w.word.length})</span></li>)}</ul>
                </div>
                <div>
                    <h4 className="font-bold text-gray-500 text-xs uppercase border-b mb-2">Verticali</h4>
                    <ul>{data.words.filter(w => w.direction === Direction.DOWN).map(w => <li key={w.id} className="mb-1"><b className="mr-1">{w.number}.</b>{w.clue} <span className="font-bold text-gray-500">({w.word.length})</span></li>)}</ul>
                </div>
            </div>
        </div>
      </div>

      {/* --- PRINT MODE (A4 FOLDABLE BOOKLET) --- */}
      
      {/* SHEET 1 (SIDE A): RETRO (Left) + COVER (Right) */}
      <div className="print-sheet hidden print:flex">
         <div className="watermark">{themeAssets.watermark}</div>
         
         <div className="print-half border-r border-gray-300 border-dashed relative z-10">
            {/* RETRO VUOTO */}
         </div>

         <div className={`print-half flex-col items-center justify-center text-center p-12 m-4 rounded-xl relative z-10`}>
             <div className={`absolute inset-4 ${themeAssets.printBorder} opacity-50 pointer-events-none`}></div>
             
             {/* STICKERS ROW - UPDATED TO SHOW ALL SELECTED */}
             <div className="mb-12 flex justify-center items-center gap-6 flex-wrap max-w-[80%] mx-auto min-h-[150px]">
                {data.stickers && data.stickers.length > 0 ? (
                    data.stickers.map((s, i) => (
                        <span key={i} className="text-[90px] leading-none drop-shadow-md">{s}</span>
                    ))
                ) : (
                    <span className="text-[120px] drop-shadow-lg">{themeAssets.decoration}</span>
                )}
             </div>
             
             <h1 className={`${themeAssets.fontTitle} text-7xl mb-6 leading-tight`} style={{ color: themeAssets.accentColor }}>Per</h1>
             <div className="text-6xl font-bold border-b-4 border-black pb-4 px-12 inline-block min-w-[200px] text-black">
                 {data.recipientName}
             </div>
             
             <div className="mt-auto opacity-75 font-serif italic text-xl text-black">
                 Una sorpresa da risolvere...
             </div>
         </div>
      </div>

      {/* SHEET 2 (SIDE B): INSIDE LEFT (Grid) + INSIDE RIGHT (Greetings) */}
      <div className="print-sheet hidden print:flex">
         <div className="watermark" style={{ transform: 'translate(-50%, -50%) rotate(10deg)' }}>{themeAssets.watermark}</div>

         {/* LEFT HALF: PUZZLE */}
         <div className="print-half p-8 border-r border-gray-300 border-dashed z-10">
            <h2 className="text-3xl font-bold text-center mb-6 uppercase tracking-wider" style={{ color: themeAssets.accentColor }}>Cruciverba</h2>
            
            <div className="w-full max-w-[90%] mx-auto mb-6 aspect-square bg-white shadow-none border-2 border-gray-800 p-2">
                {renderGridCells(true)}
            </div>

            <div className="grid grid-cols-2 gap-4 text-[9px] leading-tight font-sans bg-white/80 p-2 rounded-lg flex-1 overflow-hidden">
                <div>
                   <h4 className="font-bold border-b border-black mb-1 text-black">Orizzontali</h4>
                   <ul className="list-none space-y-1 text-black">
                      {data.words.filter(w => w.direction === Direction.ACROSS).map(w => (
                          <li key={w.id}><span className="font-bold">{w.number}.</span> {w.clue} <b>({w.word.length})</b></li>
                      ))}
                   </ul>
                </div>
                <div>
                   <h4 className="font-bold border-b border-black mb-1 text-black">Verticali</h4>
                   <ul className="list-none space-y-1 text-black">
                      {data.words.filter(w => w.direction === Direction.DOWN).map(w => (
                          <li key={w.id}><span className="font-bold">{w.number}.</span> {w.clue} <b>({w.word.length})</b></li>
                      ))}
                   </ul>
                </div>
            </div>
         </div>

         {/* RIGHT HALF: GREETINGS & SOLUTION */}
         <div className={`print-half items-center text-center p-10 flex flex-col relative z-10`}>
             <div className={`absolute inset-4 ${themeAssets.printBorder} opacity-30 pointer-events-none`}></div>

             <div className="w-full text-right mb-6">
                <span className="font-serif italic text-xl border-b border-gray-400 pb-1 text-black">{data.eventDate}</span>
             </div>

             <div className="flex-1 flex flex-col justify-center items-center w-full">
                 <h3 className={`${themeAssets.fontTitle} text-5xl mb-6 leading-tight`} style={{ color: themeAssets.accentColor }}>
                    {data.title}
                 </h3>
                 
                 <div className="font-script text-3xl leading-relaxed whitespace-pre-wrap max-w-sm mx-auto text-black mb-8">
                     {editableMessage}
                 </div>

                 <div className="flex flex-row gap-8 justify-center items-center w-full mt-2 h-32">
                     {data.images?.extraImage && (
                        <div className="border border-gray-200 bg-white p-2 shadow-sm h-full flex items-center">
                            <img src={data.images.extraImage} className="max-h-24 w-auto object-contain" />
                        </div>
                     )}
                     
                     {data.images?.photo && (
                        <div className="border-4 border-white shadow bg-white -rotate-3 h-full flex items-center">
                            <img src={data.images.photo} className="max-h-28 w-auto object-cover contrast-125" />
                        </div>
                     )}
                 </div>
             </div>

             {data.solution && (
                <div className="w-full mt-auto pt-6 border-t-2 border-dashed border-gray-400">
                    <p className="text-xs uppercase font-bold text-black mb-3 tracking-[0.3em]">{data.stickers?.[1] || '✨'} Soluzione Misteriosa {data.stickers?.[2] || '✨'}</p>
                    <div className="flex gap-2 justify-center flex-wrap">
                        {Array(data.solution.word.length).fill(0).map((_, i) => (
                             <div key={i} className="w-10 h-12 border-2 border-black relative bg-white flex items-end justify-center pb-1 shadow-sm">
                                 <span className="absolute top-0.5 left-0.5 text-[8px] text-gray-500 font-bold">{i+1}</span>
                                 <span className="w-6 h-0.5 bg-black/10 rounded-full"></span>
                             </div>
                        ))}
                    </div>
                </div>
             )}
         </div>
      </div>
    </>
  );
};

export default CrosswordGrid;
