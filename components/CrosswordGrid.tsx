
import React, { useState, useEffect, useRef } from 'react';
import { CrosswordData, CellData, Direction, ThemeType } from '../types';
import { Printer, Edit, Eye, EyeOff, BookOpen, FileText, CheckCircle2, Palette, Download, Loader2, XCircle, RotateCw, Maximize, Move, Info, Type, Trash2, Grip, ArrowRightLeft } from 'lucide-react';
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

type ItemType = 'wm1' | 'wm2' | 'img1' | 'img2' | 'txt2' | 'stickerGroup' | 'customTxt';

interface PositionableItem {
    id: string;
    type: ItemType;
    x: number;
    y: number;
    scale: number;
    width?: number;
    content?: string; 
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
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  
  const [wmSheet1, setWmSheet1] = useState({ scale: 1.5, x: 0, y: 0 });
  const [wmSheet2, setWmSheet2] = useState({ scale: 1.5, x: 0, y: 0 });
  
  const [imgSheet1, setImgSheet1] = useState({ scale: 1, x: 0, y: 0 });
  const [imgSheet2, setImgSheet2] = useState({ scale: 1, x: 0, y: 0 });
  
  const [txtSheet2, setTxtSheet2] = useState({ scale: 1, x: 0, y: 0 });
  
  const [stickerGroup, setStickerGroup] = useState({ scale: 1, x: 0, y: 260 }); 

  const [customTexts, setCustomTexts] = useState<PositionableItem[]>([]);

  const [activeDrag, setActiveDrag] = useState<{id: string, startX: number, startY: number, initialX: number, initialY: number} | null>(null);
  const [activeResize, setActiveResize] = useState<{id: string, startX: number, startY: number, initialScale: number, initialWidth?: number, mode: 'scale' | 'width'} | null>(null);

  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  const themeAssets = THEME_ASSETS[data.theme] || THEME_ASSETS.generic;
  const isCrossword = data.type === 'crossword';
  const photos = data.images?.photos || [];
  const currentYear = new Date().getFullYear();

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
  const getItemState = (id: string): { x: number; y: number; scale: number; width?: number; content?: string } => {
      if (id === 'wm1') return wmSheet1;
      if (id === 'wm2') return wmSheet2;
      if (id === 'img1') return imgSheet1;
      if (id === 'img2') return imgSheet2;
      if (id === 'txt2') return txtSheet2;
      if (id === 'stickerGroup') return stickerGroup;
      
      const customTxt = customTexts.find(t => t.id === id);
      if (customTxt) return customTxt;
      
      return { x:0, y:0, scale:1 };
  };

  const setItemState = (id: string, newState: Partial<PositionableItem>) => {
      if (id === 'wm1') setWmSheet1(p => ({ ...p, ...newState }));
      else if (id === 'wm2') setWmSheet2(p => ({ ...p, ...newState }));
      else if (id === 'img1') setImgSheet1(p => ({ ...p, ...newState }));
      else if (id === 'img2') setImgSheet2(p => ({ ...p, ...newState }));
      else if (id === 'txt2') setTxtSheet2(p => ({ ...p, ...newState }));
      else if (id === 'stickerGroup') setStickerGroup(p => ({ ...p, ...newState }));
      else if (id.startsWith('custom-')) {
          setCustomTexts(prev => prev.map(p => p.id === id ? { ...p, ...newState } : p));
      }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
        if (activeResize) {
            e.preventDefault(); 
            e.stopPropagation();
            
            if (activeResize.mode === 'width') {
                 const deltaX = e.clientX - activeResize.startX;
                 // Adjust width
                 const newWidth = Math.max(100, (activeResize.initialWidth || 200) + deltaX);
                 setItemState(activeResize.id, { width: newWidth });
            } else {
                 // Adjust scale (default behavior)
                 const deltaY = e.clientY - activeResize.startY; 
                 const scaleChange = deltaY * 0.01; 
                 const newScale = Math.max(0.1, Math.min(activeResize.initialScale + scaleChange, 6.0));
                 setItemState(activeResize.id, { scale: newScale });
            }

        } else if (activeDrag) {
            e.preventDefault();
            e.stopPropagation();
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
  }, [activeResize, activeDrag, customTexts]);

  const startDrag = (e: React.MouseEvent, id: string) => {
      if (activeItemId !== id) return;
      if ((e.target as HTMLElement).tagName === 'TEXTAREA') return; 
      if ((e.target as HTMLElement).tagName === 'INPUT') return; 

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

  const startResize = (e: React.MouseEvent, id: string, mode: 'scale' | 'width' = 'scale') => {
      if (activeItemId !== id) return;
      e.stopPropagation(); 
      e.preventDefault();
      const current = getItemState(id);
      setActiveResize({ 
          id, 
          startX: e.clientX,
          startY: e.clientY, 
          initialScale: current.scale,
          initialWidth: current.width,
          mode
      });
  };

  const addCustomText = () => {
      const newId = `custom-${Date.now()}`;
      setCustomTexts([...customTexts, {
          id: newId,
          type: 'customTxt',
          x: 0,
          y: -100, 
          scale: 1,
          width: 250, // Default width
          content: "Tuo Testo"
      }]);
      setActiveItemId(newId);
  };

  const updateCustomTextContent = (id: string, newText: string) => {
      setCustomTexts(prev => prev.map(p => p.id === id ? { ...p, content: newText } : p));
  };
  
  const removeCustomText = (id: string) => {
      setCustomTexts(prev => prev.filter(p => p.id !== id));
      setActiveItemId(null);
  };

  // --- RENDER HELPERS ---
  const renderSolution = (isPrint = false) => {
      if (!data.solution) return null;
      // @ts-ignore
      const rawString = data.solution.original || data.solution.word;
      const chars = rawString.split('');
      
      let letterIndexCounter = 0;

      return (
        <div className="mb-2 p-1 w-full flex justify-center">
            <div className="flex justify-center gap-1 flex-wrap">
                {chars.map((char: string, i: number) => {
                    const isSpace = !/[A-Z]/i.test(char);
                    if (isSpace) return <div key={i} className="w-4 h-6"></div>;
                    
                    letterIndexCounter++;
                    const currentIndex = letterIndexCounter;

                    return (
                        <div key={i} style={{ 
                            width: '25px', height: '25px', 
                            // FIX: isPrint -> Always White. View -> Yellow if revealed, White if not.
                            backgroundColor: (!isPrint && revealAnswers) ? '#FEF08A' : 'white', 
                            border: '1px solid #EAB308', 
                            display: 'flex', alignItems: 'center', justifyContent: 'center', 
                            fontWeight: 'bold', fontSize: '14px', color: '#854D0E', 
                            position: 'relative'
                        }}>
                            {/* In Print mode, never show char. In View, show if revealed. */}
                            {!isPrint && revealAnswers && <span style={{zIndex: 2}}>{char}</span>}
                            
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

  const handleDownloadPDF = async () => {
      if (!exportRef.current) return;
      setIsGeneratingPDF(true);
      try {
        const sheet1 = exportRef.current.querySelector('#pdf-sheet-1') as HTMLElement;
        const sheet2 = exportRef.current.querySelector('#pdf-sheet-2') as HTMLElement;
        if (!sheet1 || !sheet2) throw new Error("Elements not found");
        await new Promise(resolve => setTimeout(resolve, 500));
        const options = { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' };
        const canvas1 = await html2canvas(sheet1, options);
        const canvas2 = await html2canvas(sheet2, options);
        const imgData1 = canvas1.toDataURL('image/jpeg', 0.95);
        const imgData2 = canvas2.toDataURL('image/jpeg', 0.95);
        const win = window.open('', '_blank');
        if (!win) { alert("Abilita i popup."); return; }
        
        // CSS Aggiornato per Toolbar con pulsanti fissi grandi
        win.document.write(`<!DOCTYPE html><html><head><title>Anteprima Biglietto</title><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>body{font-family:system-ui;background:#374151;margin:0;padding:0;display:flex;flex-direction:column;align-items:center;min-height:100vh}.toolbar{position:fixed;top:0;left:0;width:100%;height:70px;background:white;box-shadow:0 4px 10px rgba(0,0,0,0.2);display:flex;align-items:center;justify-content:center;gap:20px;z-index:9999;min-width:600px;overflow-x:auto}.btn{padding:12px 24px;border-radius:30px;font-weight:700;cursor:pointer;border:2px solid #e5e7eb;white-space:nowrap;flex-shrink:0;font-size:16px;background:white;color:#374151;box-shadow:0 2px 5px rgba(0,0,0,0.05);transition:all 0.2s}.btn:hover{background:#f9fafb;border-color:#d1d5db;transform:translateY(-1px)}.btn-primary{background:#2563eb;color:white;border-color:#2563eb}.btn-primary:hover{background:#1d4ed8}.content{margin-top:90px;padding:20px;display:flex;flex-direction:column;align-items:center;gap:40px}.preview-img{max-width:95vw;max-height:85vh;border:1px solid #eee;background:white;box-shadow:0 20px 25px -5px rgba(0,0,0,0.1)}.rotate-180{transform:rotate(180deg)}@media print{body{display:block;background:white}.toolbar{display:none}.content{margin:0;padding:0;display:block}.preview-img{width:297mm;height:210mm;max-width:none;page-break-after:always;box-shadow:none;border:none}}</style><script>function toggleRotation(){document.getElementById('sheet2-img').classList.toggle('rotate-180')}</script></head><body><div class="toolbar"><button class="btn" onclick="window.close()">❌ Chiudi</button><button class="btn" onclick="toggleRotation()">🔄 Ruota Retro</button><button class="btn btn-primary" onclick="window.print()">🖨️ STAMPA</button></div><div class="content"><img src="${imgData1}" class="preview-img"/><img id="sheet2-img" src="${imgData2}" class="preview-img"/></div></body></html>`);
        win.document.close();
      } catch (e) { console.error("PDF Error", e); alert("Errore PDF."); } finally { setIsGeneratingPDF(false); }
  };

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
    <div className={`grid gap-[1px] bg-black/10 p-2 rounded-lg`} style={{ 
        gridTemplateColumns: `repeat(${data.width}, minmax(0, 1fr))`, 
        aspectRatio: `${data.width}/${data.height}`,
        width: '100%', 
        height: 'auto',
        maxHeight: '100%',
        maxWidth: '100%',
        margin: '0 auto' 
    }}>
      {grid.map((row, y) => row.map((cell, x) => {
          const isSelected = !isPrint && selectedCell?.x === x && selectedCell?.y === y;
          const displayChar = isPrint ? '' : (revealAnswers ? cell.char : cell.userChar); 
          if (!cell.char) return <div key={`${x}-${y}`} className={`bg-black/5 rounded-sm`} />;
          return (
            <div key={`${x}-${y}-${revealAnswers}`} onClick={() => !isPrint && handleCellClick(x, y)} className={`relative flex items-center justify-center w-full h-full text-xl font-bold cursor-pointer rounded-sm`} style={{ backgroundColor: cell.isSolutionCell ? '#FEF08A' : (isSelected && !isPrint ? '#DBEAFE' : '#FFFFFF'), boxSizing: 'border-box' }}>
              {cell.number && <span className={`absolute top-0 left-0 leading-none ${isPrint ? 'text-[8px] p-[1px] font-bold text-gray-500' : 'text-[9px] p-0.5 text-gray-500'}`}>{cell.number}</span>}
              {cell.isSolutionCell && cell.solutionIndex !== undefined && <div className={`absolute bottom-0 right-0 leading-none font-bold text-gray-600 bg-white/60 rounded-tl-sm z-10 ${isPrint ? 'text-[8px] p-[1px]' : 'text-[9px] p-0.5'}`}>{getSolutionLabel(cell.solutionIndex)}</div>}
              {isPrint ? <span className="font-bold text-lg"></span> : (isSelected && !revealAnswers ? <input ref={(el) => { inputRefs.current[y][x] = el; }} maxLength={1} className="w-full h-full text-center bg-transparent outline-none uppercase" value={cell.userChar} onChange={(e) => handleInput(x, y, e.target.value)} /> : <span className={revealAnswers ? 'text-green-600' : ''}>{displayChar}</span>)}
            </div>
          );
      }))}
    </div>
  );

  return (
    <div className="flex flex-col items-center gap-8 w-full pb-20" onClick={() => setActiveItemId(null)}>
       
       <div className="flex flex-wrap gap-2 justify-center z-20 sticky top-2 p-2 bg-black/5 rounded-full backdrop-blur-sm shadow-xl border border-white/10" onClick={(e) => e.stopPropagation()}>
            <button onClick={onEdit} className="bg-white px-4 py-2 rounded-full shadow border text-sm flex items-center gap-2 font-bold hover:bg-gray-50 text-gray-700 active:scale-95"><Edit size={16} /> Modifica Dati</button>
            <button onClick={addCustomText} className="bg-white px-3 py-2 rounded-full shadow border text-sm flex items-center gap-2 font-bold hover:bg-purple-50 text-purple-700 active:scale-95 border-purple-200"><Type size={16}/> Aggiungi Testo</button>
            <button onClick={() => setRevealAnswers(!revealAnswers)} className={`px-4 py-2 rounded-full shadow border text-sm flex items-center gap-2 font-bold active:scale-95 ${revealAnswers ? 'bg-yellow-100 text-yellow-800' : 'bg-white text-gray-700'}`}>{revealAnswers ? <EyeOff size={16}/> : <Eye size={16}/>} {revealAnswers ? 'Nascondi' : 'Soluzione'}</button>
            <button onClick={handleDownloadPDF} disabled={isGeneratingPDF} className={`text-white px-6 py-2 rounded-full shadow-lg text-sm flex items-center gap-2 font-bold active:scale-95 ${isGeneratingPDF ? 'bg-gray-400' : 'bg-gradient-to-r from-green-600 to-emerald-600'}`}>{isGeneratingPDF ? <Loader2 size={16} className="animate-spin"/> : <Printer size={16} />} ANTEPRIMA STAMPA</button>
       </div>
       
       {/* FOGLIO 1: ESTERNO */}
       <div className="w-full max-w-5xl px-4 md:px-0">
            <h3 className="text-center text-white font-bold uppercase tracking-widest mb-4 flex items-center justify-center gap-2 drop-shadow-md"><FileText size={20}/> FOGLIO 1 (Esterno)</h3>
            <div className="bg-white w-full aspect-[297/210] shadow-2xl flex relative overflow-hidden rounded-sm select-none">
                 {/* WATERMARK - OPTIONAL */}
                 {data.hasWatermark && (
                     <div className={`absolute inset-0 flex items-center justify-center overflow-hidden ${activeItemId === 'wm1' ? 'z-20' : 'z-0'}`}>
                        <div className="relative group" 
                            style={{ transform: `translate(${wmSheet1.x}px, ${wmSheet1.y}px) scale(${wmSheet1.scale}) rotate(12deg)`, cursor: activeItemId === 'wm1' ? 'move' : 'default', pointerEvents: activeItemId === 'wm1' ? 'auto' : 'none' }} 
                            onMouseDown={(e) => startDrag(e, 'wm1')}
                            onDoubleClick={(e) => { e.stopPropagation(); setActiveItemId('wm1'); }}
                        >
                            <span className={`text-[100px] text-black transition-opacity duration-300 ${activeItemId === 'wm1' ? 'opacity-30' : 'opacity-20'}`}>{themeAssets.watermark}</span>
                            {activeItemId === 'wm1' && <div onMouseDown={(e) => startResize(e, 'wm1')} className="absolute -bottom-6 -right-6 w-10 h-10 bg-blue-600 text-white rounded-full shadow-xl flex items-center justify-center cursor-nwse-resize z-50 pointer-events-auto hover:scale-110"><Maximize size={20} /></div>}
                        </div>
                     </div>
                 )}
                 <div className="absolute inset-y-0 left-1/2 w-px bg-gray-300 border-l border-dashed border-gray-400 opacity-50 z-10 pointer-events-none"></div>

                 {/* CONTENT LAYER */}
                 <div className={`absolute inset-0 flex z-10 transition-opacity duration-300 pointer-events-none`}>
                     <div className={`w-1/2 h-full p-8 flex flex-col items-center justify-center text-center ${themeAssets.printBorder} border-r-0 relative pointer-events-none`}>
                         <div className="text-6xl opacity-20 mb-4">{themeAssets.decoration}</div>
                         {data.images?.brandLogo && <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center opacity-80"><img src={data.images.brandLogo} className="h-8 object-contain" /></div>}
                     </div>
                     <div className={`w-1/2 h-full flex flex-col items-center justify-center text-center ${themeAssets.printBorder} border-l-0 relative`}>
                         {/* COVER IMAGE - FULL SIZE */}
                         {data.images?.extraImage ? (
                            <div className={`w-full h-full relative`}>
                                <img src={data.images.extraImage} className="w-full h-full object-cover" />
                            </div>
                         ) : <div className="text-8xl opacity-80 drop-shadow-sm">{themeAssets.decoration}</div>}
                     </div>
                 </div>
            </div>
       </div>

       {/* FOGLIO 2: INTERNO */}
       <div className="w-full max-w-5xl px-4 md:px-0">
           <h3 className="text-center text-white font-bold uppercase tracking-widest mb-4 flex items-center justify-center gap-2 drop-shadow-md"><BookOpen size={20}/> FOGLIO 2 (Interno)</h3>
           <div className="bg-white w-full aspect-[297/210] shadow-2xl flex relative overflow-hidden rounded-sm select-none">
                {/* WATERMARK - OPTIONAL */}
                {data.hasWatermark && (
                    <div className={`absolute inset-0 flex items-center justify-center overflow-hidden ${activeItemId === 'wm2' ? 'z-20 pointer-events-auto' : 'z-0 pointer-events-none'}`}>
                        <div className="relative group" 
                            style={{ transform: `translate(${wmSheet2.x}px, ${wmSheet2.y}px) scale(${wmSheet2.scale}) rotate(12deg)`, cursor: activeItemId === 'wm2' ? 'move' : 'default', pointerEvents: activeItemId === 'wm2' ? 'auto' : 'none' }} 
                            onMouseDown={(e) => startDrag(e, 'wm2')}
                            onDoubleClick={(e) => { e.stopPropagation(); setActiveItemId('wm2'); }}
                        >
                            <span className={`text-[100px] text-black transition-opacity duration-300 ${activeItemId === 'wm2' ? 'opacity-30' : 'opacity-20'}`}>{themeAssets.watermark}</span>
                            {activeItemId === 'wm2' && <div onMouseDown={(e) => startResize(e, 'wm2')} className="absolute -bottom-6 -right-6 w-10 h-10 bg-blue-600 text-white rounded-full shadow-xl flex items-center justify-center cursor-nwse-resize z-50 pointer-events-auto hover:scale-110"><Maximize size={20} /></div>}
                        </div>
                    </div>
                )}
                <div className="absolute inset-y-0 left-1/2 w-px bg-gray-300 border-l border-dashed border-gray-400 opacity-50 z-10 pointer-events-none"></div>

                {/* CONTENT */}
                <div className={`absolute inset-0 flex z-10`}>
                    {/* DEDICA (Left) - HEADER MOVED TO TOP */}
                    <div className={`w-1/2 h-full p-6 flex flex-col text-center ${themeAssets.printBorder} border-r-0 relative`}>
                        {/* HEADER: TITLE & DATE - MOVED UP HERE */}
                        <div className="mb-4 pointer-events-auto shrink-0 z-20">
                            <h1 className={`text-2xl md:text-3xl ${themeAssets.fontTitle} text-gray-900 leading-tight drop-shadow-sm`}>{data.title}</h1>
                            <p className="text-xs uppercase text-gray-500 font-bold tracking-widest mt-1">{data.eventDate || "Data Speciale"} • {currentYear}</p>
                        </div>
                        
                        <div className="flex-1 w-full flex flex-col items-center justify-center relative">
                            {photos.length > 0 ? (
                                <div className={`w-[70%] aspect-square mb-4 relative ${activeItemId === 'img2' ? 'cursor-move ring-2 ring-blue-500 ring-dashed pointer-events-auto z-50' : 'pointer-events-auto'}`} 
                                    style={{ transform: `translate(${imgSheet2.x}px, ${imgSheet2.y}px) scale(${imgSheet2.scale})` }} 
                                    onMouseDown={(e) => startDrag(e, 'img2')}
                                    onDoubleClick={(e) => { e.stopPropagation(); setActiveItemId('img2'); }}
                                >
                                    <div className="w-full h-full border-4 border-white shadow-lg overflow-hidden rounded-sm bg-gray-100 rotate-1 pointer-events-none"><PhotoCollage photos={photos} /></div>
                                    {activeItemId === 'img2' && <div onMouseDown={(e) => startResize(e, 'img2')} className="absolute -bottom-6 -right-6 w-10 h-10 bg-blue-600 text-white rounded-full shadow-xl flex items-center justify-center cursor-nwse-resize z-50 pointer-events-auto hover:scale-110"><Maximize size={20} /></div>}
                                </div>
                            ) : data.images?.extraImage ? (
                                <div className={`relative inline-block mb-4 ${activeItemId === 'img2' ? 'cursor-move ring-2 ring-blue-500 ring-dashed pointer-events-auto z-50' : 'pointer-events-auto'}`} 
                                    style={{ transform: `translate(${imgSheet2.x}px, ${imgSheet2.y}px) scale(${imgSheet2.scale})` }} 
                                    onMouseDown={(e) => startDrag(e, 'img2')}
                                    onDoubleClick={(e) => { e.stopPropagation(); setActiveItemId('img2'); }}
                                >
                                    <img src={data.images.extraImage} className="h-32 object-contain drop-shadow-md pointer-events-none" />
                                    {activeItemId === 'img2' && <div onMouseDown={(e) => startResize(e, 'img2')} className="absolute -bottom-6 -right-6 w-10 h-10 bg-blue-600 text-white rounded-full shadow-xl flex items-center justify-center cursor-nwse-resize z-50 pointer-events-auto hover:scale-110"><Maximize size={20} /></div>}
                                </div>
                            ) : null}

                            <div className={`w-full relative group ${activeItemId === 'txt2' ? 'cursor-move ring-2 ring-blue-500 ring-dashed pointer-events-auto z-50' : 'pointer-events-auto'}`} 
                                style={{ transform: `translate(${txtSheet2.x}px, ${txtSheet2.y}px) scale(${txtSheet2.scale})` }} 
                                onMouseDown={(e) => startDrag(e, 'txt2')}
                                onDoubleClick={(e) => { e.stopPropagation(); setActiveItemId('txt2'); }}
                            >
                                {isEditingMsg ? (
                                    <div className="w-full bg-white p-2 rounded-xl shadow-lg border border-blue-200 z-20 absolute top-[-50px] left-0 pointer-events-auto"><textarea className="w-full p-2 bg-gray-50 border border-blue-200 rounded-lg text-center text-sm font-hand" rows={4} value={editableMessage} onChange={(e) => setEditableMessage(e.target.value)}/><button onClick={() => setIsEditingMsg(false)} className="bg-green-500 text-white text-xs px-3 py-1 rounded-full font-bold mt-2">Fatto</button></div>
                                ) : (
                                    <div className="relative cursor-pointer hover:bg-yellow-50/50 rounded-xl p-2 transition-colors border border-transparent hover:border-yellow-200" onClick={() => !activeItemId && setIsEditingMsg(true)}>
                                        <p className={`text-xl md:text-2xl leading-relaxed ${themeAssets.fontTitle} text-gray-800 drop-shadow-sm`}>"{editableMessage}"</p>
                                        <span className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 text-gray-400 bg-white rounded-full p-1 shadow-md pointer-events-none"><Edit size={12}/></span>
                                    </div>
                                )}
                                {activeItemId === 'txt2' && <div onMouseDown={(e) => startResize(e, 'txt2')} className="absolute -bottom-6 -right-6 w-10 h-10 bg-blue-600 text-white rounded-full shadow-xl flex items-center justify-center cursor-nwse-resize z-50 pointer-events-auto hover:scale-110"><Maximize size={20} /></div>}
                            </div>
                        </div>
                        
                        {/* STICKER CONTAINER - Single Group */}
                        <div className={`absolute left-1/2 top-1/2 ${activeItemId === 'stickerGroup' ? 'cursor-move ring-2 ring-green-400 ring-dashed bg-green-50/30 rounded-lg pointer-events-auto z-50' : 'pointer-events-auto'}`} 
                            style={{ transform: `translate(-50%, -50%) translate(${stickerGroup.x}px, ${stickerGroup.y}px) scale(${stickerGroup.scale})` }} 
                            onMouseDown={(e) => startDrag(e, 'stickerGroup')}
                            onDoubleClick={(e) => { e.stopPropagation(); setActiveItemId('stickerGroup'); }}
                        >
                            <div className="flex gap-2 text-3xl drop-shadow-sm">{data.stickers?.slice(0,5).map((s,i) => <span key={i}>{s}</span>)}</div>
                            {activeItemId === 'stickerGroup' && <div onMouseDown={(e) => startResize(e, 'stickerGroup')} className="absolute -bottom-6 -right-6 w-10 h-10 bg-blue-600 text-white rounded-full shadow-xl flex items-center justify-center cursor-nwse-resize z-50 pointer-events-auto hover:scale-110"><Maximize size={20} /></div>}
                        </div>

                         {/* Custom Texts */}
                         {customTexts.map(t => (
                            <div key={t.id} className={`absolute left-1/2 top-1/2 flex items-center justify-center ${activeItemId === t.id ? 'pointer-events-auto cursor-move ring-1 ring-purple-300 ring-dashed bg-white/80 rounded-lg shadow-sm z-50' : 'pointer-events-auto'}`} 
                                style={{ transform: `translate(-50%, -50%) translate(${t.x}px, ${t.y}px)` }} 
                                onMouseDown={(e) => startDrag(e, t.id)}
                                onDoubleClick={(e) => { e.stopPropagation(); setActiveItemId(t.id); }}
                            >
                                {activeItemId === t.id ? (
                                    <div className="relative group p-2 border-2 border-purple-300 border-dashed rounded-lg" style={{ width: `${t.width || 250}px` }}>
                                        <textarea 
                                            value={t.content} 
                                            onChange={(e) => updateCustomTextContent(t.id, e.target.value)} 
                                            className="w-full bg-transparent text-center font-hand focus:outline-none text-purple-900 placeholder-purple-300 resize-none overflow-hidden"
                                            style={{ fontSize: `${(t.scale * 20)}px`, lineHeight: 1.2 }}
                                            rows={Math.max(1, (t.content?.split('\n').length || 1))}
                                        />
                                        <button onClick={() => removeCustomText(t.id)} className="absolute -top-3 -left-3 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto"><Trash2 size={12}/></button>
                                        
                                        {/* Scale Handle (Bottom Right) */}
                                        <div onMouseDown={(e) => startResize(e, t.id, 'scale')} className="absolute -bottom-3 -right-3 w-6 h-6 bg-purple-600 text-white rounded-full shadow-md flex items-center justify-center cursor-nwse-resize pointer-events-auto hover:scale-110 z-20"><Maximize size={12}/></div>
                                        
                                        {/* Width Handle (Right Edge) */}
                                        <div onMouseDown={(e) => startResize(e, t.id, 'width')} className="absolute top-1/2 -right-3 -translate-y-1/2 w-4 h-8 bg-purple-400 text-white rounded-md shadow-md flex items-center justify-center cursor-ew-resize pointer-events-auto hover:scale-110 z-20"><ArrowRightLeft size={12}/></div>
                                    </div>
                                ) : (
                                    <div style={{ width: `${t.width || 250}px` }}>
                                        <p className="font-hand text-purple-900 text-center px-2" style={{ fontSize: `${(t.scale * 20)}px`, lineHeight: 1.2, wordWrap: 'break-word' }}>{t.content}</p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* GIOCO (Right) - FLEX FIX */}
                    <div className="w-1/2 h-full p-4 md:p-6 flex flex-col relative z-10 pointer-events-auto overflow-hidden">
                        {isCrossword ? (
                            <div className="flex flex-col h-full w-full">
                                <div className="shrink-0">
                                    <h2 className="text-lg font-bold uppercase border-b-2 border-black mb-2 pb-1 text-center tracking-widest">Cruciverba</h2>
                                    {renderSolution()}
                                </div>
                                {/* FLEX GROW FOR GRID to occupy max space */}
                                <div className="flex-1 min-h-0 flex items-center justify-center py-2 relative w-full">
                                    <div className="w-full h-full flex items-center justify-center">
                                         {renderGridCells(false)}
                                    </div>
                                </div>
                                {/* CLUES: Shrink if needed, scrollable */}
                                <div className="shrink-0 mt-2 text-[9px] md:text-[10px] grid grid-cols-2 gap-2 leading-tight w-full border-t border-black pt-2 overflow-y-auto max-h-[150px] custom-scrollbar">
                                    <div className="pr-1"><b className="block border-b border-gray-300 mb-1 pb-0.5 font-bold text-xs">Orizzontali</b>{data.words.filter(w=>w.direction===Direction.ACROSS).map(w=><div key={w.id} className="mb-0.5"><b className="mr-1">{w.number}.</b>{w.clue}</div>)}</div>
                                    <div className="pl-1 border-l border-gray-100"><b className="block border-b border-gray-300 mb-1 pb-0.5 font-bold text-xs">Verticali</b>{data.words.filter(w=>w.direction===Direction.DOWN).map(w=><div key={w.id} className="mb-0.5"><b className="mr-1">{w.number}.</b>{w.clue}</div>)}</div>
                                </div>
                            </div>
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
                 {/* WATERMARK - OPTIONAL */}
                 {data.hasWatermark && (
                     <div style={{ position: 'absolute', top: '50%', left: '50%', transform: `translate(-50%, -50%) translate(${wmSheet1.x}px, ${wmSheet1.y}px) scale(${wmSheet1.scale}) rotate(12deg)`, fontSize: '130px', opacity: 0.20, zIndex: 0, whiteSpace: 'nowrap' }}>{themeAssets.watermark}</div>
                 )}
                 <div className={themeAssets.printBorder} style={{ width: '50%', height: '100%', padding: '30px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', borderRight: 'none', position: 'relative', zIndex: 10, boxSizing: 'border-box' }}>
                    <div style={{ fontSize: '80px', opacity: 0.2, marginBottom: '20px' }}>{themeAssets.decoration}</div>
                    {data.images?.brandLogo && <div style={{ position: 'absolute', bottom: '40px', left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: 0.8 }}><p style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '2px', color: '#9ca3af', marginBottom: '5px' }}>Created by</p><img src={data.images.brandLogo} style={{ height: '40px', objectFit: 'contain' }} /></div>}
                 </div>
                 <div className={themeAssets.printBorder} style={{ width: '50%', height: '100%', padding: '0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', borderLeft: 'none', position: 'relative', zIndex: 10, boxSizing: 'border-box' }}>
                     {/* COVER FULL SIZE */}
                     {data.images?.extraImage ? <img src={data.images.extraImage} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ fontSize: '120px', opacity: 0.8 }}>{themeAssets.decoration}</div>}
                 </div>
            </div>
            {/* SHEET 2 */}
            <div id="pdf-sheet-2" style={{ width: '1123px', height: '794px', display: 'flex', position: 'relative', backgroundColor: 'white', overflow: 'hidden', boxSizing: 'border-box', padding: '30px' }}>
                 {/* WATERMARK - OPTIONAL */}
                 {data.hasWatermark && (
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: `translate(-50%, -50%) translate(${wmSheet2.x}px, ${wmSheet2.y}px) scale(${wmSheet2.scale}) rotate(12deg)`, fontSize: '130px', opacity: 0.20, zIndex: 0, whiteSpace: 'nowrap' }}>{themeAssets.watermark}</div>
                 )}
                 <div className={themeAssets.printBorder} style={{ flex: '1 0 0', width: '0', height: '100%', padding: '30px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', borderRight: 'none', position: 'relative', zIndex: 10, boxSizing: 'border-box' }}>
                     {/* TITLE & DATE HEADER INTERNAL PDF */}
                     <div style={{marginBottom: '20px', width: '100%'}}>
                          <h1 className={themeAssets.fontTitle} style={{ fontSize: '40px', marginBottom: '5px', lineHeight: 1.2 }}>{data.title}</h1>
                          <p style={{ fontSize: '14px', textTransform: 'uppercase', color: '#666', letterSpacing: '2px' }}>{data.eventDate || "Data Speciale"} • {currentYear}</p>
                     </div>
                     <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', position: 'relative' }}>
                        {photos.length > 0 ? (
                            <div style={{ width: '80%', aspectRatio: '1/1', border: '5px solid white', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', overflow: 'hidden', backgroundColor: '#f3f4f6', marginBottom: '20px', transform: `translate(${imgSheet2.x}px, ${imgSheet2.y}px) scale(${imgSheet2.scale})` }}>
                                <PhotoCollage photos={photos} />
                            </div>
                        ) : data.images?.extraImage ? <img src={data.images.extraImage} style={{ maxHeight: '150px', marginBottom: '20px', transform: `translate(${imgSheet2.x}px, ${imgSheet2.y}px) scale(${imgSheet2.scale})` }} /> : null}
                        <div style={{ transform: `translate(${txtSheet2.x}px, ${txtSheet2.y}px) scale(${txtSheet2.scale})` }}><p className={themeAssets.fontTitle} style={{ fontSize: '24px', lineHeight: 1.5, marginBottom: '20px' }}>"{editableMessage}"</p></div>
                        {/* STICKER GROUP PDF */}
                        <div style={{ position: 'absolute', left: '50%', top: '50%', transform: `translate(-50%, -50%) translate(${stickerGroup.x * 2}px, ${stickerGroup.y * 2}px) scale(${stickerGroup.scale})` }}>
                             <div style={{display:'flex', gap:'10px', fontSize:'50px'}}>{data.stickers?.slice(0,5).map((s,i) => <span key={i}>{s}</span>)}</div>
                        </div>
                        {customTexts.map(t => (
                            <div key={t.id} style={{ position: 'absolute', left: '50%', top: '50%', transform: `translate(-50%, -50%) translate(${t.x * 2}px, ${t.y * 2}px)` }}>
                                <div style={{ width: `${(t.width || 250) * 2}px` }}>
                                    <p className="font-hand" style={{ fontSize: `${(t.scale * 20) * 2}px`, lineHeight: 1.2, color: '#581c87', textAlign: 'center', wordWrap: 'break-word' }}>{t.content}</p>
                                </div>
                            </div>
                        ))}
                     </div>
                 </div>
                 <div className={themeAssets.printBorder} style={{ flex: '1 0 0', width: '0', height: '100%', padding: '30px', display: 'flex', flexDirection: 'column', borderLeft: 'none', position: 'relative', zIndex: 10, boxSizing: 'border-box' }}>
                    {isCrossword ? (
                       <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                           <div style={{ flexShrink: 0 }}>
                                <h2 style={{ fontSize: '20px', fontWeight: 'bold', textTransform: 'uppercase', borderBottom: '2px solid black', marginBottom: '10px', paddingBottom: '5px', textAlign: 'center', letterSpacing: '2px' }}>Cruciverba</h2>
                                {renderSolution(true)}
                           </div>
                           <div style={{ flexShrink: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px 0', overflow: 'hidden' }}>
                               <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                   {renderGridCells(true)}
                               </div>
                           </div>
                           <div style={{ flexShrink: 0, fontSize: '9px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', lineHeight: 1.2, borderTop: '2px solid black', paddingTop: '15px' }}>
                                <div><b style={{ display: 'block', borderBottom: '1px solid #ccc', marginBottom: '5px', paddingBottom: '2px', textTransform: 'uppercase', fontWeight: 'bold' }}>Orizzontali</b>{data.words.filter(w=>w.direction===Direction.ACROSS).map(w=><div key={w.id} style={{ marginBottom: '4px', whiteSpace: 'normal' }}><b style={{ marginRight: '4px' }}>{w.number}.</b>{w.clue}</div>)}</div>
                                <div><b style={{ display: 'block', borderBottom: '1px solid #ccc', marginBottom: '5px', paddingBottom: '2px', textTransform: 'uppercase', fontWeight: 'bold' }}>Verticali</b>{data.words.filter(w=>w.direction===Direction.DOWN).map(w=><div key={w.id} style={{ marginBottom: '4px', whiteSpace: 'normal' }}><b style={{ marginRight: '4px' }}>{w.number}.</b>{w.clue}</div>)}</div>
                           </div>
                       </div>
                   ) : <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed #ccc', borderRadius: '10px', opacity: 0.3 }}></div>}
                 </div>
            </div>
       </div>
    </div>
  );
};

export default CrosswordGrid;
