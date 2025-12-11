
import React, { useState, useEffect, useRef } from 'react';
import { CrosswordData, CellData, Direction, ThemeType } from '../types';
import { Printer, Edit, Eye, EyeOff, BookOpen, FileText, CheckCircle2, Palette, Download, Loader2, XCircle, RotateCw, Maximize, Move, Info, Type, Trash2 } from 'lucide-react';
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

const getSolutionLabel = (index: number) => {
    // Converte 1 -> A, 2 -> B, ecc.
    return String.fromCharCode(64 + index);
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

type ItemType = 'wm1' | 'wm2' | 'img1' | 'img2' | 'txt2' | 'customTxt' | 'sticker';

interface PositionableItem {
    id: string;
    type: ItemType;
    x: number;
    y: number;
    scale: number;
    content?: string; // Text or Sticker char
}

const CrosswordGrid: React.FC<CrosswordGridProps> = ({ data, onComplete, onEdit, onUpdate }) => {
  const [grid, setGrid] = useState<CellData[][]>([]);
  const [selectedCell, setSelectedCell] = useState<{ x: number; y: number } | null>(null);
  const [currentDirection, setCurrentDirection] = useState<Direction>(Direction.ACROSS);
  const [editableMessage, setEditableMessage] = useState(data.message);
  
  const [isEditingMsg, setIsEditingMsg] = useState(false);
  const [revealAnswers, setRevealAnswers] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[][]>([]);

  // Graphical Assets State
  const [isEditingLayout, setIsEditingLayout] = useState(false);
  
  // Standard Items
  const [wmSheet1, setWmSheet1] = useState({ scale: 1.5, x: 0, y: 0 });
  const [wmSheet2, setWmSheet2] = useState({ scale: 1.5, x: 0, y: 0 });
  const [imgSheet1, setImgSheet1] = useState({ scale: 1, x: 0, y: 0 });
  const [imgSheet2, setImgSheet2] = useState({ scale: 1, x: 0, y: 0 });
  const [txtSheet2, setTxtSheet2] = useState({ scale: 1, x: 0, y: 0 });

  // Custom Items Arrays
  const [customTexts, setCustomTexts] = useState<PositionableItem[]>([]);
  const [stickers, setStickers] = useState<PositionableItem[]>([]);

  const [activeDrag, setActiveDrag] = useState<{id: string, startX: number, startY: number, initialX: number, initialY: number} | null>(null);
  const [activeResize, setActiveResize] = useState<{id: string} | null>(null);

  // PDF Generation State
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  const themeAssets = THEME_ASSETS[data.theme] || THEME_ASSETS.generic;
  const isCrossword = data.type === 'crossword';
  const photos = data.images?.photos || (data.images?.photo ? [data.images.photo] : []);
  const currentYear = new Date().getFullYear();

  // Initialize Stickers from Data
  useEffect(() => {
      if (data.stickers && stickers.length === 0) {
          const newStickers = data.stickers.map((s, i) => ({
              id: `sticker-${i}`,
              type: 'sticker' as ItemType,
              x: (i * 40) - (data.stickers!.length * 20), // Center roughly
              y: 0,
              scale: 1,
              content: s
          }));
          setStickers(newStickers);
      }
  }, [data.stickers]);

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
  const getItemState = (id: string) => {
      if (id === 'wm1') return wmSheet1;
      if (id === 'wm2') return wmSheet2;
      if (id === 'img1') return imgSheet1;
      if (id === 'img2') return imgSheet2;
      if (id === 'txt2') return txtSheet2;
      const customTxt = customTexts.find(t => t.id === id);
      if (customTxt) return customTxt;
      const stkr = stickers.find(s => s.id === id);
      if (stkr) return stkr;
      return { x:0, y:0, scale:1 };
  };

  const setItemState = (id: string, newState: Partial<PositionableItem>) => {
      if (id === 'wm1') setWmSheet1(p => ({ ...p, ...newState }));
      else if (id === 'wm2') setWmSheet2(p => ({ ...p, ...newState }));
      else if (id === 'img1') setImgSheet1(p => ({ ...p, ...newState }));
      else if (id === 'img2') setImgSheet2(p => ({ ...p, ...newState }));
      else if (id === 'txt2') setTxtSheet2(p => ({ ...p, ...newState }));
      else if (id.startsWith('custom-')) {
          setCustomTexts(prev => prev.map(p => p.id === id ? { ...p, ...newState } : p));
      } else if (id.startsWith('sticker-')) {
          setStickers(prev => prev.map(p => p.id === id ? { ...p, ...newState } : p));
      }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
        if (activeResize) {
            const deltaY = e.movementY * 0.02; 
            const current = getItemState(activeResize.id);
            setItemState(activeResize.id, { scale: Math.max(0.1, Math.min(current.scale + deltaY, 6.0)) });
        } else if (activeDrag) {
            const dx = e.clientX - activeDrag.startX;
            const dy = e.clientY - activeDrag.startY;
            setItemState(activeDrag.id, { x: activeDrag.initialX + dx, y: activeDrag.initialY + dy });
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
  }, [activeResize, activeDrag, customTexts, stickers]);

  const startDrag = (e: React.MouseEvent, id: string) => {
      if (!isEditingLayout) return;
      // Prevent drag if editing text
      if ((e.target as HTMLElement).tagName === 'TEXTAREA') return; 

      e.stopPropagation();
      const current = getItemState(id);
      setActiveDrag({
          id,
          startX: e.clientX,
          startY: e.clientY,
          initialX: current.x,
          initialY: current.y
      });
  };

  const startResize = (e: React.MouseEvent, id: string) => {
      if (!isEditingLayout) return;
      e.stopPropagation();
      setActiveResize({ id });
  };

  const addCustomText = () => {
      const newId = `custom-${Date.now()}`;
      setCustomTexts([...customTexts, {
          id: newId,
          type: 'customTxt',
          x: 0,
          y: 0,
          scale: 1,
          content: "Nuovo Testo"
      }]);
  };

  const updateCustomTextContent = (id: string, newText: string) => {
      setCustomTexts(prev => prev.map(p => p.id === id ? { ...p, content: newText } : p));
  };
  
  const removeCustomText = (id: string) => {
      setCustomTexts(prev => prev.filter(p => p.id !== id));
  };

  // --- RENDER HELPERS (SOLUTION) ---
  const renderSolution = () => {
      if (!data.solution) return null;
      
      // Use original string (stored in geminiService or fallback to word if older version)
      // @ts-ignore
      const rawString = data.solution.original || data.solution.word;
      const chars = rawString.split('');
      
      let letterIndexCounter = 0;

      return (
        <div className="mb-2 p-1 text-center mx-auto inline-block">
            <div className="flex justify-center gap-1 flex-wrap">
                {chars.map((char: string, i: number) => {
                    const isSpace = !/[A-Z]/i.test(char);
                    if (isSpace) {
                        return <div key={i} className="w-4 h-6"></div>; // Spacer
                    }
                    
                    letterIndexCounter++;
                    const currentIndex = letterIndexCounter; // Capture for closure

                    return (
                        <div key={i} style={{ 
                            width: '25px', height: '25px', 
                            backgroundColor: revealAnswers ? '#FEF08A' : 'white', 
                            border: '1px solid #EAB308', 
                            display: 'flex', alignItems: 'center', justifyContent: 'center', 
                            fontWeight: 'bold', fontSize: '14px', color: '#854D0E', 
                            position: 'relative'
                        }}>
                            {revealAnswers && <span style={{zIndex: 2}}>{char}</span>}
                            <span style={{
                                position: 'absolute', bottom: '1px', right: '1px', 
                                fontSize: '8px', color: '#B45309', fontWeight: 'bold', lineHeight: 1
                            }}>
                                {getSolutionLabel(currentIndex)}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
      );
  };

  // --- PDF GENERATION ---
  const handleDownloadPDF = async () => {
      if (!exportRef.current) return;
      setIsGeneratingPDF(true);
      
      try {
        const sheet1 = exportRef.current.querySelector('#pdf-sheet-1') as HTMLElement;
        const sheet2 = exportRef.current.querySelector('#pdf-sheet-2') as HTMLElement;

        if (!sheet1 || !sheet2) throw new Error("Elements not found");

        await new Promise(resolve => setTimeout(resolve, 500));

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

        const win = window.open('', '_blank');
        if (!win) {
            alert("Il browser ha bloccato l'apertura della nuova finestra. Abilita i popup.");
            return;
        }

        win.document.write(`
            <!DOCTYPE html>
            <html>
                <head>
                    <title>Anteprima Biglietto - ${data.recipientName}</title>
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <style>
                        body { 
                            font-family: system-ui, -apple-system, sans-serif; 
                            background-color: #374151; margin: 0; padding: 0; 
                            display: flex; flex-direction: column; align-items: center; min-height: 100vh;
                        }
                        .toolbar { 
                            position: fixed; top: 0; left: 0; right: 0; background: white; padding: 12px 20px; 
                            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); display: flex; justify-content: center; gap: 15px; 
                            z-index: 1000;
                        }
                        .btn { padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; border: none; }
                        .btn-primary { background: #2563eb; color: white; }
                        .btn-secondary { background: #f3f4f6; color: #374151; }
                        .content { margin-top: 80px; padding: 20px; width: 100%; max-width: 1200px; display: flex; flex-direction: column; align-items: center; gap: 40px; }
                        .preview-img { max-width: 95vw; max-height: 85vh; object-fit: contain; border: 1px solid #eee; background: white; }
                        .instruction { color: white; margin-bottom: 5px; text-align: center; }
                        .rotate-180 { transform: rotate(180deg); }
                        @media print {
                            body { background: white; display: block; }
                            .toolbar, .instruction { display: none !important; }
                            .content { margin: 0; padding: 0; width: 100%; display: block; }
                            .preview-img { width: 297mm; height: 210mm; max-width: none; max-height: none; page-break-after: always; }
                        }
                    </style>
                    <script>
                        function toggleRotation() { document.getElementById('sheet2-img').classList.toggle('rotate-180'); }
                    </script>
                </head>
                <body>
                    <div class="toolbar">
                        <button class="btn btn-secondary" onclick="window.close()">❌ Chiudi</button>
                        <button class="btn btn-secondary" onclick="toggleRotation()">🔄 Ruota Retro</button>
                        <button class="btn btn-primary" onclick="window.print()">🖨️ STAMPA</button>
                    </div>
                    <div class="content">
                        <div><p class="instruction">FOGLIO 1 (Esterno)</p><img src="${imgData1}" class="preview-img" /></div>
                        <div><p class="instruction">FOGLIO 2 (Interno)</p><img id="sheet2-img" src="${imgData2}" class="preview-img" /></div>
                    </div>
                </body>
            </html>
        `);
        win.document.close();
      } catch (e) {
          console.error("PDF Error", e);
          alert("Errore PDF. Riprova.");
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

  const renderGridCells = (isPrint = false) => (
    <div 
        className={`grid gap-[1px] bg-black/10 p-2 rounded-lg`} 
        style={{ 
            gridTemplateColumns: `repeat(${data.width}, minmax(0, 1fr))`, 
            aspectRatio: `${data.width}/${data.height}`, 
            height: isPrint ? '100%' : 'auto', 
            width: isPrint ? '100%' : 'auto' 
        }}
    >
      {grid.map((row, y) => row.map((cell, x) => {
          const isSelected = !isPrint && selectedCell?.x === x && selectedCell?.y === y;
          const displayChar = isPrint ? '' : (revealAnswers ? cell.char : cell.userChar); 
          if (!cell.char) return <div key={`${x}-${y}`} className={`bg-black/5 rounded-sm`} />;
          
          return (
            <div 
                key={`${x}-${y}-${revealAnswers}`} 
                onClick={() => !isPrint && handleCellClick(x, y)} 
                className={`relative flex items-center justify-center w-full h-full text-xl font-bold cursor-pointer rounded-sm`} 
                style={{
                    backgroundColor: cell.isSolutionCell ? '#FEF08A' : (isSelected && !isPrint ? '#DBEAFE' : '#FFFFFF'), 
                    width: isPrint ? '100%' : undefined,
                    height: isPrint ? '100%' : undefined,
                    boxSizing: 'border-box'
                }}
            >
              {cell.number && <span className={`absolute top-0 left-0 leading-none ${isPrint ? 'text-[8px] p-[1px] font-bold text-gray-500' : 'text-[9px] p-0.5 text-gray-500'}`}>{cell.number}</span>}
              {cell.isSolutionCell && cell.solutionIndex !== undefined && (
                  <div className={`absolute bottom-0 right-0 leading-none font-bold text-gray-600 bg-white/60 rounded-tl-sm z-10 ${isPrint ? 'text-[8px] p-[1px]' : 'text-[9px] p-0.5'}`}>
                      {getSolutionLabel(cell.solutionIndex)}
                  </div>
              )}
              {isPrint ? <span className="font-bold text-lg"></span> : (
                  isSelected && !revealAnswers ? (
                     <input ref={(el) => { inputRefs.current[y][x] = el; }} maxLength={1} className="w-full h-full text-center bg-transparent outline-none uppercase" value={cell.userChar} onChange={(e) => handleInput(x, y, e.target.value)} />
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
       <div className="flex flex-wrap gap-2 justify-center z-20 sticky top-2 p-2 bg-black/5 rounded-full backdrop-blur-sm shadow-xl border border-white/10">
            <button onClick={onEdit} className="bg-white px-4 py-2 rounded-full shadow border text-sm flex items-center gap-2 font-bold hover:bg-gray-50 text-gray-700 transition-transform active:scale-95"><Edit size={16} /> Modifica Dati</button>
            <button onClick={() => setIsEditingLayout(!isEditingLayout)} className={`px-4 py-2 rounded-full shadow border text-sm flex items-center gap-2 font-bold transition-all active:scale-95 ${isEditingLayout ? 'bg-blue-600 text-white border-blue-600 shadow-blue-500/30' : 'bg-white text-gray-700'}`}>
                {isEditingLayout ? <CheckCircle2 size={16}/> : <Palette size={16}/>} {isEditingLayout ? 'Fatto' : 'Modifica Layout'}
            </button>
            
            {/* ADD TEXT BUTTON (Only in Layout Mode or Always? Always good) */}
            {isEditingLayout && (
                 <button onClick={addCustomText} className="bg-white px-3 py-2 rounded-full shadow border text-sm flex items-center gap-2 font-bold hover:bg-purple-50 text-purple-700 transition-transform active:scale-95 border-purple-200">
                    <Type size={16}/> Aggiungi Testo
                 </button>
            )}

            <button onClick={() => setRevealAnswers(!revealAnswers)} className={`px-4 py-2 rounded-full shadow border text-sm flex items-center gap-2 font-bold transition-all active:scale-95 ${revealAnswers ? 'bg-yellow-100 text-yellow-800 border-yellow-300' : 'bg-white text-gray-700'}`}>{revealAnswers ? <EyeOff size={16}/> : <Eye size={16}/>} {revealAnswers ? 'Nascondi' : 'Soluzione'}</button>
            <button 
                onClick={handleDownloadPDF} 
                disabled={isGeneratingPDF}
                className={`text-white px-6 py-2 rounded-full shadow-lg text-sm flex items-center gap-2 font-bold transition-all active:scale-95 ${isGeneratingPDF ? 'bg-gray-400 cursor-wait' : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 ring-2 ring-white/20'}`}
            >
                {isGeneratingPDF ? <Loader2 size={16} className="animate-spin"/> : <Printer size={16} />} 
                {isGeneratingPDF ? 'ANTEPRIMA STAMPA' : 'ANTEPRIMA STAMPA'}
            </button>
       </div>
       
       {/* --- ON SCREEN PREVIEW (INTERACTIVE) --- */}

       {/* FOGLIO 1: ESTERNO */}
       <div className="w-full max-w-5xl px-4 md:px-0">
            <h3 className="text-center text-white font-bold uppercase tracking-widest mb-4 flex items-center justify-center gap-2 drop-shadow-md">
                <FileText size={20}/> FOGLIO 1 (Esterno)
            </h3>
            
            <div className="bg-white w-full aspect-[297/210] shadow-2xl flex relative overflow-hidden rounded-sm select-none">
                 {/* 1. Watermark Layer (Lowest Z) */}
                 <div className={`absolute inset-0 flex items-center justify-center overflow-hidden z-0`}>
                    <div 
                        className="relative group"
                        style={{ 
                            transform: `translate(${wmSheet1.x}px, ${wmSheet1.y}px) scale(${wmSheet1.scale}) rotate(12deg)`,
                            cursor: isEditingLayout ? 'move' : 'default'
                        }}
                        onMouseDown={isEditingLayout ? (e) => startDrag(e, 'wm1') : undefined}
                    >
                        <span className={`text-[100px] text-black transition-opacity duration-300 ${isEditingLayout ? 'opacity-30' : 'opacity-20'}`}>
                            {themeAssets.watermark}
                        </span>
                    </div>
                 </div>

                 <div className="absolute inset-y-0 left-1/2 w-px bg-gray-300 border-l border-dashed border-gray-400 opacity-50 z-10 pointer-events-none"></div>

                 {/* 3. Content Layer - POINTER EVENTS MANAGEMENT IS CRITICAL HERE */}
                 <div className={`absolute inset-0 flex z-10 transition-opacity duration-300 ${isEditingLayout ? 'opacity-90 pointer-events-none' : 'opacity-100 pointer-events-none'}`}>
                     
                     {/* RETRO */}
                     <div className={`w-1/2 h-full p-8 flex flex-col items-center justify-center text-center ${themeAssets.printBorder} border-r-0 relative pointer-events-none`}>
                         <div className="text-6xl opacity-20 mb-4">{themeAssets.decoration}</div>
                         {data.images?.brandLogo && (
                            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center opacity-80">
                                <p className="text-[8px] uppercase tracking-widest text-gray-400 mb-1">Created by</p>
                                <img src={data.images.brandLogo} className="h-8 object-contain" />
                            </div>
                         )}
                     </div>
                     
                     {/* FRONTE */}
                     <div className={`w-1/2 h-full p-8 flex flex-col items-center justify-center text-center ${themeAssets.printBorder} border-l-0 relative`}>
                         <h1 className={`text-4xl md:text-5xl ${themeAssets.fontTitle} mb-4 text-gray-900 leading-tight drop-shadow-sm`}>{data.title}</h1>
                         <p className="text-sm md:text-base uppercase text-gray-500 mb-8 font-bold tracking-widest">{data.eventDate || "Data Speciale"} • {currentYear}</p>
                         
                         {/* DRAGGABLE COVER IMAGE (Pointer Events Auto to allow dragging) */}
                         {data.images?.extraImage ? (
                            <div 
                                className={`relative inline-block mb-4 group ${isEditingLayout ? 'cursor-move ring-2 ring-blue-500 ring-dashed pointer-events-auto' : 'pointer-events-auto'}`}
                                style={{ transform: `translate(${imgSheet1.x}px, ${imgSheet1.y}px) scale(${imgSheet1.scale})` }}
                                onMouseDown={isEditingLayout ? (e) => startDrag(e, 'img1') : undefined}
                            >
                                <img src={data.images.extraImage} className="h-32 md:h-48 object-contain drop-shadow-md pointer-events-none" />
                                {isEditingLayout && (
                                    <div onMouseDown={(e) => startResize(e, 'img1')} className="absolute -bottom-4 -right-4 w-8 h-8 bg-blue-600 text-white rounded-full shadow-xl flex items-center justify-center cursor-nwse-resize z-50 pointer-events-auto"><Maximize size={14} /></div>
                                )}
                            </div>
                         ) : (
                            <div className="text-8xl opacity-80 drop-shadow-sm">{themeAssets.decoration}</div>
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
                {/* 1. Watermark Layer */}
                <div className={`absolute inset-0 flex items-center justify-center overflow-hidden z-0`}>
                    <div 
                        className="relative group"
                        style={{ 
                            transform: `translate(${wmSheet2.x}px, ${wmSheet2.y}px) scale(${wmSheet2.scale}) rotate(12deg)`,
                            cursor: isEditingLayout ? 'move' : 'default'
                        }}
                        onMouseDown={isEditingLayout ? (e) => startDrag(e, 'wm2') : undefined}
                    >
                        <span className={`text-[100px] text-black transition-opacity duration-300 ${isEditingLayout ? 'opacity-30' : 'opacity-20'}`}>
                            {themeAssets.watermark}
                        </span>
                    </div>
                </div>

                <div className="absolute inset-y-0 left-1/2 w-px bg-gray-300 border-l border-dashed border-gray-400 opacity-50 z-10 pointer-events-none"></div>

                {/* 3. Content Layer */}
                <div className={`absolute inset-0 flex z-10 transition-opacity duration-300 ${isEditingLayout ? 'opacity-90 pointer-events-none' : 'opacity-100 pointer-events-none'}`}>
                    
                    {/* DEDICA (Left) */}
                    <div className={`w-1/2 h-full p-6 flex flex-col items-center justify-between text-center ${themeAssets.printBorder} border-r-0 relative`}>
                        <div className="flex-1 w-full flex flex-col items-center justify-center relative">
                            {photos.length > 0 ? (
                                <div 
                                    className={`w-[70%] aspect-square mb-4 relative ${isEditingLayout ? 'cursor-move ring-2 ring-blue-500 ring-dashed pointer-events-auto' : 'pointer-events-auto'}`}
                                    style={{ transform: `translate(${imgSheet2.x}px, ${imgSheet2.y}px) scale(${imgSheet2.scale})` }}
                                    onMouseDown={isEditingLayout ? (e) => startDrag(e, 'img2') : undefined}
                                >
                                    <div className="w-full h-full border-4 border-white shadow-lg overflow-hidden rounded-sm bg-gray-100 rotate-1 pointer-events-none">
                                        <PhotoCollage photos={photos} />
                                    </div>
                                    {isEditingLayout && <div onMouseDown={(e) => startResize(e, 'img2')} className="absolute -bottom-4 -right-4 w-8 h-8 bg-blue-600 text-white rounded-full shadow-xl flex items-center justify-center cursor-nwse-resize z-50 pointer-events-auto"><Maximize size={14} /></div>}
                                </div>
                            ) : data.images?.extraImage ? (
                                <div 
                                    className={`relative inline-block mb-4 ${isEditingLayout ? 'cursor-move ring-2 ring-blue-500 ring-dashed pointer-events-auto' : 'pointer-events-auto'}`}
                                    style={{ transform: `translate(${imgSheet2.x}px, ${imgSheet2.y}px) scale(${imgSheet2.scale})` }}
                                    onMouseDown={isEditingLayout ? (e) => startDrag(e, 'img2') : undefined}
                                >
                                    <img src={data.images.extraImage} className="h-32 object-contain drop-shadow-md pointer-events-none" />
                                    {isEditingLayout && <div onMouseDown={(e) => startResize(e, 'img2')} className="absolute -bottom-4 -right-4 w-8 h-8 bg-blue-600 text-white rounded-full shadow-xl flex items-center justify-center cursor-nwse-resize z-50 pointer-events-auto"><Maximize size={14} /></div>}
                                </div>
                            ) : null}

                            {/* Main Message Text */}
                            <div 
                                className={`w-full relative group ${isEditingLayout ? 'cursor-move ring-2 ring-blue-500 ring-dashed pointer-events-auto' : 'pointer-events-auto'}`}
                                style={{ transform: `translate(${txtSheet2.x}px, ${txtSheet2.y}px) scale(${txtSheet2.scale})` }}
                                onMouseDown={isEditingLayout ? (e) => startDrag(e, 'txt2') : undefined}
                            >
                                {isEditingMsg ? (
                                    <div className="w-full animate-in zoom-in-95 bg-white p-2 rounded-xl shadow-lg border border-blue-200 z-20 absolute top-[-50px] left-0 pointer-events-auto">
                                        <textarea className="w-full p-2 bg-gray-50 border border-blue-200 rounded-lg text-center text-sm focus:outline-none focus:border-blue-400 font-hand" rows={4} value={editableMessage} onChange={(e) => setEditableMessage(e.target.value)}/>
                                        <div className="flex gap-2 mt-2 justify-center"><button onClick={() => setIsEditingMsg(false)} className="bg-green-500 text-white text-xs px-3 py-1 rounded-full font-bold">Fatto</button></div>
                                    </div>
                                ) : (
                                    <div className="relative cursor-pointer hover:bg-yellow-50/50 rounded-xl p-2 transition-colors border border-transparent hover:border-yellow-200" onClick={() => !isEditingLayout && setIsEditingMsg(true)}>
                                        <p className={`text-xl md:text-2xl leading-relaxed ${themeAssets.fontTitle} text-gray-800 drop-shadow-sm`}>"{editableMessage}"</p>
                                        <span className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 text-gray-400 bg-white rounded-full p-1 shadow-md pointer-events-none"><Edit size={12}/></span>
                                    </div>
                                )}
                                {isEditingLayout && <div onMouseDown={(e) => startResize(e, 'txt2')} className="absolute -bottom-4 -right-4 w-8 h-8 bg-blue-600 text-white rounded-full shadow-xl flex items-center justify-center cursor-nwse-resize z-50 pointer-events-auto"><Maximize size={14} /></div>}
                            </div>
                        </div>

                        {/* STICKERS AND CUSTOM TEXT CONTAINER (ABSOLUTE POSITIONING) */}
                        <div className="absolute inset-0 pointer-events-none overflow-hidden">
                            {/* Stickers */}
                            {stickers.map(s => (
                                <div key={s.id}
                                    className={`absolute left-1/2 top-1/2 flex items-center justify-center ${isEditingLayout ? 'pointer-events-auto cursor-move ring-1 ring-blue-300 ring-dashed' : 'pointer-events-auto'}`}
                                    style={{ transform: `translate(-50%, -50%) translate(${s.x}px, ${s.y}px) scale(${s.scale})` }}
                                    onMouseDown={isEditingLayout ? (e) => startDrag(e, s.id) : undefined}
                                >
                                    <span className="text-4xl drop-shadow-sm">{s.content}</span>
                                    {isEditingLayout && <div onMouseDown={(e) => startResize(e, s.id)} className="absolute -bottom-2 -right-2 w-4 h-4 bg-blue-500 rounded-full cursor-nwse-resize pointer-events-auto"></div>}
                                </div>
                            ))}
                             {/* Custom Texts */}
                             {customTexts.map(t => (
                                <div key={t.id}
                                    className={`absolute left-1/2 top-1/2 flex items-center justify-center ${isEditingLayout ? 'pointer-events-auto cursor-move ring-1 ring-purple-300 ring-dashed bg-white/50 rounded-lg' : 'pointer-events-auto'}`}
                                    style={{ transform: `translate(-50%, -50%) translate(${t.x}px, ${t.y}px) scale(${t.scale})` }}
                                    onMouseDown={isEditingLayout ? (e) => startDrag(e, t.id) : undefined}
                                >
                                    {isEditingLayout ? (
                                        <div className="relative group">
                                            <input 
                                                value={t.content} 
                                                onChange={(e) => updateCustomTextContent(t.id, e.target.value)}
                                                className={`bg-transparent text-center font-hand text-lg focus:outline-none min-w-[100px] text-purple-900 placeholder-purple-300`}
                                            />
                                            <button onClick={() => removeCustomText(t.id)} className="absolute -top-3 -left-3 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={10}/></button>
                                            <div onMouseDown={(e) => startResize(e, t.id)} className="absolute -bottom-2 -right-2 w-4 h-4 bg-purple-500 rounded-full cursor-nwse-resize pointer-events-auto"></div>
                                        </div>
                                    ) : (
                                        <p className="font-hand text-lg text-purple-900 text-center">{t.content}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* GIOCO (Right) */}
                    <div className="w-1/2 h-full p-4 md:p-6 flex flex-col relative z-10 pointer-events-auto">
                        {isCrossword ? (
                            <>
                                <h2 className="text-lg font-bold uppercase border-b-2 border-black mb-2 pb-1 text-center tracking-widest">Cruciverba</h2>
                                {renderSolution()}
                                <div className="flex-1 flex items-start justify-center overflow-hidden min-h-0">
                                    <div style={{ width: '90%', maxHeight: '100%', aspectRatio: `${data.width}/${data.height}` }}>{renderGridCells(false)}</div>
                                </div>
                                <div className="mt-2 text-[9px] md:text-[10px] grid grid-cols-2 gap-2 leading-tight w-full border-t border-black pt-2 overflow-y-auto max-h-[35%] custom-scrollbar">
                                    <div className="pr-1"><b className="block border-b border-gray-300 mb-1 pb-0.5 font-bold text-xs">Orizzontali</b>{data.words.filter(w=>w.direction===Direction.ACROSS).map(w=><div key={w.id} className="mb-0.5"><b className="mr-1">{w.number}.</b>{w.clue} ({w.word.length})</div>)}</div>
                                    <div className="pl-1 border-l border-gray-100"><b className="block border-b border-gray-300 mb-1 pb-0.5 font-bold text-xs">Verticali</b>{data.words.filter(w=>w.direction===Direction.DOWN).map(w=><div key={w.id} className="mb-0.5"><b className="mr-1">{w.number}.</b>{w.clue} ({w.word.length})</div>)}</div>
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex items-center justify-center opacity-20 border-2 border-dashed border-gray-300 m-8 rounded-xl"><p className="text-xl font-hand rotate-[-5deg] text-center">Spazio per dedica<br/>scritta a mano...</p></div>
                        )}
                    </div>
                </div>
           </div>
       </div>

       {/* --- HIDDEN PDF EXPORT STAGE --- */}
       <div ref={exportRef} style={{ position: 'fixed', top: 0, left: '-9999px', width: '1123px', zIndex: -100 }}>
            {/* SHEET 1 */}
            <div id="pdf-sheet-1" style={{ width: '1123px', height: '794px', display: 'flex', position: 'relative', backgroundColor: 'white', overflow: 'hidden' }}>
                 <div style={{ position: 'absolute', top: '50%', left: '50%', transform: `translate(-50%, -50%) translate(${wmSheet1.x}px, ${wmSheet1.y}px) scale(${wmSheet1.scale}) rotate(12deg)`, fontSize: '130px', opacity: 0.20, zIndex: 0, whiteSpace: 'nowrap' }}>{themeAssets.watermark}</div>
                 {/* Retro */}
                 <div className={themeAssets.printBorder} style={{ width: '50%', height: '100%', padding: '60px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', borderRight: 'none', position: 'relative', zIndex: 10, boxSizing: 'border-box' }}>
                    <div style={{ fontSize: '80px', opacity: 0.2, marginBottom: '20px' }}>{themeAssets.decoration}</div>
                    {data.images?.brandLogo && (
                        <div style={{ position: 'absolute', bottom: '40px', left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: 0.8 }}>
                            <p style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '2px', color: '#9ca3af', marginBottom: '5px' }}>Created by</p>
                            <img src={data.images.brandLogo} style={{ height: '40px', objectFit: 'contain' }} />
                        </div>
                    )}
                 </div>
                 {/* Fronte */}
                 <div className={themeAssets.printBorder} style={{ width: '50%', height: '100%', padding: '60px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', borderLeft: 'none', position: 'relative', zIndex: 10, boxSizing: 'border-box' }}>
                     <h1 className={themeAssets.fontTitle} style={{ fontSize: '50px', marginBottom: '10px', lineHeight: 1.2 }}>{data.title}</h1>
                     <div style={{ width: '80px', height: '3px', background: '#333', marginBottom: '20px' }}></div>
                     <p style={{ fontSize: '18px', textTransform: 'uppercase', color: '#666', letterSpacing: '2px', marginBottom: '40px' }}>
                        {data.eventDate || "Data Speciale"} • {currentYear}
                     </p>
                     {data.images?.extraImage ? (
                       <img src={data.images.extraImage} style={{ maxHeight: '250px', objectFit: 'contain', transform: `translate(${imgSheet1.x}px, ${imgSheet1.y}px) scale(${imgSheet1.scale})` }} />
                     ) : (
                       <div style={{ fontSize: '120px', opacity: 0.8 }}>{themeAssets.decoration}</div>
                     )}
                     <div style={{ marginTop: 'auto', fontSize: '12px', fontStyle: 'italic', color: '#999' }}>"Apri per scoprire..."</div>
                 </div>
            </div>

            {/* SHEET 2 */}
            <div id="pdf-sheet-2" style={{ width: '1123px', height: '794px', display: 'flex', position: 'relative', backgroundColor: 'white', overflow: 'hidden' }}>
                 <div style={{ position: 'absolute', top: '50%', left: '50%', transform: `translate(-50%, -50%) translate(${wmSheet2.x}px, ${wmSheet2.y}px) scale(${wmSheet2.scale}) rotate(12deg)`, fontSize: '130px', opacity: 0.20, zIndex: 0, whiteSpace: 'nowrap' }}>{themeAssets.watermark}</div>
                 {/* Dedica */}
                 <div className={themeAssets.printBorder} style={{ width: '50%', height: '100%', padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', borderRight: 'none', position: 'relative', zIndex: 10, boxSizing: 'border-box' }}>
                     <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', position: 'relative' }}>
                        {photos.length > 0 ? (
                            <div style={{ 
                                width: '80%', aspectRatio: '1/1', border: '5px solid white', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', overflow: 'hidden', backgroundColor: '#f3f4f6', marginBottom: '20px',
                                transform: `translate(${imgSheet2.x}px, ${imgSheet2.y}px) scale(${imgSheet2.scale})`
                            }}>
                                <PhotoCollage photos={photos} />
                            </div>
                        ) : data.images?.extraImage ? (
                            <img src={data.images.extraImage} style={{ maxHeight: '150px', marginBottom: '20px', transform: `translate(${imgSheet2.x}px, ${imgSheet2.y}px) scale(${imgSheet2.scale})` }} />
                        ) : null}
                        
                        <div style={{ transform: `translate(${txtSheet2.x}px, ${txtSheet2.y}px) scale(${txtSheet2.scale})` }}>
                            <p className={themeAssets.fontTitle} style={{ fontSize: '24px', lineHeight: 1.5, marginBottom: '20px' }}>"{editableMessage}"</p>
                        </div>
                        
                        {/* PDF Stickers & Custom Texts Layer */}
                        <div style={{position: 'absolute', top:0, left:0, width: '100%', height: '100%', pointerEvents: 'none'}}>
                            {stickers.map(s => (
                                <div key={s.id} style={{ position: 'absolute', left: '50%', top: '50%', transform: `translate(-50%, -50%) translate(${s.x * 2}px, ${s.y * 2}px) scale(${s.scale})` }}>
                                    <span style={{ fontSize: '40px' }}>{s.content}</span>
                                </div>
                            ))}
                            {customTexts.map(t => (
                                <div key={t.id} style={{ position: 'absolute', left: '50%', top: '50%', transform: `translate(-50%, -50%) translate(${t.x * 2}px, ${t.y * 2}px) scale(${t.scale})` }}>
                                    <p className="font-hand" style={{ fontSize: '20px', color: '#581c87', textAlign: 'center' }}>{t.content}</p>
                                </div>
                            ))}
                        </div>
                     </div>
                 </div>
                 {/* Gioco */}
                 <div className={themeAssets.printBorder} style={{ width: '50%', height: '100%', padding: '40px', display: 'flex', flexDirection: 'column', borderLeft: 'none', position: 'relative', zIndex: 10, justifyContent: 'space-between', boxSizing: 'border-box' }}>
                    {isCrossword ? (
                       <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
                           <div>
                                <h2 style={{ fontSize: '20px', fontWeight: 'bold', textTransform: 'uppercase', borderBottom: '2px solid black', marginBottom: '10px', paddingBottom: '5px', textAlign: 'center', letterSpacing: '2px' }}>Cruciverba</h2>
                                {renderSolution()}
                           </div>
                           <div style={{ width: '100%', height: '500px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', flexShrink: 0 }}>
                               <div style={{ aspectRatio: `${data.width}/${data.height}`, height: '100%', maxHeight: '100%', maxWidth: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                   {renderGridCells(true)}
                               </div>
                           </div>
                           <div style={{ flex: 1, overflow: 'hidden', fontSize: '9px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', lineHeight: 1.2, borderTop: '2px solid black', paddingTop: '15px', alignContent: 'start' }}>
                                <div><b style={{ display: 'block', borderBottom: '1px solid #ccc', marginBottom: '5px', paddingBottom: '2px', textTransform: 'uppercase', fontWeight: 'bold' }}>Orizzontali</b>{data.words.filter(w=>w.direction===Direction.ACROSS).map(w=><div key={w.id} style={{ marginBottom: '4px', whiteSpace: 'normal' }}><b style={{ marginRight: '4px' }}>{w.number}.</b>{w.clue} ({w.word.length})</div>)}</div>
                                <div><b style={{ display: 'block', borderBottom: '1px solid #ccc', marginBottom: '5px', paddingBottom: '2px', textTransform: 'uppercase', fontWeight: 'bold' }}>Verticali</b>{data.words.filter(w=>w.direction===Direction.DOWN).map(w=><div key={w.id} style={{ marginBottom: '4px', whiteSpace: 'normal' }}><b style={{ marginRight: '4px' }}>{w.number}.</b>{w.clue} ({w.word.length})</div>)}</div>
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
