
import React, { useState, useEffect, useRef } from 'react';
import { CrosswordData, CellData, Direction, ThemeType } from '../types';
import { Printer, Edit, Eye, EyeOff, BookOpen, FileText, CheckCircle2, Palette, Download, Loader2, XCircle, RotateCw, Maximize, Move, Info } from 'lucide-react';
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

const CrosswordGrid: React.FC<CrosswordGridProps> = ({ data, onComplete, onEdit, onUpdate }) => {
  const [grid, setGrid] = useState<CellData[][]>([]);
  const [selectedCell, setSelectedCell] = useState<{ x: number; y: number } | null>(null);
  const [currentDirection, setCurrentDirection] = useState<Direction>(Direction.ACROSS);
  const [editableMessage, setEditableMessage] = useState(data.message);
  
  const [isEditingMsg, setIsEditingMsg] = useState(false);
  const [revealAnswers, setRevealAnswers] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[][]>([]);

  // Watermark State
  const [isEditingWatermark, setIsEditingWatermark] = useState(false);
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
            const deltaY = e.movementY * 0.02; // Sensibilità resize
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

  const startResize = (e: React.MouseEvent, sheet: 1 | 2) => {
      if (!isEditingWatermark) return;
      e.stopPropagation();
      setActiveResize(sheet);
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

        // CREATE A NEW WINDOW FOR PREVIEW WITH EXPLICIT PRINT BUTTON
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
                            background-color: #374151; 
                            margin: 0; 
                            padding: 0; 
                            display: flex; 
                            flex-direction: column; 
                            align-items: center; 
                            min-height: 100vh;
                        }
                        .toolbar { 
                            position: fixed; top: 0; left: 0; right: 0; 
                            background: white; padding: 12px 20px; 
                            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); 
                            display: flex; justify-content: center; gap: 15px; flex-wrap: wrap;
                            z-index: 1000;
                        }
                        .btn { 
                            border: none; padding: 10px 20px; border-radius: 8px; 
                            font-size: 14px; font-weight: 600; cursor: pointer; 
                            display: flex; align-items: center; gap: 6px;
                            transition: transform 0.1s;
                        }
                        .btn:active { transform: scale(0.95); }
                        .btn-primary { background-color: #2563eb; color: white; box-shadow: 0 4px 6px rgba(37, 99, 235, 0.2); }
                        .btn-primary:hover { background-color: #1d4ed8; }
                        .btn-secondary { background-color: #f3f4f6; color: #374151; border: 1px solid #d1d5db; }
                        .btn-secondary:hover { background-color: #e5e7eb; }
                        
                        .content { 
                            margin-top: 80px; 
                            padding: 20px; 
                            padding-bottom: 60px;
                            display: flex; 
                            flex-direction: column; 
                            align-items: center; 
                            gap: 40px; 
                            width: 100%; 
                            max-width: 1200px;
                        }

                        /* ISTRUZIONI DI STAMPA STILE ALERT */
                        .print-instructions {
                            background-color: #eff6ff;
                            border: 2px solid #bfdbfe;
                            color: #1e40af;
                            padding: 16px;
                            border-radius: 12px;
                            max-width: 800px;
                            width: 90%;
                            text-align: center;
                            margin-bottom: 20px;
                            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
                        }
                        .print-instructions h2 {
                            margin: 0 0 8px 0;
                            font-size: 18px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            gap: 8px;
                        }
                        .print-instructions p {
                            margin: 4px 0;
                            font-size: 14px;
                            line-height: 1.5;
                        }
                        .badge {
                            background: #2563eb;
                            color: white;
                            padding: 2px 8px;
                            border-radius: 4px;
                            font-weight: bold;
                            font-size: 12px;
                            text-transform: uppercase;
                        }
                        
                        .sheet-container {
                            background: white;
                            padding: 0;
                            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
                            position: relative;
                            width: fit-content;
                        }

                        .preview-img { 
                            display: block;
                            max-width: 95vw; 
                            max-height: 85vh; /* Fits on screen */
                            object-fit: contain;
                            border: 1px solid #eee; 
                        }

                        .instruction { 
                            color: #e5e7eb; 
                            margin-bottom: 5px; 
                            font-size: 16px; 
                            font-weight: bold; 
                            text-align: center;
                            text-shadow: 0 2px 4px rgba(0,0,0,0.5);
                        }

                        /* ROTATION CLASS */
                        .rotate-180 { transform: rotate(180deg); }

                        @media print {
                            @page { 
                                size: A4 landscape; 
                                margin: 0; 
                            }
                            body { background: white; margin: 0; padding: 0; display: block; }
                            .toolbar, .instruction, .print-instructions { display: none !important; }
                            .content { margin: 0; padding: 0; gap: 0; display: block; width: 100%; max-width: none; }
                            .sheet-container { box-shadow: none; margin: 0; padding: 0; page-break-after: always; break-after: page; width: 297mm; height: 210mm; overflow: hidden; }
                            .preview-img { 
                                width: 297mm; 
                                height: 210mm; 
                                max-width: none; 
                                max-height: none; 
                                border: none; 
                            }
                        }
                    </style>
                    <script>
                        function toggleRotation() {
                            const sheet2 = document.getElementById('sheet2-img');
                            sheet2.classList.toggle('rotate-180');
                        }
                    </script>
                </head>
                <body>
                    <div class="toolbar">
                        <button class="btn btn-secondary" onclick="window.close()">❌ Chiudi Anteprima</button>
                        <button class="btn btn-secondary" onclick="toggleRotation()">🔄 Ruota Retro 180° (Fix Stampante)</button>
                        <button class="btn btn-primary" onclick="window.print()">🖨️ STAMPA / SALVA PDF</button>
                    </div>
                    <div class="content">
                        
                        <div class="print-instructions">
                            <h2>🖨️ Istruzioni per la Stampa (o per la Copisteria)</h2>
                            <p>
                                <strong>FORMATO:</strong> Carta <span class="badge">A4</span> Orizzontale (Landscape).
                            </p>
                            <p>
                                <strong>FRONTE/RETRO:</strong> Seleziona <span class="badge">LATO CORTO</span> (Short Edge / Flip on Short Edge).<br/>
                                <em>Se la stampante non lo supporta, stampa i due fogli separati e incollali schiena contro schiena.</em>
                            </p>
                            <p>
                                <strong>SFONDO:</strong> Attiva l'opzione <span class="badge">GRAFICA DI SFONDO</span> (Background Graphics) nelle impostazioni di stampa per vedere colori e texture.
                            </p>
                            <p style="margin-top:8px; font-size:12px; color:#64748b;">
                                ℹ️ Usa il tasto <strong>"STAMPA / SALVA PDF"</strong> qui sopra. Queste istruzioni non verranno stampate sul biglietto.
                            </p>
                        </div>

                        <div>
                            <p class="instruction">FOGLIO 1: Fronte e Retro (Esterno)</p>
                            <div class="sheet-container">
                                <img src="${imgData1}" class="preview-img" />
                            </div>
                        </div>
                        <div>
                            <p class="instruction">FOGLIO 2: Interno (Dedica e Cruciverba)</p>
                            <div class="sheet-container">
                                <img id="sheet2-img" src="${imgData2}" class="preview-img" />
                            </div>
                        </div>
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

  // --- RENDER HELPERS ---
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
          // IN STAMPA: Mai mostrare la lettera, a meno che non sia specificamente richiesto (qui no).
          // La cella è vuota in stampa per essere compilata a mano.
          const displayChar = isPrint ? '' : (revealAnswers ? cell.char : cell.userChar); 
          
          // CASELLA VUOTA (NESSUNA LETTERA)
          if (!cell.char) {
              // IN STAMPA: Trasparente (o bianca), niente blocchi neri, proprio come a schermo
              return <div key={`${x}-${y}`} className={`bg-black/5 rounded-sm`} />;
          }
          
          const isSolution = cell.isSolutionCell;
          
          // CASELLA ATTIVA (PAROLA)
          return (
            <div 
                key={`${x}-${y}-${revealAnswers}`} 
                onClick={() => !isPrint && handleCellClick(x, y)} 
                className={`relative flex items-center justify-center w-full h-full text-xl font-bold cursor-pointer rounded-sm`} 
                style={{
                    backgroundColor: isSolution ? '#FEF08A' : (isSelected && !isPrint ? '#DBEAFE' : '#FFFFFF'), 
                    width: isPrint ? '100%' : undefined,
                    height: isPrint ? '100%' : undefined,
                    boxSizing: 'border-box' // Fix bordi doppi
                }}
            >
              {cell.number && <span className={`absolute top-0 left-0 leading-none ${isPrint ? 'text-[8px] p-[1px] font-bold text-gray-500' : 'text-[9px] p-0.5 text-gray-500'}`}>{cell.number}</span>}
              
              {cell.isSolutionCell && cell.solutionIndex !== undefined && (
                  <div className={`absolute bottom-0 right-0 leading-none font-bold text-gray-600 bg-white/60 rounded-tl-sm z-10 ${isPrint ? 'text-[8px] p-[1px]' : 'text-[9px] p-0.5'}`}>
                      {/* USE LETTER A, B, C instead of Number for Solution Index */}
                      {getSolutionLabel(cell.solutionIndex)}
                  </div>
              )}
              
              {isPrint ? (
                  // IN STAMPA: Niente lettera (vuota)
                  <span className="font-bold text-lg"></span>
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
       
       {/* --- ON-SCREEN PRINT INSTRUCTIONS PANEL --- */}
       <div className="w-full max-w-4xl bg-blue-50 border border-blue-200 rounded-xl p-4 flex flex-col md:flex-row gap-4 items-start shadow-sm mb-4">
           <div className="bg-blue-100 p-2 rounded-full text-blue-600 shrink-0"><Printer size={24}/></div>
           <div className="flex-1">
               <h3 className="font-bold text-blue-900 text-lg mb-2">Come stampare correttamente:</h3>
               <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                   <li>Clicca su <b>"ANTEPRIMA STAMPA"</b> qui sopra.</li>
                   <li>Scegli formato carta <b>A4 Orizzontale</b> (Landscape).</li>
                   <li>Seleziona <b>Fronte/Retro sul Lato Corto</b> (Short Edge).</li>
                   <li><b>IMPORTANTE:</b> Abilita l'opzione <b>"Grafica di Sfondo"</b> nelle impostazioni di stampa del browser per vedere colori e texture.</li>
               </ul>
           </div>
       </div>
       
       {/* TOOLBAR */}
       <div className="flex flex-wrap gap-2 justify-center z-20 sticky top-2 p-2 bg-black/5 rounded-full backdrop-blur-sm shadow-xl border border-white/10">
            <button onClick={onEdit} className="bg-white px-4 py-2 rounded-full shadow border text-sm flex items-center gap-2 font-bold hover:bg-gray-50 text-gray-700 transition-transform active:scale-95"><Edit size={16} /> Modifica</button>
            <button onClick={() => setIsEditingWatermark(!isEditingWatermark)} className={`px-4 py-2 rounded-full shadow border text-sm flex items-center gap-2 font-bold transition-all active:scale-95 ${isEditingWatermark ? 'bg-blue-600 text-white border-blue-600 shadow-blue-500/30' : 'bg-white text-gray-700'}`}>
                {isEditingWatermark ? <CheckCircle2 size={16}/> : <Palette size={16}/>} {isEditingWatermark ? 'Fatto' : 'Sfondo'}
            </button>
            <button onClick={() => setRevealAnswers(!revealAnswers)} className={`px-4 py-2 rounded-full shadow border text-sm flex items-center gap-2 font-bold transition-all active:scale-95 ${revealAnswers ? 'bg-yellow-100 text-yellow-800 border-yellow-300' : 'bg-white text-gray-700'}`}>{revealAnswers ? <EyeOff size={16}/> : <Eye size={16}/>} {revealAnswers ? 'Nascondi' : 'Soluzione'}</button>
            <button 
                onClick={handleDownloadPDF} 
                disabled={isGeneratingPDF}
                className={`text-white px-6 py-2 rounded-full shadow-lg text-sm flex items-center gap-2 font-bold transition-all active:scale-95 ${isGeneratingPDF ? 'bg-gray-400 cursor-wait' : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 ring-2 ring-white/20'}`}
            >
                {isGeneratingPDF ? <Loader2 size={16} className="animate-spin"/> : <Printer size={16} />} 
                {isGeneratingPDF ? 'Elaboro...' : 'ANTEPRIMA STAMPA'}
            </button>
       </div>
       
       {/* --- ON SCREEN PREVIEW (INTERACTIVE) --- */}

       {/* FOGLIO 1: ESTERNO */}
       <div className="w-full max-w-5xl px-4 md:px-0">
            <h3 className="text-center text-white font-bold uppercase tracking-widest mb-4 flex items-center justify-center gap-2 drop-shadow-md">
                <FileText size={20}/> FOGLIO 1 (Esterno)
            </h3>
            
            <div className="bg-white w-full aspect-[297/210] shadow-2xl flex relative overflow-hidden rounded-sm select-none">
                 {/* 1. Watermark Layer */}
                 <div className={`absolute inset-0 flex items-center justify-center overflow-hidden z-0`}>
                    <div 
                        className="relative group"
                        style={{ 
                            transform: `translate(${wmSheet1.x}px, ${wmSheet1.y}px) scale(${wmSheet1.scale}) rotate(12deg)`,
                            pointerEvents: isEditingWatermark ? 'auto' : 'none',
                            cursor: isEditingWatermark ? 'move' : 'default'
                        }}
                        onMouseDown={isEditingWatermark ? (e) => startDrag(e, 1) : undefined}
                    >
                        <span className={`text-[100px] text-black transition-opacity duration-300 ${isEditingWatermark ? 'opacity-30' : 'opacity-20'}`}>
                            {themeAssets.watermark}
                        </span>

                        {/* CONTROLS (RESIZE & BORDER) */}
                        {isEditingWatermark && (
                            <>
                                <div className="absolute inset-0 border-2 border-dashed border-blue-500/50 rounded-lg pointer-events-none"></div>
                                <div 
                                    onMouseDown={(e) => startResize(e, 1)}
                                    className="absolute -bottom-6 -right-6 w-10 h-10 bg-blue-600 text-white rounded-full shadow-xl flex items-center justify-center cursor-nwse-resize hover:bg-blue-700 z-50 hover:scale-110 transition-transform"
                                    title="Trascina per ridimensionare"
                                >
                                    <Maximize size={20} />
                                </div>
                            </>
                        )}
                    </div>
                 </div>

                 {/* 2. Fold Line */}
                 <div className="absolute inset-y-0 left-1/2 w-px bg-gray-300 border-l border-dashed border-gray-400 opacity-50 z-10 pointer-events-none"></div>

                 {/* 3. Content Layer (BACKGROUND TRANSPARENT TO SHOW WATERMARK) */}
                 <div className={`absolute inset-0 flex z-10 transition-opacity duration-300 ${isEditingWatermark ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                     {/* RETRO - ADDED BORDER CLASS HERE */}
                     <div className={`w-1/2 h-full p-8 flex flex-col items-center justify-center text-center ${themeAssets.printBorder} border-r-0 relative`}>
                         <span className="absolute top-2 left-2 text-[10px] uppercase text-gray-300 font-bold">Retro Biglietto</span>
                         <div className="text-6xl opacity-20 mb-4">{themeAssets.decoration}</div>
                         
                         {/* BRAND LOGO */}
                         {data.images?.brandLogo && (
                            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center opacity-80">
                                <p className="text-[8px] uppercase tracking-widest text-gray-400 mb-1">Created by</p>
                                <img src={data.images.brandLogo} className="h-8 object-contain" />
                            </div>
                         )}

                         {/* REMOVED 'Enigmistica Auguri' Text */}
                     </div>
                     {/* FRONTE */}
                     <div className={`w-1/2 h-full p-8 flex flex-col items-center justify-center text-center ${themeAssets.printBorder} border-l-0 relative`}>
                         <span className="absolute top-2 right-2 text-[10px] uppercase text-gray-300 font-bold">Copertina</span>
                         <h1 className={`text-4xl md:text-5xl ${themeAssets.fontTitle} mb-4 text-gray-900 leading-tight drop-shadow-sm`}>{data.title}</h1>
                         <div className="w-16 h-1 bg-gray-800 mb-4 opacity-50"></div>
                         <p className="text-sm md:text-base uppercase text-gray-500 mb-8 font-bold tracking-widest">
                             {data.eventDate || "Data Speciale"} <span className="text-black/30 mx-1">•</span> {currentYear}
                         </p>
                         {data.images?.extraImage ? (
                            <img src={data.images.extraImage} className="h-32 md:h-48 object-contain mb-4 drop-shadow-md" />
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
                            pointerEvents: isEditingWatermark ? 'auto' : 'none',
                            cursor: isEditingWatermark ? 'move' : 'default'
                        }}
                        onMouseDown={isEditingWatermark ? (e) => startDrag(e, 2) : undefined}
                    >
                        <span className={`text-[100px] text-black transition-opacity duration-300 ${isEditingWatermark ? 'opacity-30' : 'opacity-20'}`}>
                            {themeAssets.watermark}
                        </span>

                         {/* CONTROLS (RESIZE & BORDER) */}
                         {isEditingWatermark && (
                            <>
                                <div className="absolute inset-0 border-2 border-dashed border-blue-500/50 rounded-lg pointer-events-none"></div>
                                <div 
                                    onMouseDown={(e) => startResize(e, 2)}
                                    className="absolute -bottom-6 -right-6 w-10 h-10 bg-blue-600 text-white rounded-full shadow-xl flex items-center justify-center cursor-nwse-resize hover:bg-blue-700 z-50 hover:scale-110 transition-transform"
                                    title="Trascina per ridimensionare"
                                >
                                    <Maximize size={20} />
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* 2. Fold Line */}
                <div className="absolute inset-y-0 left-1/2 w-px bg-gray-300 border-l border-dashed border-gray-400 opacity-50 z-10 pointer-events-none"></div>

                {/* 3. Content Layer */}
                <div className={`absolute inset-0 flex z-10 transition-opacity duration-300 ${isEditingWatermark ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                    {/* DEDICA */}
                    <div className={`w-1/2 h-full p-6 flex flex-col items-center justify-between text-center ${themeAssets.printBorder} border-r-0 relative`}>
                        <span className="absolute top-2 left-2 text-[10px] uppercase text-gray-300 font-bold">Lato Sinistro</span>
                        <div className="flex-1 w-full flex flex-col items-center justify-center relative">
                            {photos.length > 0 ? (
                                <div className="w-[70%] aspect-square border-4 border-white shadow-lg overflow-hidden rounded-sm bg-gray-100 rotate-1 mb-4">
                                    <PhotoCollage photos={photos} />
                                </div>
                            ) : data.images?.extraImage ? (
                                <img src={data.images.extraImage} className="h-32 object-contain mb-4 drop-shadow-md" />
                            ) : null}
                            <div className="w-full relative group">
                                {isEditingMsg ? (
                                    <div className="w-full animate-in zoom-in-95 bg-white p-2 rounded-xl shadow-lg border border-blue-200 z-20 absolute top-[-50px] left-0">
                                        <textarea className="w-full p-2 bg-gray-50 border border-blue-200 rounded-lg text-center text-sm focus:outline-none focus:border-blue-400 font-hand" rows={4} value={editableMessage} onChange={(e) => setEditableMessage(e.target.value)}/>
                                        <div className="flex gap-2 mt-2 justify-center"><button onClick={() => setIsEditingMsg(false)} className="bg-green-500 text-white text-xs px-3 py-1 rounded-full font-bold">Fatto</button></div>
                                    </div>
                                ) : (
                                    <div className="relative cursor-pointer hover:bg-yellow-50/50 rounded-xl p-2 transition-colors border border-transparent hover:border-yellow-200" onClick={() => setIsEditingMsg(true)}>
                                        <p className={`text-xl md:text-2xl leading-relaxed ${themeAssets.fontTitle} text-gray-800 drop-shadow-sm`}>"{editableMessage}"</p>
                                        <span className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 text-gray-400 bg-white rounded-full p-1 shadow-md pointer-events-none"><Edit size={12}/></span>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex gap-2 text-2xl mt-2 justify-center drop-shadow-sm">{data.stickers?.slice(0,5).map((s,i) => <span key={i}>{s}</span>)}</div>
                    </div>
                    {/* GIOCO */}
                    <div className="w-1/2 h-full p-4 md:p-6 flex flex-col relative z-10">
                        <span className="absolute top-2 right-2 text-[10px] uppercase text-gray-300 font-bold">Lato Destro</span>
                        {isCrossword ? (
                            <>
                                <h2 className="text-lg font-bold uppercase border-b-2 border-black mb-2 pb-1 text-center tracking-widest">Cruciverba</h2>
                                {data.solution && (
                                    <div className="mb-2 bg-yellow-50 border border-yellow-200 p-1 rounded-lg text-center mx-auto inline-block shadow-sm">
                                        <div className="flex justify-center gap-0.5">{data.solution.word.split('').map((c,i) => <div key={i} className={`w-4 h-4 border rounded text-[10px] flex items-center justify-center font-bold ${revealAnswers ? 'bg-yellow-400 text-white border-yellow-500' : 'bg-white border-yellow-200 text-gray-400'}`}>{revealAnswers ? c : getSolutionLabel(i+1)}</div>)}</div>
                                    </div>
                                )}
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

       {/* --- HIDDEN PDF EXPORT STAGE (FIXED PIXEL LAYOUT for 96 DPI A4) --- */}
       {/* Width: 1123px (A4 landscape 96dpi), Height: 794px */}
       <div ref={exportRef} style={{ position: 'fixed', top: 0, left: '-9999px', width: '1123px', zIndex: -100 }}>
            {/* SHEET 1 */}
            <div id="pdf-sheet-1" style={{ width: '1123px', height: '794px', display: 'flex', position: 'relative', backgroundColor: 'white', overflow: 'hidden' }}>
                 <div style={{ position: 'absolute', top: '50%', left: '50%', transform: `translate(-50%, -50%) translate(${wmSheet1.x}px, ${wmSheet1.y}px) scale(${wmSheet1.scale}) rotate(12deg)`, fontSize: '130px', opacity: 0.20, zIndex: 0, whiteSpace: 'nowrap' }}>{themeAssets.watermark}</div>
                 {/* Retro */}
                 <div className={themeAssets.printBorder} style={{ width: '50%', height: '100%', padding: '60px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', borderRight: 'none', position: 'relative', zIndex: 10, boxSizing: 'border-box' }}>
                    <div style={{ fontSize: '80px', opacity: 0.2, marginBottom: '20px' }}>{themeAssets.decoration}</div>
                    
                    {/* BRAND LOGO PDF */}
                    {data.images?.brandLogo && (
                        <div style={{ position: 'absolute', bottom: '40px', left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: 0.8 }}>
                            <p style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '2px', color: '#9ca3af', marginBottom: '5px' }}>Created by</p>
                            <img src={data.images.brandLogo} style={{ height: '40px', objectFit: 'contain' }} />
                        </div>
                    )}

                    {/* REMOVED 'Enigmistica Auguri' Text */}
                 </div>
                 {/* Fronte */}
                 <div className={themeAssets.printBorder} style={{ width: '50%', height: '100%', padding: '60px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', borderLeft: 'none', position: 'relative', zIndex: 10, boxSizing: 'border-box' }}>
                     <h1 className={themeAssets.fontTitle} style={{ fontSize: '50px', marginBottom: '10px', lineHeight: 1.2 }}>{data.title}</h1>
                     <div style={{ width: '80px', height: '3px', background: '#333', marginBottom: '20px' }}></div>
                     <p style={{ fontSize: '18px', textTransform: 'uppercase', color: '#666', letterSpacing: '2px', marginBottom: '40px' }}>
                        {data.eventDate || "Data Speciale"} • {currentYear}
                     </p>
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
                 <div style={{ position: 'absolute', top: '50%', left: '50%', transform: `translate(-50%, -50%) translate(${wmSheet2.x}px, ${wmSheet2.y}px) scale(${wmSheet2.scale}) rotate(12deg)`, fontSize: '130px', opacity: 0.20, zIndex: 0, whiteSpace: 'nowrap' }}>{themeAssets.watermark}</div>
                 {/* Dedica */}
                 <div className={themeAssets.printBorder} style={{ width: '50%', height: '100%', padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', borderRight: 'none', position: 'relative', zIndex: 10, boxSizing: 'border-box' }}>
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
                 <div className={themeAssets.printBorder} style={{ width: '50%', height: '100%', padding: '40px', display: 'flex', flexDirection: 'column', borderLeft: 'none', position: 'relative', zIndex: 10, justifyContent: 'space-between', boxSizing: 'border-box' }}>
                    {isCrossword ? (
                       <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
                           
                           {/* HEADER: Title & Solution */}
                           <div>
                                <h2 style={{ fontSize: '20px', fontWeight: 'bold', textTransform: 'uppercase', borderBottom: '2px solid black', marginBottom: '10px', paddingBottom: '5px', textAlign: 'center', letterSpacing: '2px' }}>Cruciverba</h2>
                                {data.solution && (
                                        <div style={{ marginBottom: '10px', textAlign: 'center' }}>
                                            <div style={{ display: 'inline-flex', gap: '2px', border: '1px solid black', padding: '4px', borderRadius: '4px', backgroundColor: '#f9fafb' }}>
                                                {data.solution.word.split('').map((c,i) => (
                                                    <div key={i} style={{ width: '20px', height: '20px', border: '1px solid black', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                                                        {revealAnswers ? c : getSolutionLabel(i+1)}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                )}
                           </div>

                           {/* FIXED GRID CONTAINER - INCREASED TO 500px to fill white space */}
                           <div style={{ width: '100%', height: '500px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', flexShrink: 0 }}>
                               <div style={{ aspectRatio: `${data.width}/${data.height}`, height: '100%', maxHeight: '100%', maxWidth: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                   {renderGridCells(true)}
                               </div>
                           </div>
                           
                           {/* CLUES FOOTER - FLEX GROW (No fixed height) - REDUCED FONT SIZE */}
                           <div style={{ flex: 1, overflow: 'hidden', fontSize: '9px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', lineHeight: 1.2, borderTop: '2px solid black', paddingTop: '15px', alignContent: 'start' }}>
                                <div>
                                    <b style={{ display: 'block', borderBottom: '1px solid #ccc', marginBottom: '5px', paddingBottom: '2px', textTransform: 'uppercase', fontWeight: 'bold' }}>Orizzontali</b>
                                    {data.words.filter(w=>w.direction===Direction.ACROSS).map(w=><div key={w.id} style={{ marginBottom: '4px', whiteSpace: 'normal' }}><b style={{ marginRight: '4px' }}>{w.number}.</b>{w.clue} ({w.word.length})</div>)}
                                </div>
                                <div>
                                    <b style={{ display: 'block', borderBottom: '1px solid #ccc', marginBottom: '5px', paddingBottom: '2px', textTransform: 'uppercase', fontWeight: 'bold' }}>Verticali</b>
                                    {data.words.filter(w=>w.direction===Direction.DOWN).map(w=><div key={w.id} style={{ marginBottom: '4px', whiteSpace: 'normal' }}><b style={{ marginRight: '4px' }}>{w.number}.</b>{w.clue} ({w.word.length})</div>)}
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
