import React, { useState, useEffect, useRef } from 'react';
import { CrosswordData, CellData, Direction, ThemeType } from '../types';
import { regenerateGreetingOptions } from '../services/geminiService';
import { Printer, Edit, Eye, EyeOff, BookOpen, FileText, Sparkles, X, MoveDiagonal, Check, Palette, CheckCircle2 } from 'lucide-react';

interface CrosswordGridProps {
  data: CrosswordData;
  onComplete: () => void;
  onEdit: () => void; 
  onUpdate: (data: Partial<CrosswordData>) => void;
}

const THEME_ASSETS: Record<ThemeType, any> = {
  christmas: { fontTitle: 'font-christmas', printBorder: 'border-double border-4 border-red-800', decoration: '🎄', watermark: '🎅' },
  birthday: { fontTitle: 'font-fun', printBorder: 'border-dashed border-4 border-pink-500', decoration: '🎂', watermark: '🎉' },
  easter: { fontTitle: 'font-hand', printBorder: 'border-dotted border-4 border-green-500', decoration: '🐣', watermark: '🌸' },
  halloween: { fontTitle: 'font-christmas', printBorder: 'border-solid border-4 border-orange-500', decoration: '🎃', watermark: '🕸️' },
  graduation: { fontTitle: 'font-elegant', printBorder: 'border-double border-4 border-red-900', decoration: '🎓', watermark: '📜' },
  confirmation: { fontTitle: 'font-script', printBorder: 'border-solid border-2 border-gray-400', decoration: '🕊️', watermark: '⛪' },
  communion: { fontTitle: 'font-hand', printBorder: 'border-double border-4 border-yellow-500', decoration: '🥖', watermark: '🍇' },
  wedding: { fontTitle: 'font-script', printBorder: 'border-solid border-1 border-rose-300', decoration: '💍', watermark: '❤️' },
  elegant: { fontTitle: 'font-elegant', printBorder: 'border-double border-4 border-gray-900', decoration: '⚜️', watermark: '⚜️' },
  generic: { fontTitle: 'font-body', printBorder: 'border-solid border-2 border-gray-300', decoration: '🎁', watermark: '🎁' }
};

const PhotoCollage: React.FC<{ photos: string[] }> = ({ photos }) => {
    if (!photos || photos.length === 0) return null;
    const count = photos.length;
    let gridClass = 'grid-cols-1';
    if (count === 2) gridClass = 'grid-cols-2';
    else if (count > 2 && count <= 4) gridClass = 'grid-cols-2';
    else if (count >= 5) gridClass = 'grid-cols-3';

    return (
        <div className={`grid gap-0.5 w-full h-full bg-white overflow-hidden ${gridClass}`}>
            {photos.map((p, i) => (
                <div key={i} className="relative w-full h-full overflow-hidden aspect-square">
                    <img src={p} className="w-full h-full object-cover" alt={`mem-${i}`} />
                </div>
            ))}
        </div>
    );
};

const CrosswordGrid: React.FC<CrosswordGridProps> = ({ data, onComplete, onEdit, onUpdate }) => {
  const [grid, setGrid] = useState<CellData[][]>([]);
  const [selectedCell, setSelectedCell] = useState<{ x: number; y: number } | null>(null);
  const [currentDirection, setCurrentDirection] = useState<Direction>(Direction.ACROSS);
  const [editableMessage, setEditableMessage] = useState(data.message);
  
  const [isEditingMsg, setIsEditingMsg] = useState(false);
  const [isRegeneratingMsg, setIsRegeneratingMsg] = useState(false);
  const [generatedOptions, setGeneratedOptions] = useState<string[]>([]);
  const [customPromptMode, setCustomPromptMode] = useState(false);
  const [customPromptText, setCustomPromptText] = useState("");
  
  const [showPrintGuide, setShowPrintGuide] = useState(false);
  const [revealAnswers, setRevealAnswers] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[][]>([]);

  // Watermark resizing state
  const [watermarkScale, setWatermarkScale] = useState(1.5);
  const [isEditingWatermark, setIsEditingWatermark] = useState(false);
  const [isResizingWatermark, setIsResizingWatermark] = useState(false);
  const watermarkRef = useRef<HTMLDivElement>(null);

  const themeAssets = THEME_ASSETS[data.theme] || THEME_ASSETS.generic;
  const isCrossword = data.type === 'crossword';
  const photos = data.images?.photos || (data.images?.photo ? [data.images.photo] : []);
  const currentYear = new Date().getFullYear();

  // Sync editableMessage with parent data whenever it changes
  useEffect(() => {
    if (editableMessage !== data.message) {
        onUpdate({ message: editableMessage });
    }
  }, [editableMessage]);

  useEffect(() => {
    if (!isCrossword) {
        setEditableMessage(data.message);
        return;
    }
    const newGrid: CellData[][] = Array(data.height).fill(null).map((_, y) =>
      Array(data.width).fill(null).map((_, x) => ({ x, y, userChar: '', partOfWords: [] }))
    );
    
    // Fill grid logic
    data.words.forEach(w => {
      for (let i = 0; i < w.word.length; i++) {
        const x = w.direction === Direction.ACROSS ? w.startX + i : w.startX;
        const y = w.direction === Direction.DOWN ? w.startY + i : w.startY;
        if (y < data.height && x < data.width) {
            newGrid[y][x].char = w.word[i].toUpperCase();
            newGrid[y][x].partOfWords.push(w.id);
            if (i === 0) { newGrid[y][x].number = w.number; newGrid[y][x].isWordStart = true; }
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
  }, [data.words, data.solution, data.height, data.width, data.type]); 
  // removed `data` from deps to avoid loop, specifically check content.

  // Handle Watermark Resizing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
        if (!isResizingWatermark) return;
        setWatermarkScale(prev => {
            const newScale = prev + e.movementY * 0.01;
            return Math.max(0.5, Math.min(newScale, 5.0)); // Min 0.5x, Max 5x
        });
    };
    const handleMouseUp = () => {
        setIsResizingWatermark(false);
    };

    if (isResizingWatermark) {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingWatermark]);


  const handleCellClick = (x: number, y: number) => {
    if (!grid[y][x].char) return;
    if (selectedCell?.x === x && selectedCell?.y === y) setCurrentDirection(prev => prev === Direction.ACROSS ? Direction.DOWN : Direction.ACROSS);
    else setSelectedCell({ x, y });
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
      setIsRegeneratingMsg(true);
      setGeneratedOptions([]); 
      try {
          const options = await regenerateGreetingOptions(editableMessage, data.theme, data.recipientName, tone, tone === 'custom' ? customPromptText : undefined);
          setGeneratedOptions(options);
          if (tone === 'custom') setCustomPromptMode(false);
          setCustomPromptText("");
      } catch (e) { console.error(e); } finally { setIsRegeneratingMsg(false); }
  };

  const selectGeneratedOption = (option: string) => {
      setEditableMessage(option);
      setGeneratedOptions([]);
  };

  // --- RENDER HELPERS ---
  const renderGridCells = (isPrint = false) => (
    <div className={`grid gap-[1px] ${isPrint ? '' : 'bg-black/10 p-2 rounded-lg'}`} style={{ gridTemplateColumns: `repeat(${data.width}, minmax(0, 1fr))`, aspectRatio: `${data.width}/${data.height}` }}>
      {grid.map((row, y) => row.map((cell, x) => {
          const isSelected = !isPrint && selectedCell?.x === x && selectedCell?.y === y;
          const displayChar = (revealAnswers || isPrint) ? cell.char : cell.userChar; 
          
          if (!cell.char) return <div key={`${x}-${y}`} className={`${isPrint ? 'bg-gray-50 border border-gray-200' : 'bg-black/5 rounded-sm'}`} />;
          
          let bgClass = 'bg-white';
          if (isSelected && !isPrint) bgClass = 'bg-blue-100'; 
          else if (cell.isSolutionCell) bgClass = 'bg-yellow-100'; 
          
          return (
            <div 
                key={`${x}-${y}`} 
                onClick={() => !isPrint && handleCellClick(x, y)} 
                className={`relative flex items-center justify-center ${isPrint ? 'border-r border-b border-black text-black' : `w-full h-full text-xl font-bold cursor-pointer ${bgClass}`}`} 
                style={isPrint ? { width: '100%', height: '100%' } : {}}
            >
              {cell.number && <span className={`absolute top-0 left-0 leading-none ${isPrint ? 'text-[6px] p-[1px]' : 'text-[9px] p-0.5 text-gray-500'}`}>{cell.number}</span>}
              
              {cell.isSolutionCell && cell.solutionIndex && (
                  <div className={`absolute bottom-0 right-0 leading-none font-bold text-gray-500 bg-white/50 rounded-tl ${isPrint ? 'text-[6px] p-[1px]' : 'text-[8px] p-0.5'}`}>
                      {cell.solutionIndex}
                  </div>
              )}
              
              {isPrint ? (
                  <span className="font-bold text-lg">{displayChar}</span>
              ) : (
                  isSelected && !revealAnswers ? (
                     <input 
                        ref={(el) => { inputRefs.current[y][x] = el; }} 
                        maxLength={1} 
                        className="w-full h-full text-center bg-transparent outline-none uppercase" 
                        value={cell.userChar} 
                        onChange={(e) => handleInput(x, y, e.target.value)} 
                     />
                  ) : (
                     <span className={revealAnswers ? 'text-green-600' : ''}>{displayChar}</span>
                  )
              )}
            </div>
          );
      }))}
    </div>
  );

  return (
    <div className="flex flex-col items-center gap-8 w-full pb-20">
       
       {/* SELECTION MODAL */}
       {generatedOptions.length > 0 && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setGeneratedOptions([])}>
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                    <div className="bg-blue-600 p-4 flex justify-between items-center text-white">
                        <div className="flex items-center gap-2 font-bold">
                            <Sparkles size={20} className="text-yellow-300"/>
                            <span>Scegli una frase</span>
                        </div>
                        <button onClick={() => setGeneratedOptions([])} className="hover:bg-blue-700 p-1 rounded-full"><X size={20}/></button>
                    </div>
                    <div className="p-4 flex flex-col gap-3 bg-gray-50">
                        {generatedOptions.map((opt, idx) => (
                            <button 
                                key={idx} 
                                onClick={(e) => { e.stopPropagation(); selectGeneratedOption(opt); }} 
                                className="text-left p-4 bg-white hover:bg-blue-50 border-2 border-gray-100 hover:border-blue-300 rounded-xl transition-all shadow-sm group relative"
                            >
                                <p className="text-gray-800 text-sm md:text-base pr-6 font-medium leading-relaxed">"{opt}"</p>
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-blue-500 bg-blue-100 p-1 rounded-full">
                                    <Check size={16}/>
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
       )}

       {/* TOOLBAR */}
       <div className="flex flex-wrap gap-2 justify-center z-20 sticky top-2 p-2 bg-black/5 rounded-full backdrop-blur-sm">
            <button onClick={onEdit} className="bg-white px-4 py-2 rounded-full shadow border text-sm flex items-center gap-2 font-bold hover:bg-gray-50 text-gray-700"><Edit size={16} /> Modifica</button>
            <button onClick={() => setIsEditingWatermark(!isEditingWatermark)} className={`px-4 py-2 rounded-full shadow border text-sm flex items-center gap-2 font-bold transition-colors ${isEditingWatermark ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700'}`}>
                {isEditingWatermark ? <CheckCircle2 size={16}/> : <Palette size={16}/>} {isEditingWatermark ? 'Fatto' : 'Sfondo'}
            </button>
            <button onClick={() => setRevealAnswers(!revealAnswers)} className={`px-4 py-2 rounded-full shadow border text-sm flex items-center gap-2 font-bold transition-colors ${revealAnswers ? 'bg-yellow-100 text-yellow-800 border-yellow-300' : 'bg-white text-gray-700'}`}>{revealAnswers ? <EyeOff size={16}/> : <Eye size={16}/>} {revealAnswers ? 'Nascondi' : 'Soluzione'}</button>
            <button onClick={() => setShowPrintGuide(true)} className="bg-blue-600 text-white px-6 py-2 rounded-full shadow text-sm flex items-center gap-2 font-bold hover:bg-blue-700"><Printer size={16} /> STAMPA</button>
       </div>
       
       {/* PRINT GUIDE MODAL */}
       {showPrintGuide && (
           <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-in fade-in" onClick={() => setShowPrintGuide(false)}>
               <div className="bg-white rounded-2xl p-8 text-center shadow-2xl max-w-md border-4 border-blue-100" onClick={e => e.stopPropagation()}>
                   <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600"><Printer size={32}/></div>
                   <h3 className="text-2xl font-bold mb-2 text-gray-800">Stampa Libretto</h3>
                   <div className="text-left text-sm text-gray-600 mb-6 space-y-3 bg-gray-50 p-4 rounded-xl">
                       <p className="flex items-start gap-2"><span className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs shrink-0 mt-0.5">1</span> Usa foglio <b>A4</b>.</p>
                       <p className="flex items-start gap-2"><span className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs shrink-0 mt-0.5">2</span> Stampa su <b>Entrambi i lati</b>.</p>
                       <p className="flex items-start gap-2"><span className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs shrink-0 mt-0.5">3</span> Capovolgi sul <b>Lato Corto</b>.</p>
                   </div>
                   <button onClick={() => {window.print(); setShowPrintGuide(false);}} className="bg-blue-600 text-white w-full py-3 rounded-xl font-bold text-lg hover:bg-blue-700 transition-colors">🖨️ Stampa Ora</button>
               </div>
           </div>
       )}

       {/* --- FOGLIO 1: ESTERNO (Fronte/Retro) --- */}
       <div className="w-full max-w-5xl px-4 md:px-0">
            <h3 className="text-center text-white font-bold uppercase tracking-widest mb-4 flex items-center justify-center gap-2 drop-shadow-md">
                <FileText size={20}/> FOGLIO 1 (Esterno)
            </h3>
            
            {/* SHEET CONTAINER */}
            <div className="bg-white w-full aspect-[297/210] shadow-2xl flex relative overflow-hidden rounded-sm">
                 <div className="absolute inset-y-0 left-1/2 w-px bg-gray-300 border-l border-dashed border-gray-400 opacity-50 z-10"></div>
                 
                 {/* LEFT HALF: RETRO (Back Cover) */}
                 <div className="w-1/2 h-full p-8 flex flex-col items-center justify-center text-center border-r border-gray-100 bg-gray-50/30">
                     <span className="absolute top-2 left-2 text-[10px] uppercase text-gray-300 font-bold">Retro Biglietto</span>
                     <div className="text-6xl opacity-20 mb-4">{themeAssets.decoration}</div>
                     <div className="text-xs text-gray-400 uppercase tracking-widest mb-2 font-bold">Enigmistica Auguri</div>
                     <p className="text-[10px] text-gray-400">Un regalo speciale per te</p>
                     <div className="mt-8 opacity-40"><Printer size={24}/></div>
                 </div>

                 {/* RIGHT HALF: FRONTE (Front Cover) */}
                 <div className={`w-1/2 h-full p-8 flex flex-col items-center justify-center text-center ${themeAssets.printBorder} border-l-0 relative`}>
                     <span className="absolute top-2 right-2 text-[10px] uppercase text-gray-300 font-bold">Copertina</span>
                     <h1 className={`text-4xl md:text-5xl ${themeAssets.fontTitle} mb-4 text-gray-900 leading-tight`}>{data.title}</h1>
                     <div className="w-16 h-1 bg-gray-800 mb-4 opacity-50"></div>
                     <p className="text-sm md:text-base uppercase text-gray-500 mb-8 font-bold tracking-widest">
                         {data.eventDate} <span className="text-black/30 mx-1">•</span> {currentYear}
                     </p>
                     {data.images?.extraImage ? (
                        <img src={data.images.extraImage} className="h-32 md:h-48 object-contain mb-4 grayscale hover:grayscale-0 transition-all" />
                     ) : (
                        <div className="text-8xl opacity-80 animate-pulse">{themeAssets.decoration}</div>
                     )}
                     <div className="mt-auto">
                        <p className="text-xs italic text-gray-400">"Apri per scoprire..."</p>
                     </div>
                 </div>
            </div>
       </div>

       {/* --- FOGLIO 2: INTERNO (Dedica/Gioco) --- */}
       <div className="w-full max-w-5xl px-4 md:px-0">
           <h3 className="text-center text-white font-bold uppercase tracking-widest mb-4 flex items-center justify-center gap-2 drop-shadow-md">
                <BookOpen size={20}/> FOGLIO 2 (Interno)
           </h3>

           {/* SHEET CONTAINER */}
           <div className="bg-white w-full aspect-[297/210] shadow-2xl flex relative overflow-hidden rounded-sm select-none">
                
                {/* WATERMARK BACKGROUND (RESIZABLE) - VISUALIZZA SOPRA SE IN EDIT MODE */}
                <div 
                    className={`absolute inset-0 flex items-center justify-center overflow-hidden transition-all duration-300
                    ${isEditingWatermark ? 'z-50 pointer-events-auto bg-black/5' : 'z-0 pointer-events-none'}`}
                >
                    <div 
                        ref={watermarkRef}
                        className={`relative group ${isEditingWatermark ? 'cursor-move' : ''}`}
                        style={{ transform: `scale(${watermarkScale}) rotate(12deg)` }}
                    >
                        {/* Filigrana effettiva */}
                        <span className={`text-[100px] text-black transition-opacity ${isEditingWatermark ? 'opacity-20' : 'opacity-[0.05]'}`}>
                            {themeAssets.watermark}
                        </span>

                        {/* MANIGLIA DI RIDIMENSIONAMENTO - SEMPRE VISIBILE IN EDIT MODE */}
                        {isEditingWatermark && (
                            <>
                                <div className="absolute inset-[-10px] border-4 border-dashed border-blue-400 rounded-xl opacity-50 animate-pulse pointer-events-none"></div>
                                <div 
                                    onMouseDown={(e) => { e.stopPropagation(); setIsResizingWatermark(true); }}
                                    className="absolute bottom-[-20px] right-[-20px] w-12 h-12 bg-blue-600 border-4 border-white rounded-full cursor-se-resize flex items-center justify-center shadow-xl z-50 hover:scale-110 transition-transform"
                                    title="Trascina per ridimensionare"
                                >
                                    <MoveDiagonal size={20} className="text-white"/>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                <div className="absolute inset-y-0 left-1/2 w-px bg-gray-300 border-l border-dashed border-gray-400 opacity-50 z-10"></div>

                {/* CONTENT LAYERS - DIMMED IN EDIT MODE */}
                <div className={`absolute inset-0 flex z-10 transition-opacity duration-300 ${isEditingWatermark ? 'opacity-20 pointer-events-none blur-[1px]' : 'opacity-100'}`}>
                    {/* LEFT HALF: DEDICA */}
                    <div className={`w-1/2 h-full p-6 flex flex-col items-center justify-between text-center ${themeAssets.printBorder} border-r-0 relative bg-white/90`}>
                        <span className="absolute top-2 left-2 text-[10px] uppercase text-gray-300 font-bold">Lato Sinistro</span>
                        
                        {/* Photo Area */}
                        <div className="flex-1 w-full flex flex-col items-center justify-center relative">
                            {photos.length > 0 ? (
                                <div className="w-[70%] aspect-square border-4 border-white shadow-lg overflow-hidden rounded-sm bg-gray-100 rotate-1 mb-4">
                                    <PhotoCollage photos={photos} />
                                </div>
                            ) : data.images?.extraImage ? (
                                <img src={data.images.extraImage} className="h-32 object-contain mb-4" />
                            ) : null}

                            {/* Editable Message Container */}
                            <div className="w-full relative group">
                                {isEditingMsg ? (
                                    <div className="w-full animate-in zoom-in-95 bg-white p-2 rounded-xl shadow-lg border border-blue-200 z-20 absolute top-[-50px] left-0 pointer-events-auto">
                                        <textarea className="w-full p-2 bg-gray-50 border border-blue-200 rounded-lg text-center text-sm focus:outline-none focus:border-blue-400 font-hand" rows={4} value={editableMessage} onChange={(e) => setEditableMessage(e.target.value)}/>
                                        <div className="flex gap-2 mt-2 justify-center">
                                            <button onClick={() => setIsEditingMsg(false)} className="bg-green-500 text-white text-xs px-3 py-1 rounded-full font-bold">Fatto</button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="relative cursor-pointer hover:bg-yellow-50 rounded-xl p-2 transition-colors border border-transparent hover:border-yellow-200 pointer-events-auto" onClick={() => setIsEditingMsg(true)}>
                                        <p className={`text-xl md:text-2xl leading-relaxed ${themeAssets.fontTitle} text-gray-800`}>"{editableMessage}"</p>
                                        <span className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 text-gray-400 bg-white rounded-full p-1 shadow-md pointer-events-none"><Edit size={12}/></span>
                                    </div>
                                )}
                            </div>

                            {/* AI Tools for Message */}
                            <div className="mt-2 flex gap-1 justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto">
                                <button onClick={() => handleRegenerateMessage('funny')} className="text-[10px] bg-gray-100 px-2 py-1 rounded hover:bg-blue-100" title="Genera Frase Simpatica">😂</button>
                                <button onClick={() => handleRegenerateMessage('heartfelt')} className="text-[10px] bg-gray-100 px-2 py-1 rounded hover:bg-blue-100" title="Genera Frase Dolce">❤️</button>
                                <button onClick={() => handleRegenerateMessage('rhyme')} className="text-[10px] bg-gray-100 px-2 py-1 rounded hover:bg-blue-100" title="Genera Frase in Rima">🎵</button>
                            </div>
                        </div>

                        <div className="flex gap-2 text-2xl mt-2 justify-center">
                            {data.stickers?.slice(0,5).map((s,i) => <span key={i}>{s}</span>)}
                        </div>
                    </div>

                    {/* RIGHT HALF: GIOCO */}
                    <div className="w-1/2 h-full p-4 md:p-6 flex flex-col relative z-10 bg-white/90">
                        <span className="absolute top-2 right-2 text-[10px] uppercase text-gray-300 font-bold">Lato Destro</span>
                        
                        {isCrossword ? (
                            <>
                                <h2 className="text-lg font-bold uppercase border-b-2 border-black mb-2 pb-1 text-center tracking-widest">Cruciverba</h2>
                                
                                {/* Hidden Word Box */}
                                {data.solution && (
                                    <div className="mb-2 bg-yellow-50 border border-yellow-200 p-1 rounded-lg text-center mx-auto inline-block">
                                        <div className="flex justify-center gap-0.5">
                                            {data.solution.word.split('').map((c,i) => (
                                                <div key={i} className={`w-4 h-4 border rounded text-[10px] flex items-center justify-center font-bold ${revealAnswers ? 'bg-yellow-400 text-white border-yellow-500' : 'bg-white border-yellow-200 text-gray-400'}`}>
                                                    {revealAnswers ? c : (i+1)}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* GRID */}
                                <div className="flex-1 flex items-start justify-center overflow-hidden min-h-0 pointer-events-auto">
                                    <div style={{ width: '90%', maxHeight: '100%', aspectRatio: `${data.width}/${data.height}` }}>
                                        {renderGridCells(false)}
                                    </div>
                                </div>
                                
                                {/* CLUES */}
                                <div className="mt-2 text-[9px] md:text-[10px] grid grid-cols-2 gap-2 leading-tight w-full border-t border-black pt-2 overflow-y-auto max-h-[35%] custom-scrollbar pointer-events-auto">
                                    <div className="pr-1">
                                        <b className="block border-b border-gray-300 mb-1 pb-0.5 font-bold text-xs">Orizzontali</b>
                                        {data.words.filter(w=>w.direction===Direction.ACROSS).map(w=><div key={w.id} className="mb-0.5"><b className="mr-1">{w.number}.</b>{w.clue}</div>)}
                                    </div>
                                    <div className="pl-1 border-l border-gray-100">
                                        <b className="block border-b border-gray-300 mb-1 pb-0.5 font-bold text-xs">Verticali</b>
                                        {data.words.filter(w=>w.direction===Direction.DOWN).map(w=><div key={w.id} className="mb-0.5"><b className="mr-1">{w.number}.</b>{w.clue}</div>)}
                                    </div>
                                </div>
                            </>
                        ) : (
                        <div className="flex-1 flex items-center justify-center opacity-20 border-2 border-dashed border-gray-300 m-8 rounded-xl">
                            <p className="text-xl font-hand rotate-[-5deg] text-center">Spazio per dedica<br/>scritta a mano...</p>
                        </div>
                        )}
                    </div>
                </div>
           </div>
       </div>

       {/* --- PRINT LAYOUT (HIDDEN ON SCREEN) --- */}
       <div className="hidden print:block">
           {/* SHEET 1: ESTERNO */}
           <div className="print-sheet flex flex-row">
               {/* WATERMARK PRINT (STATIC) */}
               <div className="watermark" style={{ transform: `translate(-50%, -50%) scale(${watermarkScale}) rotate(12deg)` }}>{themeAssets.watermark}</div>
               
               {/* Retro */}
               <div className="print-half border-r border-gray-200 flex flex-col items-center justify-center text-center">
                    <div className="text-4xl opacity-20 mb-4">{themeAssets.decoration}</div>
                    <div className="text-sm text-gray-400 uppercase tracking-widest mb-8">Enigmistica Auguri</div>
                    <div className="text-[10px] text-gray-400">Generato con ❤️ e IA</div>
               </div>
               {/* Fronte */}
               <div className={`print-half ${themeAssets.printBorder} border-l-0 flex flex-col items-center justify-center text-center p-10`}>
                   <h1 className={`text-5xl ${themeAssets.fontTitle} mb-4 text-black`}>{data.title}</h1>
                   <div className="w-20 h-1 bg-black mb-4"></div>
                   <p className="text-xl uppercase text-gray-600 mb-10 tracking-widest">{data.eventDate} • {currentYear}</p>
                   {data.images?.extraImage ? (
                       <img src={data.images.extraImage} className="max-h-60 object-contain grayscale contrast-125" />
                   ) : (
                       <div className="text-9xl opacity-80 text-black">{themeAssets.decoration}</div>
                   )}
                   <div className="mt-auto">
                       <p className="text-sm italic">"Un pensiero speciale per te..."</p>
                   </div>
               </div>
           </div>

           {/* SHEET 2: INTERNO */}
           <div className="print-sheet flex flex-row">
               <div className="watermark" style={{ transform: `translate(-50%, -50%) scale(${watermarkScale}) rotate(12deg)` }}>{themeAssets.watermark}</div>
               {/* Dedica */}
               <div className={`print-half ${themeAssets.printBorder} border-r-0 flex flex-col items-center text-center p-8`}>
                   <div className="flex-1 flex flex-col items-center justify-center w-full gap-6">
                        {photos.length > 0 ? (
                            <div className="w-[80%] aspect-square border-4 border-white shadow-sm overflow-hidden rounded-sm bg-white">
                                <PhotoCollage photos={photos} />
                            </div>
                        ) : (
                             <div className="text-8xl opacity-10">{themeAssets.decoration}</div>
                        )}
                        <div className="px-6 py-4">
                             <p className={`text-2xl leading-relaxed ${themeAssets.fontTitle} text-black`}>"{editableMessage}"</p>
                        </div>
                        <div className="flex gap-4 text-4xl mt-2 grayscale opacity-80">
                             {data.stickers?.slice(0,5).map((s,i) => <span key={i}>{s}</span>)}
                        </div>
                   </div>
               </div>
               {/* Gioco */}
               <div className={`print-half ${themeAssets.printBorder} border-l-0 flex flex-col p-8`}>
                   {isCrossword ? (
                       <div className="flex-1 w-full flex flex-col h-full">
                           <h2 className="text-xl font-bold uppercase border-b-2 border-black mb-4 pb-2 text-center tracking-widest">Cruciverba</h2>
                           {/* Solution Box Print */}
                            {data.solution && (
                                <div className="mb-4 text-center">
                                    <div className="inline-flex gap-1 border border-black p-1 rounded bg-gray-50">
                                        {data.solution.word.split('').map((c,i) => (
                                            <div key={i} className={`w-5 h-5 border border-black text-xs flex items-center justify-center font-bold`}>
                                                {revealAnswers ? c : (i+1)}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                           <div className="flex-1 flex items-center justify-center mb-6 min-h-0">
                               <div style={{ width: '90%', maxHeight: '100%' }}>{renderGridCells(true)}</div>
                           </div>
                           <div className="text-[10px] grid grid-cols-2 gap-6 leading-tight w-full border-t-2 border-black pt-4">
                                <div>
                                    <b className="block border-b border-gray-400 mb-2 pb-0.5 uppercase font-bold text-sm">Orizzontali</b>
                                    {data.words.filter(w=>w.direction===Direction.ACROSS).map(w=><div key={w.id} className="mb-1"><b className="mr-1 text-sm">{w.number}.</b>{w.clue}</div>)}
                                </div>
                                <div>
                                    <b className="block border-b border-gray-400 mb-2 pb-0.5 uppercase font-bold text-sm">Verticali</b>
                                    {data.words.filter(w=>w.direction===Direction.DOWN).map(w=><div key={w.id} className="mb-1"><b className="mr-1 text-sm">{w.number}.</b>{w.clue}</div>)}
                                </div>
                           </div>
                       </div>
                   ) : (
                       <div className="flex-1 flex items-center justify-center opacity-20 border-2 border-dashed border-gray-300 m-8 rounded-xl">
                           <p className="text-3xl font-hand rotate-[-5deg]">Spazio per la tua dedica scritta a mano...</p>
                       </div>
                   )}
               </div>
           </div>
       </div>
    </div>
  );
};

export default CrosswordGrid;
