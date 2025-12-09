import React, { useState, useEffect, useRef } from 'react';
import { CrosswordData, CellData, Direction, ThemeType } from '../types';
import { regenerateGreetingOptions } from '../services/geminiService';
import { Printer, Edit, Eye, EyeOff, BookOpen, FileText, Sparkles, X, MoveDiagonal, Check, Palette, CheckCircle2, Download, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

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
  const [revealAnswers, setRevealAnswers] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[][]>([]);

  // Watermark State for 2 Sheets
  const [isEditingWatermark, setIsEditingWatermark] = useState(false);
  // Posizioni: Scale, X (px), Y (px)
  const [wmSheet1, setWmSheet1] = useState({ scale: 1.5, x: 0, y: 0 });
  const [wmSheet2, setWmSheet2] = useState({ scale: 1.5, x: 0, y: 0 });
  
  const [activeDrag, setActiveDrag] = useState<{sheet: 1 | 2, startX: number, startY: number, startWmX: number, startWmY: number} | null>(null);
  const [activeResize, setActiveResize] = useState<1 | 2 | null>(null);

  // PDF Generation State
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

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

  // --- DRAG AND RESIZE LOGIC ---
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
        if (activeResize) {
            const deltaY = e.movementY * 0.01;
            if (activeResize === 1) {
                setWmSheet1(p => ({ ...p, scale: Math.max(0.5, Math.min(p.scale + deltaY, 5.0)) }));
            } else {
                setWmSheet2(p => ({ ...p, scale: Math.max(0.5, Math.min(p.scale + deltaY, 5.0)) }));
            }
        } else if (activeDrag) {
            const dx = e.clientX - activeDrag.startX;
            const dy = e.clientY - activeDrag.startY;
            if (activeDrag.sheet === 1) {
                setWmSheet1(p => ({ ...p, x: activeDrag.startWmX + dx, y: activeDrag.startWmY + dy }));
            } else {
                setWmSheet2(p => ({ ...p, x: activeDrag.startWmX + dx, y: activeDrag.startWmY + dy }));
            }
        }
    };
    const handleMouseUp = () => {
        setActiveResize(null);
        setActiveDrag(null);
    };

    if (activeResize || activeDrag) {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [activeResize, activeDrag]);

  const startDrag = (e: React.MouseEvent, sheet: 1 | 2) => {
      if (!isEditingWatermark) return;
      e.stopPropagation();
      const current = sheet === 1 ? wmSheet1 : wmSheet2;
      setActiveDrag({
          sheet,
          startX: e.clientX,
          startY: e.clientY,
          startWmX: current.x,
          startWmY: current.y
      });
  };

  // --- PDF GENERATION ---
  const handleDownloadPDF = async () => {
      if (!exportRef.current) return;
      setIsGeneratingPDF(true);
      
      try {
        const sheet1 = exportRef.current.querySelector('#pdf-sheet-1') as HTMLElement;
        const sheet2 = exportRef.current.querySelector('#pdf-sheet-2') as HTMLElement;

        if (!sheet1 || !sheet2) throw new Error("Elements not found");

        // Wait a tick for images to be potentially ready (though mostly controlled by React)
        await new Promise(resolve => setTimeout(resolve, 500));

        // Use scale 2 for high quality (approx 2246px width)
        const options = {
            scale: 2, 
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
        };

        const canvas1 = await html2canvas(sheet1, options);
        const canvas2 = await html2canvas(sheet2, options);

        const imgData1 = canvas1.toDataURL('image/jpeg', 0.95);
        const imgData2 = canvas2.toDataURL('image/jpeg', 0.95);

        const pdf = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4'
        });

        // A4 Dimensions
        const pdfWidth = 297;
        const pdfHeight = 210;

        pdf.addImage(imgData1, 'JPEG', 0, 0, pdfWidth, pdfHeight);
        pdf.addPage();
        pdf.addImage(imgData2, 'JPEG', 0, 0, pdfWidth, pdfHeight);

        pdf.save(`Biglietto_${data.recipientName.replace(/\s+/g, '_')}.pdf`);

      } catch (e) {
          console.error("PDF Error", e);
          alert("Errore durante la creazione del PDF. Riprova.");
      } finally {
          setIsGeneratingPDF(false);
      }
  };


  // --- CELL INTERACTION ---
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
       
       {/* TOOLBAR */}
       <div className="flex flex-wrap gap-2 justify-center z-20 sticky top-2 p-2 bg-black/5 rounded-full backdrop-blur-sm">
            <button onClick={onEdit} className="bg-white px-4 py-2 rounded-full shadow border text-sm flex items-center gap-2 font-bold hover:bg-gray-50 text-gray-700"><Edit size={16} /> Modifica</button>
            <button onClick={() => setIsEditingWatermark(!isEditingWatermark)} className={`px-4 py-2 rounded-full shadow border text-sm flex items-center gap-2 font-bold transition-colors ${isEditingWatermark ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700'}`}>
                {isEditingWatermark ? <CheckCircle2 size={16}/> : <Palette size={16}/>} {isEditingWatermark ? 'Fatto' : 'Sfondo'}
            </button>
            <button onClick={() => setRevealAnswers(!revealAnswers)} className={`px-4 py-2 rounded-full shadow border text-sm flex items-center gap-2 font-bold transition-colors ${revealAnswers ? 'bg-yellow-100 text-yellow-800 border-yellow-300' : 'bg-white text-gray-700'}`}>{revealAnswers ? <EyeOff size={16}/> : <Eye size={16}/>} {revealAnswers ? 'Nascondi' : 'Soluzione'}</button>
            <button 
                onClick={handleDownloadPDF} 
                disabled={isGeneratingPDF}
                className={`text-white px-6 py-2 rounded-full shadow text-sm flex items-center gap-2 font-bold transition-colors ${isGeneratingPDF ? 'bg-gray-400 cursor-wait' : 'bg-green-600 hover:bg-green-700'}`}
            >
                {isGeneratingPDF ? <Loader2 size={16} className="animate-spin"/> : <Download size={16} />} 
                {isGeneratingPDF ? 'Creo PDF...' : 'SCARICA PDF'}
            </button>
       </div>
       
       {/* --- ON SCREEN PREVIEW (INTERACTIVE) --- */}

       {/* FOGLIO 1: ESTERNO */}
       <div className="w-full max-w-5xl px-4 md:px-0">
            <h3 className="text-center text-white font-bold uppercase tracking-widest mb-4 flex items-center justify-center gap-2 drop-shadow-md">
                <FileText size={20}/> FOGLIO 1 (Esterno)
            </h3>
            
            <div className="bg-white w-full aspect-[297/210] shadow-2xl flex relative overflow-hidden rounded-sm select-none">
                 {/* Watermark Editor */}
                 <div className={`absolute inset-0 flex items-center justify-center overflow-hidden ${isEditingWatermark ? 'z-50 pointer-events-auto bg-black/5' : 'z-0 pointer-events-none'}`}>
                    <div 
                        onMouseDown={(e) => startDrag(e, 1)}
                        className={`relative group ${isEditingWatermark ? 'cursor-move' : ''}`}
                        style={{ transform: `translate(${wmSheet1.x}px, ${wmSheet1.y}px) scale(${wmSheet1.scale}) rotate(12deg)` }}
                    >
                        <span className={`text-[100px] text-black transition-opacity ${isEditingWatermark ? 'opacity-30' : 'opacity-[0.06]'}`}>
                            {themeAssets.watermark}
                        </span>
                        {isEditingWatermark && (
                            <>
                                <div className="absolute inset-[-10px] border-4 border-dashed border-blue-400 rounded-xl opacity-50 animate-pulse pointer-events-none"></div>
                                <div 
                                    onMouseDown={(e) => { e.stopPropagation(); setActiveResize(1); }}
                                    className="absolute bottom-[-20px] right-[-20px] w-12 h-12 bg-blue-600 border-4 border-white rounded-full cursor-se-resize flex items-center justify-center shadow-xl z-50 hover:scale-110 transition-transform"
                                >
                                    <MoveDiagonal size={20} className="text-white"/>
                                </div>
                            </>
                        )}
                    </div>
                 </div>
                 <div className="absolute inset-y-0 left-1/2 w-px bg-gray-300 border-l border-dashed border-gray-400 opacity-50 z-10"></div>
                 <div className={`absolute inset-0 flex z-10 transition-opacity duration-300 ${isEditingWatermark ? 'opacity-20 pointer-events-none blur-[1px]' : 'opacity-100'}`}>
                     {/* RETRO */}
                     <div className="w-1/2 h-full p-8 flex flex-col items-center justify-center text-center border-r border-gray-100 bg-white/90">
                         <span className="absolute top-2 left-2 text-[10px] uppercase text-gray-300 font-bold">Retro Biglietto</span>
                         <div className="text-6xl opacity-20 mb-4">{themeAssets.decoration}</div>
                         <div className="text-xs text-gray-400 uppercase tracking-widest mb-2 font-bold">Enigmistica Auguri</div>
                         <p className="text-[10px] text-gray-400">Un regalo speciale per te</p>
                     </div>
                     {/* FRONTE */}
                     <div className={`w-1/2 h-full p-8 flex flex-col items-center justify-center text-center ${themeAssets.printBorder} border-l-0 relative bg-white/90`}>
                         <span className="absolute top-2 right-2 text-[10px] uppercase text-gray-300 font-bold">Copertina</span>
                         <h1 className={`text-4xl md:text-5xl ${themeAssets.fontTitle} mb-4 text-gray-900 leading-tight`}>{data.title}</h1>
                         <div className="w-16 h-1 bg-gray-800 mb-4 opacity-50"></div>
                         <p className="text-sm md:text-base uppercase text-gray-500 mb-8 font-bold tracking-widest">
                             {data.eventDate} <span className="text-black/30 mx-1">•</span> {currentYear}
                         </p>
                         {data.images?.extraImage ? (
                            <img src={data.images.extraImage} className="h-32 md:h-48 object-contain mb-4" />
                         ) : (
                            <div className="text-8xl opacity-80">{themeAssets.decoration}</div>
                         )}
                         <div className="mt-auto"><p className="text-xs italic text-gray-400">"Apri per scoprire..."</p></div>
                     </div>
                 </div>
            </div>
       </div>

       {/* FOGLIO 2: INTERNO */}
       <div className="w-full max-w-5xl px-4 md:px-0">
           <h3 className="text-center text-white font-bold uppercase tracking-widest mb-4 flex items-center justify-center gap-2 drop-shadow-md">
                <BookOpen size={20}/> FOGLIO 2 (Interno)
           </h3>
           <div className="bg-white w-full aspect-[297/210] shadow-2xl flex relative overflow-hidden rounded-sm select-none">
                {/* Watermark Editor */}
                <div className={`absolute inset-0 flex items-center justify-center overflow-hidden ${isEditingWatermark ? 'z-50 pointer-events-auto bg-black/5' : 'z-0 pointer-events-none'}`}>
                    <div 
                        onMouseDown={(e) => startDrag(e, 2)}
                        className={`relative group ${isEditingWatermark ? 'cursor-move' : ''}`}
                        style={{ transform: `translate(${wmSheet2.x}px, ${wmSheet2.y}px) scale(${wmSheet2.scale}) rotate(12deg)` }}
                    >
                        <span className={`text-[100px] text-black transition-opacity ${isEditingWatermark ? 'opacity-30' : 'opacity-[0.06]'}`}>
                            {themeAssets.watermark}
                        </span>
                        {isEditingWatermark && (
                            <>
                                <div className="absolute inset-[-10px] border-4 border-dashed border-blue-400 rounded-xl opacity-50 animate-pulse pointer-events-none"></div>
                                <div 
                                    onMouseDown={(e) => { e.stopPropagation(); setActiveResize(2); }}
                                    className="absolute bottom-[-20px] right-[-20px] w-12 h-12 bg-blue-600 border-4 border-white rounded-full cursor-se-resize flex items-center justify-center shadow-xl z-50 hover:scale-110 transition-transform"
                                >
                                    <MoveDiagonal size={20} className="text-white"/>
                                </div>
                            </>
                        )}
                    </div>
                </div>
                <div className="absolute inset-y-0 left-1/2 w-px bg-gray-300 border-l border-dashed border-gray-400 opacity-50 z-10"></div>
                <div className={`absolute inset-0 flex z-10 transition-opacity duration-300 ${isEditingWatermark ? 'opacity-20 pointer-events-none blur-[1px]' : 'opacity-100'}`}>
                    {/* DEDICA */}
                    <div className={`w-1/2 h-full p-6 flex flex-col items-center justify-between text-center ${themeAssets.printBorder} border-r-0 relative bg-white/90`}>
                        <span className="absolute top-2 left-2 text-[10px] uppercase text-gray-300 font-bold">Lato Sinistro</span>
                        <div className="flex-1 w-full flex flex-col items-center justify-center relative">
                            {photos.length > 0 ? (
                                <div className="w-[70%] aspect-square border-4 border-white shadow-lg overflow-hidden rounded-sm bg-gray-100 rotate-1 mb-4">
                                    <PhotoCollage photos={photos} />
                                </div>
                            ) : data.images?.extraImage ? (
                                <img src={data.images.extraImage} className="h-32 object-contain mb-4" />
                            ) : null}
                            <div className="w-full relative group">
                                {isEditingMsg ? (
                                    <div className="w-full animate-in zoom-in-95 bg-white p-2 rounded-xl shadow-lg border border-blue-200 z-20 absolute top-[-50px] left-0 pointer-events-auto">
                                        <textarea className="w-full p-2 bg-gray-50 border border-blue-200 rounded-lg text-center text-sm focus:outline-none focus:border-blue-400 font-hand" rows={4} value={editableMessage} onChange={(e) => setEditableMessage(e.target.value)}/>
                                        <div className="flex gap-2 mt-2 justify-center"><button onClick={() => setIsEditingMsg(false)} className="bg-green-500 text-white text-xs px-3 py-1 rounded-full font-bold">Fatto</button></div>
                                    </div>
                                ) : (
                                    <div className="relative cursor-pointer hover:bg-yellow-50 rounded-xl p-2 transition-colors border border-transparent hover:border-yellow-200 pointer-events-auto" onClick={() => setIsEditingMsg(true)}>
                                        <p className={`text-xl md:text-2xl leading-relaxed ${themeAssets.fontTitle} text-gray-800`}>"{editableMessage}"</p>
                                        <span className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 text-gray-400 bg-white rounded-full p-1 shadow-md pointer-events-none"><Edit size={12}/></span>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex gap-2 text-2xl mt-2 justify-center">{data.stickers?.slice(0,5).map((s,i) => <span key={i}>{s}</span>)}</div>
                    </div>
                    {/* GIOCO */}
                    <div className="w-1/2 h-full p-4 md:p-6 flex flex-col relative z-10 bg-white/90">
                        <span className="absolute top-2 right-2 text-[10px] uppercase text-gray-300 font-bold">Lato Destro</span>
                        {isCrossword ? (
                            <>
                                <h2 className="text-lg font-bold uppercase border-b-2 border-black mb-2 pb-1 text-center tracking-widest">Cruciverba</h2>
                                {data.solution && (
                                    <div className="mb-2 bg-yellow-50 border border-yellow-200 p-1 rounded-lg text-center mx-auto inline-block">
                                        <div className="flex justify-center gap-0.5">{data.solution.word.split('').map((c,i) => <div key={i} className={`w-4 h-4 border rounded text-[10px] flex items-center justify-center font-bold ${revealAnswers ? 'bg-yellow-400 text-white border-yellow-500' : 'bg-white border-yellow-200 text-gray-400'}`}>{revealAnswers ? c : (i+1)}</div>)}</div>
                                    </div>
                                )}
                                <div className="flex-1 flex items-start justify-center overflow-hidden min-h-0 pointer-events-auto">
                                    <div style={{ width: '90%', maxHeight: '100%', aspectRatio: `${data.width}/${data.height}` }}>{renderGridCells(false)}</div>
                                </div>
                                <div className="mt-2 text-[9px] md:text-[10px] grid grid-cols-2 gap-2 leading-tight w-full border-t border-black pt-2 overflow-y-auto max-h-[35%] custom-scrollbar pointer-events-auto">
                                    <div className="pr-1"><b className="block border-b border-gray-300 mb-1 pb-0.5 font-bold text-xs">Orizzontali</b>{data.words.filter(w=>w.direction===Direction.ACROSS).map(w=><div key={w.id} className="mb-0.5"><b className="mr-1">{w.number}.</b>{w.clue}</div>)}</div>
                                    <div className="pl-1 border-l border-gray-100"><b className="block border-b border-gray-300 mb-1 pb-0.5 font-bold text-xs">Verticali</b>{data.words.filter(w=>w.direction===Direction.DOWN).map(w=><div key={w.id} className="mb-0.5"><b className="mr-1">{w.number}.</b>{w.clue}</div>)}</div>
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex items-center justify-center opacity-20 border-2 border-dashed border-gray-300 m-8 rounded-xl"><p className="text-xl font-hand rotate-[-5deg] text-center">Spazio per dedica<br/>scritta a mano...</p></div>
                        )}
                    </div>
                </div>
           </div>
       </div>

       {/* --- HIDDEN PDF EXPORT STAGE (FIXED PIXEL LAYOUT for 96 DPI A4) --- */}
       {/* Width: 1123px (A4 landscape 96dpi), Height: 794px */}
       <div ref={exportRef} style={{ position: 'fixed', top: 0, left: '-9999px', width: '1123px', zIndex: -100 }}>
            {/* SHEET 1 */}
            <div id="pdf-sheet-1" style={{ width: '1123px', height: '794px', display: 'flex', position: 'relative', backgroundColor: 'white', overflow: 'hidden' }}>
                 <div style={{ position: 'absolute', top: '50%', left: '50%', transform: `translate(-50%, -50%) translate(${wmSheet1.x}px, ${wmSheet1.y}px) scale(${wmSheet1.scale}) rotate(12deg)`, fontSize: '300px', opacity: 0.1, zIndex: 0, whiteSpace: 'nowrap' }}>{themeAssets.watermark}</div>
                 {/* Retro */}
                 <div style={{ width: '50%', height: '100%', padding: '60px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', borderRight: '1px solid #eee' }}>
                    <div style={{ fontSize: '80px', opacity: 0.2, marginBottom: '20px' }}>{themeAssets.decoration}</div>
                    <div style={{ fontSize: '14px', textTransform: 'uppercase', color: '#999', letterSpacing: '2px' }}>Enigmistica Auguri</div>
                 </div>
                 {/* Fronte */}
                 <div className={themeAssets.printBorder} style={{ width: '50%', height: '100%', padding: '60px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', borderLeft: 'none', position: 'relative' }}>
                     <h1 className={themeAssets.fontTitle} style={{ fontSize: '50px', marginBottom: '10px', lineHeight: 1.2 }}>{data.title}</h1>
                     <div style={{ width: '80px', height: '3px', background: '#333', marginBottom: '20px' }}></div>
                     <p style={{ fontSize: '18px', textTransform: 'uppercase', color: '#666', letterSpacing: '2px', marginBottom: '40px' }}>{data.eventDate} • {currentYear}</p>
                     {data.images?.extraImage ? (
                       <img src={data.images.extraImage} style={{ maxHeight: '250px', objectFit: 'contain' }} />
                     ) : (
                       <div style={{ fontSize: '120px', opacity: 0.8 }}>{themeAssets.decoration}</div>
                     )}
                     <div style={{ marginTop: 'auto', fontSize: '12px', fontStyle: 'italic', color: '#999' }}>"Apri per scoprire..."</div>
                 </div>
            </div>

            {/* SHEET 2 */}
            <div id="pdf-sheet-2" style={{ width: '1123px', height: '794px', display: 'flex', position: 'relative', backgroundColor: 'white', overflow: 'hidden' }}>
                 <div style={{ position: 'absolute', top: '50%', left: '50%', transform: `translate(-50%, -50%) translate(${wmSheet2.x}px, ${wmSheet2.y}px) scale(${wmSheet2.scale}) rotate(12deg)`, fontSize: '300px', opacity: 0.1, zIndex: 0, whiteSpace: 'nowrap' }}>{themeAssets.watermark}</div>
                 {/* Dedica */}
                 <div className={themeAssets.printBorder} style={{ width: '50%', height: '100%', padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', borderRight: 'none' }}>
                     <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                        {photos.length > 0 ? (
                            <div style={{ width: '80%', aspectRatio: '1/1', border: '5px solid white', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', overflow: 'hidden', backgroundColor: '#f3f4f6', marginBottom: '20px' }}>
                                <PhotoCollage photos={photos} />
                            </div>
                        ) : data.images?.extraImage ? (
                            <img src={data.images.extraImage} style={{ maxHeight: '150px', marginBottom: '20px' }} />
                        ) : null}
                        <p className={themeAssets.fontTitle} style={{ fontSize: '24px', lineHeight: 1.5, marginBottom: '20px' }}>"{editableMessage}"</p>
                        <div style={{ display: 'flex', gap: '10px', fontSize: '30px', opacity: 0.8 }}>
                             {data.stickers?.slice(0,5).map((s,i) => <span key={i}>{s}</span>)}
                        </div>
                     </div>
                 </div>
                 {/* Gioco */}
                 <div className={themeAssets.printBorder} style={{ width: '50%', height: '100%', padding: '40px', display: 'flex', flexDirection: 'column', borderLeft: 'none' }}>
                    {isCrossword ? (
                       <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
                           <h2 style={{ fontSize: '20px', fontWeight: 'bold', textTransform: 'uppercase', borderBottom: '2px solid black', marginBottom: '10px', paddingBottom: '5px', textAlign: 'center', letterSpacing: '2px' }}>Cruciverba</h2>
                           {data.solution && (
                                <div style={{ marginBottom: '15px', textAlign: 'center' }}>
                                    <div style={{ display: 'inline-flex', gap: '2px', border: '1px solid black', padding: '4px', borderRadius: '4px', backgroundColor: '#f9fafb' }}>
                                        {data.solution.word.split('').map((c,i) => (
                                            <div key={i} style={{ width: '20px', height: '20px', border: '1px solid black', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                                                {revealAnswers ? c : (i+1)}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                           <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
                               <div style={{ width: '90%', maxHeight: '100%' }}>{renderGridCells(true)}</div>
                           </div>
                           <div style={{ fontSize: '10px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', lineHeight: 1.2, borderTop: '2px solid black', paddingTop: '15px' }}>
                                <div>
                                    <b style={{ display: 'block', borderBottom: '1px solid #ccc', marginBottom: '5px', paddingBottom: '2px', textTransform: 'uppercase', fontWeight: 'bold' }}>Orizzontali</b>
                                    {data.words.filter(w=>w.direction===Direction.ACROSS).map(w=><div key={w.id} style={{ marginBottom: '2px' }}><b style={{ marginRight: '4px' }}>{w.number}.</b>{w.clue}</div>)}
                                </div>
                                <div>
                                    <b style={{ display: 'block', borderBottom: '1px solid #ccc', marginBottom: '5px', paddingBottom: '2px', textTransform: 'uppercase', fontWeight: 'bold' }}>Verticali</b>
                                    {data.words.filter(w=>w.direction===Direction.DOWN).map(w=><div key={w.id} style={{ marginBottom: '2px' }}><b style={{ marginRight: '4px' }}>{w.number}.</b>{w.clue}</div>)}
                                </div>
                           </div>
                       </div>
                   ) : (
                       <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed #ccc', borderRadius: '10px', opacity: 0.3 }}>
                           <p className="font-hand" style={{ fontSize: '30px', transform: 'rotate(-5deg)' }}>Spazio per la tua dedica scritta a mano...</p>
                       </div>
                   )}
                 </div>
            </div>
       </div>
    </div>
  );
};

export default CrosswordGrid;
