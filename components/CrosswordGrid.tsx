import React, { useState, useEffect, useRef, useMemo } from 'react';
import { CrosswordData, CellData, Direction, ThemeType } from '../types';
import { regenerateGreetingOptions } from '../services/geminiService';
import { Printer, Edit, Wand2, Eye, EyeOff, Check, RefreshCw } from 'lucide-react';

interface CrosswordGridProps {
  data: CrosswordData;
  onComplete: () => void;
  onEdit: () => void; 
}

const WowEffect: React.FC<{ theme: ThemeType }> = ({ theme }) => {
    const [particles, setParticles] = useState<{id: number, left: string, top: string, anim: string, char: string, size: string}[]>([]);
    useEffect(() => {
        const count = 20;
        const newParticles = [];
        let chars = ['✨', '⭐', '💫']; 
        switch(theme) {
            case 'christmas': chars = ['❄️', '✨']; break;
            case 'birthday': chars = ['🎊', '🎈']; break;
            case 'easter': chars = ['🌸', '🦋']; break;
            case 'halloween': chars = ['🦇', '🎃']; break;
            case 'wedding': chars = ['❤️', '💍']; break;
        }
        for(let i=0; i<count; i++) {
            newParticles.push({
                id: i,
                left: Math.random() * 100 + '%',
                top: Math.random() * 100 + '%',
                anim: `float ${3 + Math.random() * 5}s linear infinite`,
                char: chars[Math.floor(Math.random() * chars.length)],
                size: (1 + Math.random() * 1) + 'rem'
            });
        }
        setParticles(newParticles);
    }, [theme]);

    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 print:hidden">
            <style>{`
                @keyframes float {
                    0% { transform: translateY(0) rotate(0deg); opacity: 0; }
                    20% { opacity: 0.8; }
                    100% { transform: translateY(-100vh) rotate(360deg); opacity: 0; }
                }
            `}</style>
            {particles.map(p => (
                <div key={p.id} style={{
                    position: 'absolute',
                    left: p.left,
                    top: '110%',
                    fontSize: p.size,
                    animation: p.anim,
                    animationDelay: `-${Math.random()*5}s`,
                    opacity: 0.6
                }}>{p.char}</div>
            ))}
        </div>
    );
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

const CrosswordGrid: React.FC<CrosswordGridProps> = ({ data, onComplete, onEdit }) => {
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

  const themeAssets = THEME_ASSETS[data.theme] || THEME_ASSETS.generic;
  const isCrossword = data.type === 'crossword';
  const photos = data.images?.photos || (data.images?.photo ? [data.images.photo] : []);

  useEffect(() => {
    if (!isCrossword) {
        setEditableMessage(data.message);
        return;
    }
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
  }, [data]);

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
      setGeneratedOptions([]); // Clear previous
      try {
          const options = await regenerateGreetingOptions(editableMessage, data.theme, data.recipientName, tone, tone === 'custom' ? customPromptText : undefined);
          setGeneratedOptions(options);
          if (tone === 'custom') setCustomPromptMode(false);
          setCustomPromptText("");
      } catch (e) { console.error(e); } finally { setIsRegeneratingMsg(false); }
  };

  const activeWord = useMemo(() => {
    if (!selectedCell || !isCrossword) return null;
    const cell = grid[selectedCell.y]?.[selectedCell.x];
    if (!cell || !cell.partOfWords.length) return null;
    return data.words.find(w => cell.partOfWords.includes(w.id) && w.direction === currentDirection) || 
           data.words.find(w => cell.partOfWords.includes(w.id));
  }, [selectedCell, currentDirection, data, isCrossword]);

  const renderGridCells = (isPrint = false) => (
    <div className={`grid gap-[1px] ${isPrint ? '' : 'bg-black/10 p-2 rounded-lg'}`} style={{ gridTemplateColumns: `repeat(${data.width}, minmax(0, 1fr))`, aspectRatio: `${data.width}/${data.height}` }}>
      {grid.map((row, y) => row.map((cell, x) => {
          const isSelected = !isPrint && selectedCell?.x === x && selectedCell?.y === y;
          const isInActiveWord = !isPrint && !isSelected && activeWord && ((activeWord.direction === Direction.ACROSS && y === activeWord.startY && x >= activeWord.startX && x < activeWord.startX + activeWord.word.length) || (activeWord.direction === Direction.DOWN && x === activeWord.startX && y >= activeWord.startY && y < activeWord.startY + activeWord.word.length));
          if (!cell.char) return <div key={`${x}-${y}`} className={`${isPrint ? 'bg-gray-100 border border-gray-300' : 'bg-black/5 rounded-sm'}`} />;
          return (
            <div key={`${x}-${y}`} onClick={() => !isPrint && handleCellClick(x, y)} className={`relative flex items-center justify-center ${isPrint ? 'border-r border-b border-black text-black' : `w-full h-full text-xl font-bold cursor-pointer ${isSelected ? 'bg-yellow-200' : isInActiveWord ? 'bg-blue-50' : 'bg-white'}`}`} style={isPrint ? { width: '100%', height: '100%' } : {}}>
              {cell.number && <span className={`absolute top-0 left-0 leading-none ${isPrint ? 'text-[8px] p-[1px]' : 'text-[9px] p-0.5 text-gray-500'}`}>{cell.number}</span>}
              {cell.isSolutionCell && isPrint && <div className="absolute inset-0 bg-yellow-100/30 -z-10" />}
              {cell.isSolutionCell && isPrint && cell.solutionIndex && <div className="absolute bottom-0 right-0 text-[8px] p-[1px] font-bold text-gray-500">{cell.solutionIndex}</div>}
              {isPrint ? <span className="font-bold text-lg">{revealAnswers ? cell.char : ''}</span> : (
                  isSelected ? <input ref={(el) => { inputRefs.current[y][x] = el; }} maxLength={1} className="w-full h-full text-center bg-transparent outline-none uppercase" value={cell.userChar} onChange={(e) => handleInput(x, y, e.target.value)} /> : <span>{cell.userChar}</span>
              )}
            </div>
          );
      }))}
    </div>
  );

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-6xl mx-auto pb-10">
       <WowEffect theme={data.theme} />
       <div className="flex gap-2 justify-center z-10 sticky top-2">
            <button onClick={onEdit} className="bg-white px-3 py-1 rounded-full shadow border text-sm flex items-center gap-2"><Edit size={14} /> Modifica</button>
            <button onClick={() => setShowPrintGuide(true)} className="bg-blue-600 text-white px-4 py-1 rounded-full shadow border text-sm flex items-center gap-2 font-bold"><Printer size={14} /> STAMPA</button>
            <button onClick={() => setRevealAnswers(!revealAnswers)} className="bg-white px-3 py-1 rounded-full shadow border text-sm flex items-center gap-2">{revealAnswers ? <EyeOff size={14}/> : <Eye size={14}/>} {revealAnswers ? 'Nascondi' : 'Soluzione'}</button>
       </div>
       
       {showPrintGuide && <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setShowPrintGuide(false)}><div className="bg-white rounded-xl p-6 text-center shadow-2xl max-w-sm"><h3 className="text-xl font-bold mb-2">Stampa</h3><p className="text-sm mb-4">Usa foglio A4 Orizzontale.</p><button onClick={() => {window.print(); setShowPrintGuide(false);}} className="bg-blue-600 text-white w-full py-2 rounded-lg font-bold">Stampa Ora</button></div></div>}

       <div className={`w-full grid grid-cols-1 lg:grid-cols-2 gap-6 items-start relative z-10 ${isCrossword ? '' : 'max-w-xl'}`}>
           {/* LEFT SIDE: GREETING & PHOTO */}
           <div className="bg-white p-6 rounded-2xl shadow-xl border-4 border-white flex flex-col gap-4">
                <div className={`border-2 ${themeAssets.printBorder} rounded-xl p-4 flex flex-col items-center text-center relative`}>
                    <div className="absolute top-2 right-2 opacity-20 text-4xl">{themeAssets.decoration}</div>
                    {photos.length > 0 ? (
                        <div className="w-3/4 max-w-[250px] aspect-square rounded-lg overflow-hidden border shadow-sm mb-4">
                             <PhotoCollage photos={photos} />
                        </div>
                    ) : data.images?.extraImage ? (
                        <img src={data.images.extraImage} className="h-40 object-contain mb-4" />
                    ) : null}

                    {/* Editable Message Area */}
                    <div className="w-full relative group">
                        {isEditingMsg ? (
                            <div className="w-full">
                                <textarea className="w-full p-2 bg-gray-50 border rounded text-center text-lg focus:ring-2 focus:ring-blue-400" rows={3} value={editableMessage} onChange={(e) => setEditableMessage(e.target.value)}/>
                                <button onClick={() => setIsEditingMsg(false)} className="bg-green-500 text-white text-xs px-3 py-1 rounded mt-1 font-bold">Salva</button>
                            </div>
                        ) : (
                            <div className="relative">
                                <p className={`text-xl ${themeAssets.fontTitle} mb-2 p-2 rounded hover:bg-yellow-50 cursor-text transition-colors`} onClick={() => setIsEditingMsg(true)}>
                                    "{editableMessage}"
                                </p>
                                <span className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 text-gray-400 bg-white rounded-full p-1 shadow-sm pointer-events-none"><Edit size={12}/></span>
                            </div>
                        )}
                    </div>

                    {/* AI TOOLS */}
                    <div className="flex flex-wrap gap-2 justify-center mt-2 pt-2 border-t border-gray-100 w-full">
                        <span className="text-[10px] text-gray-400 w-full uppercase font-bold tracking-wider">Cambia Stile</span>
                        <button disabled={isRegeneratingMsg} onClick={() => handleRegenerateMessage('funny')} className="text-xs bg-gray-50 px-3 py-1.5 rounded-full hover:bg-blue-100 border transition-colors">😂 Simpatico</button>
                        <button disabled={isRegeneratingMsg} onClick={() => handleRegenerateMessage('heartfelt')} className="text-xs bg-gray-50 px-3 py-1.5 rounded-full hover:bg-blue-100 border transition-colors">❤️ Dolce</button>
                        <button disabled={isRegeneratingMsg} onClick={() => handleRegenerateMessage('rhyme')} className="text-xs bg-gray-50 px-3 py-1.5 rounded-full hover:bg-blue-100 border transition-colors">🎵 Rima</button>
                        <button disabled={isRegeneratingMsg} onClick={() => setCustomPromptMode(!customPromptMode)} className="text-xs bg-gray-50 px-3 py-1.5 rounded-full hover:bg-blue-100 border transition-colors">✨ Su Misura</button>
                    </div>
                    
                    {customPromptMode && (
                        <div className="flex gap-1 mt-2 w-full animate-in slide-in-from-top-2 fade-in">
                            <input className="border text-xs flex-1 p-2 rounded-lg outline-none focus:ring-1 focus:ring-blue-400" placeholder="Es: come un pirata" value={customPromptText} onChange={e=>setCustomPromptText(e.target.value)}/>
                            <button onClick={()=>handleRegenerateMessage('custom')} className="bg-blue-500 text-white text-xs px-3 rounded-lg font-bold">Vai</button>
                        </div>
                    )}
                    
                    {isRegeneratingMsg && <div className="mt-2 text-blue-500 text-xs flex items-center gap-1"><RefreshCw size={12} className="animate-spin"/> Genero idee...</div>}

                    {/* Generated Options Popup */}
                    {generatedOptions.length > 0 && (
                        <div className="mt-3 w-full bg-blue-50 p-3 rounded-xl border border-blue-100 text-left animate-in zoom-in-95 duration-200">
                            <span className="text-[10px] font-bold text-blue-400 uppercase mb-2 block">Scegli un'opzione:</span>
                            <div className="space-y-2">
                                {generatedOptions.map((opt, idx) => (
                                    <button 
                                        key={idx}
                                        onClick={() => { setEditableMessage(opt); setGeneratedOptions([]); }}
                                        className="w-full text-left text-sm p-2 bg-white rounded border hover:border-blue-400 hover:shadow-sm transition-all flex items-start gap-2 group"
                                    >
                                        <div className="mt-0.5 w-4 h-4 rounded-full border border-gray-300 group-hover:border-blue-500 group-hover:bg-blue-500 flex items-center justify-center">
                                            <div className="w-1.5 h-1.5 bg-white rounded-full opacity-0 group-hover:opacity-100"/>
                                        </div>
                                        <span className="flex-1">{opt}</span>
                                    </button>
                                ))}
                            </div>
                            <button onClick={() => setGeneratedOptions([])} className="text-xs text-gray-400 underline mt-2 w-full text-center hover:text-gray-600">Annulla</button>
                        </div>
                    )}

                    {data.stickers && <div className="flex flex-wrap justify-center gap-2 mt-4 text-3xl">{data.stickers.map((s,i) => <span key={i}>{s}</span>)}</div>}
                </div>
           </div>

           {/* RIGHT SIDE: GRID */}
           {isCrossword && (
             <div className="bg-white p-6 rounded-2xl shadow-xl border-4 border-white">
                 {data.solution && <div className="mb-4 bg-yellow-50 border p-2 rounded text-center"><span className="text-[10px] font-bold uppercase">Soluzione</span><div className="flex justify-center gap-1">{data.solution.word.split('').map((c,i)=><div key={i} className="w-5 h-5 border bg-white text-xs flex items-center justify-center font-bold">{revealAnswers ? c : ''}</div>)}</div></div>}
                 {renderGridCells()}
                 {activeWord && <div className="mt-4 bg-gray-50 p-2 rounded text-center border"><span className="text-xs font-bold text-gray-400 block">{activeWord.number}. {activeWord.direction}</span><p className="font-bold">{activeWord.clue}</p></div>}
             </div>
           )}
       </div>

       {/* PRINT LAYOUT - FIXED A4 BOOKLET (Left: Back, Right: Front) */}
       <div className="hidden print:flex print-sheet" style={{ width: '297mm', height: '210mm', overflow: 'hidden', flexDirection: 'row' }}>
           <div className="watermark">{themeAssets.watermark}</div>
           
           {/* LEFT PAGE (Retro/Back Cover) - Contains Dedication, Photos, Stickers */}
           <div className={`print-half ${themeAssets.printBorder} border-r-0 flex flex-col items-center text-center justify-between`} style={{ width: '148.5mm', height: '210mm', padding: '15mm' }}>
               <div className="text-[8px] text-gray-400 uppercase tracking-widest mb-4">Retro del Biglietto</div>
               
               {/* Content centered vertically */}
               <div className="flex-1 flex flex-col items-center justify-center w-full gap-4">
                   <div className="w-full flex justify-center">
                       {photos.length > 0 ? (
                           <div className="w-[80%] aspect-square border-4 border-white shadow-sm overflow-hidden rounded-sm">
                               <PhotoCollage photos={photos} />
                           </div>
                       ) : data.images?.extraImage ? (
                           <img src={data.images.extraImage} className="max-h-[80mm] object-contain" />
                       ) : <div className="text-9xl opacity-10">{themeAssets.decoration}</div>}
                   </div>
                   
                   <div className="px-4">
                        <p className={`text-xl leading-relaxed ${themeAssets.fontTitle}`}>"{editableMessage}"</p>
                   </div>
                   
                   <div className="flex gap-3 text-3xl mt-2">
                        {data.stickers?.slice(0,5).map((s,i) => <span key={i}>{s}</span>)}
                   </div>
               </div>

               <div className="text-[10px] text-gray-400 mt-4">Creato con Enigmistica Auguri</div>
           </div>

           {/* RIGHT PAGE (Fronte/Front Cover) - Contains Title and Crossword (The "Gift") */}
           <div className={`print-half ${themeAssets.printBorder} flex flex-col items-center`} style={{ width: '148.5mm', height: '210mm', padding: '15mm' }}>
                <div className="text-[8px] text-gray-400 uppercase tracking-widest mb-4">Fronte del Biglietto</div>
               
               <h1 className={`text-3xl ${themeAssets.fontTitle} mb-1 text-center`}>{data.title}</h1>
               <p className="text-xs uppercase text-gray-500 mb-6">{data.eventDate}</p>

               {isCrossword ? (
                   <div className="flex-1 w-full flex flex-col">
                       <div className="flex-1 flex items-center justify-center mb-4">
                           <div style={{ width: '95%' }}>{renderGridCells(true)}</div>
                       </div>
                       
                       <div className="text-[9px] grid grid-cols-2 gap-4 leading-tight w-full border-t pt-2 border-black">
                            <div>
                                <b className="block border-b border-black mb-1 pb-0.5 uppercase">Orizzontali</b>
                                {data.words.filter(w=>w.direction===Direction.ACROSS).map(w=><div key={w.id}><b className="mr-1">{w.number}.</b>{w.clue}</div>)}
                            </div>
                            <div>
                                <b className="block border-b border-black mb-1 pb-0.5 uppercase">Verticali</b>
                                {data.words.filter(w=>w.direction===Direction.DOWN).map(w=><div key={w.id}><b className="mr-1">{w.number}.</b>{w.clue}</div>)}
                            </div>
                       </div>
                   </div>
               ) : (
                   <div className="flex-1 flex items-center justify-center opacity-20">
                       <p className="text-2xl font-hand rotate-[-5deg]">Spazio per dedica a mano...</p>
                   </div>
               )}
           </div>
       </div>
    </div>
  );
};

export default CrosswordGrid;
