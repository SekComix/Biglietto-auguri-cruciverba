import React, { useState, useEffect, useRef, useMemo } from 'react';
import { CrosswordData, CellData, Direction, ThemeType } from '../types';
import { regenerateGreeting } from '../services/geminiService';
import { Printer, Edit, Wand2, Eye, EyeOff } from 'lucide-react';

interface CrosswordGridProps {
  data: CrosswordData;
  onComplete: () => void;
  onEdit: () => void; 
}

// --- WOW EFFECT COMPONENT ---
const WowEffect: React.FC<{ theme: ThemeType }> = ({ theme }) => {
    const [particles, setParticles] = useState<{id: number, left: string, top: string, anim: string, char: string, size: string}[]>([]);

    useEffect(() => {
        const count = 30;
        const newParticles = [];
        let chars = ['✨', '⭐', '💫']; // Generic

        switch(theme) {
            case 'christmas': chars = ['❄️', '✨', '⚪']; break;
            case 'birthday': chars = ['🎊', '🎈', '✨']; break;
            case 'easter': chars = ['🌸', '🦋', '🍃']; break;
            case 'halloween': chars = ['🦇', '🎃', '👻']; break;
            case 'graduation': chars = ['🎓', '📜', '🌟']; break;
            case 'confirmation': chars = ['🕊️', '⚪', '✨']; break;
            case 'communion': chars = ['🌾', '🕊️', '✨']; break;
            case 'wedding': chars = ['❤️', '💍', '🕊️']; break;
        }

        for(let i=0; i<count; i++) {
            newParticles.push({
                id: i,
                left: Math.random() * 100 + '%',
                top: Math.random() * 100 + '%',
                anim: `float ${3 + Math.random() * 5}s linear infinite`,
                char: chars[Math.floor(Math.random() * chars.length)],
                size: (1 + Math.random() * 1.5) + 'rem'
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
                @keyframes snow {
                     0% { transform: translateY(-10px) rotate(0deg); opacity: 0; }
                     20% { opacity: 1; }
                     100% { transform: translateY(100vh) rotate(180deg); opacity: 0; }
                }
            `}</style>
            {particles.map(p => (
                <div key={p.id} style={{
                    position: 'absolute',
                    left: p.left,
                    top: theme === 'christmas' ? '-10%' : '110%', // Snow falls, others rise
                    fontSize: p.size,
                    animation: theme === 'christmas' ? `snow ${5+Math.random()*10}s linear infinite` : p.anim,
                    animationDelay: `-${Math.random()*5}s`,
                    opacity: 0.6
                }}>
                    {p.char}
                </div>
            ))}
        </div>
    );
};

// --- COLLAGE COMPONENT ---
const PhotoCollage: React.FC<{ photos: string[], className?: string, style?: React.CSSProperties }> = ({ photos, className, style }) => {
    if (!photos || photos.length === 0) return null;
    
    // Logic for grid: 1, 2, 4 (2x2), 9 (3x3) or mixed
    const count = photos.length;
    let gridClass = 'grid-cols-1';
    
    if (count === 2) gridClass = 'grid-cols-2';
    else if (count > 2 && count <= 4) gridClass = 'grid-cols-2';
    else if (count >= 5) gridClass = 'grid-cols-3';

    return (
        <div className={`grid gap-1 w-full h-full bg-white overflow-hidden ${gridClass} ${className}`} style={style}>
            {photos.map((p, i) => (
                <div key={i} className="relative w-full h-full overflow-hidden">
                    <img src={p} className="w-full h-full object-cover" alt={`memory-${i}`} />
                </div>
            ))}
        </div>
    );
};


const THEME_ASSETS: Record<ThemeType, any> = {
  christmas: {
    fontTitle: 'font-christmas',
    printBorder: 'border-double border-8 border-red-800',
    decoration: '🎄',
    watermark: '🎅',
    accentColor: '#165B33',
    bgClass: 'bg-red-50'
  },
  birthday: {
    fontTitle: 'font-fun',
    printBorder: 'border-[6px] border-dashed border-pink-500', 
    decoration: '🎂',
    watermark: '🎉',
    accentColor: '#DB2777', 
    bgClass: 'bg-pink-50'
  },
  easter: {
    fontTitle: 'font-hand',
    printBorder: 'border-[8px] border-dotted border-green-500', 
    decoration: '🐣',
    watermark: '🌸',
    accentColor: '#16A34A', 
    bgClass: 'bg-green-50'
  },
  halloween: {
    fontTitle: 'font-christmas', 
    printBorder: 'border-[6px] border-solid border-orange-500',
    decoration: '🎃',
    watermark: '🕸️',
    accentColor: '#C2410C', 
    bgClass: 'bg-orange-50'
  },
  graduation: {
    fontTitle: 'font-elegant',
    printBorder: 'border-4 border-double border-red-900',
    decoration: '🎓',
    watermark: '📜',
    accentColor: '#991B1B', 
    bgClass: 'bg-red-50'
  },
  confirmation: {
    fontTitle: 'font-script',
    printBorder: 'border-[3px] border-solid border-gray-400',
    decoration: '🕊️',
    watermark: '⛪',
    accentColor: '#4338CA', 
    bgClass: 'bg-indigo-50'
  },
  communion: {
    fontTitle: 'font-hand',
    printBorder: 'border-[5px] border-double border-yellow-500',
    decoration: '🥖',
    watermark: '🍇',
    accentColor: '#CA8A04', 
    bgClass: 'bg-yellow-50'
  },
  wedding: {
    fontTitle: 'font-script',
    printBorder: 'border-[1px] border-solid border-rose-300',
    decoration: '💍',
    watermark: '❤️',
    accentColor: '#BE123C', 
    bgClass: 'bg-rose-50'
  },
  elegant: {
    fontTitle: 'font-elegant',
    printBorder: 'border-4 border-double border-gray-900', 
    decoration: '⚜️',
    watermark: '⚜️',
    accentColor: '#111827', 
    bgClass: 'bg-gray-50'
  },
  generic: {
     fontTitle: 'font-body',
     printBorder: 'border-4 border-gray-300',
     decoration: '🎁',
     watermark: '🎁',
     accentColor: '#000000',
     bgClass: 'bg-white'
  }
};

const CrosswordGrid: React.FC<CrosswordGridProps> = ({ data, onComplete, onEdit }) => {
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
  const isCrossword = data.type === 'crossword';
  const photos = data.images?.photos || (data.images?.photo ? [data.images.photo] : []);

  useEffect(() => {
    if (!isCrossword) {
        setEditableMessage(data.message);
        return;
    }

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
      setCustomPromptMode(false); 
      
      try {
          const newMsg = await regenerateGreeting(
              editableMessage, 
              data.theme, 
              data.recipientName, 
              tone, 
              tone === 'custom' ? customPromptText : undefined
          );
          setEditableMessage(newMsg);
          setCustomPromptText(""); 
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
    if (!selectedCell || !isCrossword) return null;
    const cell = grid[selectedCell.y]?.[selectedCell.x];
    if (!cell || !cell.partOfWords.length) return null;
    return data.words.find(w => cell.partOfWords.includes(w.id) && w.direction === currentDirection) || 
           data.words.find(w => cell.partOfWords.includes(w.id));
  }, [selectedCell, currentDirection, data, isCrossword]);

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
                relative flex items-center justify-center 
                ${isPrint ? 'border-r border-b border-black text-black' : 
                  `w-full h-full text-xl md:text-2xl font-bold cursor-pointer transition-all select-none
                   ${isSelected ? 'bg-yellow-200 scale-105 z-10 shadow-lg ring-2 ring-yellow-400' : ''}
                   ${isInActiveWord ? 'bg-blue-50' : 'bg-white'}
                   ${!isSelected && !isInActiveWord ? 'hover:bg-gray-50' : ''}
                  `
                }
              `}
              style={isPrint ? { width: '100%', height: '100%' } : {}}
            >
              {/* Number */}
              {cell.number && (
                <span className={`absolute top-0 left-0 leading-none ${isPrint ? 'text-[8px] md:text-[10px] p-[1px]' : 'text-[10px] p-0.5 text-gray-500 font-bold'}`}>
                  {cell.number}
                </span>
              )}
              
              {/* Solution Cell Indicator */}
              {cell.isSolutionCell && isPrint && (
                   <div className="absolute inset-0 bg-yellow-200/50 print:bg-yellow-100/30 -z-10" />
              )}
              {cell.isSolutionCell && isPrint && cell.solutionIndex && (
                   <div className="absolute bottom-0 right-0 text-[8px] p-[1px] font-bold text-gray-500">{cell.solutionIndex}</div>
              )}

              {/* Input logic or display char */}
              {isPrint ? (
                  // Print mode: Empty or Solution if revealed (usually empty for crossword)
                  <span className="font-bold text-lg">{revealAnswers ? cell.char : ''}</span>
              ) : (
                  // Interactive mode
                  isSelected ? (
                    <input
                      ref={(el) => { inputRefs.current[y][x] = el; }}
                      type="text"
                      maxLength={1}
                      className="w-full h-full text-center bg-transparent outline-none uppercase font-bold text-inherit"
                      value={cell.userChar}
                      onChange={(e) => handleInput(x, y, e.target.value)}
                      onKeyDown={(e) => {
                          if (e.key === 'Backspace' && !cell.userChar) {
                              const prevX = currentDirection === Direction.ACROSS ? x - 1 : x;
                              const prevY = currentDirection === Direction.DOWN ? y - 1 : y;
                              if (prevX >= 0 && prevY >= 0 && grid[prevY][prevX].char) {
                                  setSelectedCell({ x: prevX, y: prevY });
                                  inputRefs.current[prevY][prevX]?.focus();
                              }
                          }
                      }}
                    />
                  ) : (
                     <span className={`${cell.userChar ? 'text-black' : 'text-transparent'}`}>
                        {displayChar}
                     </span>
                  )
              )}
            </div>
          );
        })
      )}
    </div>
  );

  const renderClues = () => {
     const across = data.words.filter(w => w.direction === Direction.ACROSS).sort((a,b) => a.number - b.number);
     const down = data.words.filter(w => w.direction === Direction.DOWN).sort((a,b) => a.number - b.number);
     
     return (
         <div className="grid grid-cols-2 gap-4 text-xs md:text-sm">
             <div>
                 <h4 className="font-bold border-b border-black mb-1">ORIZZONTALI</h4>
                 <ul className="space-y-1">
                     {across.map(w => (
                         <li key={w.id}><span className="font-bold mr-1">{w.number}.</span>{w.clue}</li>
                     ))}
                 </ul>
             </div>
             <div>
                 <h4 className="font-bold border-b border-black mb-1">VERTICALI</h4>
                 <ul className="space-y-1">
                     {down.map(w => (
                         <li key={w.id}><span className="font-bold mr-1">{w.number}.</span>{w.clue}</li>
                     ))}
                 </ul>
             </div>
         </div>
     );
  };

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-6xl mx-auto pb-10">
       <WowEffect theme={data.theme} />
       
       {/* Actions Bar */}
       <div className="flex flex-wrap gap-2 justify-center z-10 sticky top-4">
            <button onClick={onEdit} className="bg-white/90 backdrop-blur shadow-md px-4 py-2 rounded-full font-bold hover:scale-105 transition-transform flex items-center gap-2 text-gray-700">
                <Edit size={16} /> Modifica
            </button>
            <button onClick={() => setShowPrintGuide(true)} className="bg-blue-600 text-white px-6 py-2 rounded-full font-bold shadow-lg hover:bg-blue-700 hover:scale-105 transition-transform flex items-center gap-2">
                <Printer size={18} /> STAMPA BIGLIETTO
            </button>
            <button onClick={() => setRevealAnswers(!revealAnswers)} className="bg-white/90 backdrop-blur shadow-md px-4 py-2 rounded-full font-bold hover:scale-105 transition-transform flex items-center gap-2 text-gray-700">
                {revealAnswers ? <EyeOff size={16}/> : <Eye size={16}/>} {revealAnswers ? 'Nascondi' : 'Soluzione'}
            </button>
       </div>

       {showPrintGuide && (
           <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" onClick={() => setShowPrintGuide(false)}>
               <div className="bg-white rounded-3xl p-8 max-w-md text-center shadow-2xl relative" onClick={e => e.stopPropagation()}>
                    <Printer className="w-16 h-16 mx-auto mb-4 text-blue-500" />
                    <h3 className="text-2xl font-bold mb-2">Pronto per la Stampa!</h3>
                    <p className="text-gray-600 mb-6">
                        Il biglietto è ottimizzato per <b>fogli A4 orizzontali</b>.
                        <br/>Una volta stampato, piegalo a metà per creare un libretto.
                    </p>
                    <div className="flex flex-col gap-3">
                        <button onClick={triggerPrint} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 shadow-lg">
                            🖨️ Stampa Ora
                        </button>
                        <button onClick={() => setShowPrintGuide(false)} className="w-full bg-gray-100 text-gray-600 py-3 rounded-xl font-bold hover:bg-gray-200">
                            Chiudi
                        </button>
                    </div>
               </div>
           </div>
       )}

       {/* MAIN SCREEN LAYOUT */}
       <div className={`w-full grid grid-cols-1 lg:grid-cols-2 gap-8 items-start relative z-10 ${isCrossword ? '' : 'max-w-2xl'}`}>
           
           {/* Left/Top: Greeting Card Side */}
           <div className="bg-white p-6 md:p-8 rounded-3xl shadow-xl border-4 border-white transform rotate-[-1deg] hover:rotate-0 transition-transform duration-500">
                <div className={`border-2 ${data.theme === 'birthday' ? 'border-dashed border-pink-300' : 'border-double border-gray-200'} rounded-2xl p-6 h-full flex flex-col items-center text-center relative overflow-hidden`}>
                    
                    {/* Decorative Corner */}
                    <div className="absolute top-0 right-0 p-4 opacity-20 text-6xl select-none pointer-events-none">
                        {themeAssets.decoration}
                    </div>

                    {/* Image / Collage */}
                    {data.images?.extraImage && (
                        <img src={data.images.extraImage} className="max-h-32 mb-4 object-contain" />
                    )}
                    {photos.length > 0 && (
                        <div className="w-full aspect-[4/3] mb-6 rounded-xl overflow-hidden shadow-inner border border-gray-100">
                             <PhotoCollage photos={photos} />
                        </div>
                    )}

                    {/* Greeting Message */}
                    <div className="relative group w-full mb-auto">
                        {isEditingMsg ? (
                             <div className="animate-fade-in w-full">
                                <textarea 
                                    className="w-full p-3 bg-gray-50 border rounded-xl text-center font-hand text-xl focus:ring-2 ring-blue-300 outline-none resize-none"
                                    rows={4}
                                    value={editableMessage}
                                    onChange={(e) => setEditableMessage(e.target.value)}
                                />
                                <div className="flex gap-2 mt-2 justify-center">
                                    <button onClick={() => setIsEditingMsg(false)} className="bg-green-500 text-white px-3 py-1 rounded-lg text-sm font-bold shadow">Salva</button>
                                </div>
                             </div>
                        ) : (
                            <div className="relative">
                                <p className={`text-xl md:text-2xl mb-4 leading-relaxed ${themeAssets.fontTitle} cursor-pointer hover:bg-yellow-50 rounded-lg p-2 transition-colors`} onClick={() => setIsEditingMsg(true)}>
                                    "{editableMessage}"
                                </p>
                                <button 
                                    onClick={() => setIsEditingMsg(true)}
                                    className="absolute -top-2 -right-2 bg-gray-100 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-blue-100 text-blue-600"
                                    title="Modifica testo manualmente"
                                >
                                    <Edit size={12} />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* AI Rewrite Tools (Always visible when editing message, or if message is empty) */}
                    {isEditingMsg && (
                        <div className="mt-4 p-3 bg-blue-50 rounded-xl w-full border border-blue-100 mb-4">
                            <span className="text-xs font-bold text-blue-800 uppercase mb-2 block flex items-center gap-1 justify-center"><Wand2 size={12}/> Riscrivi con AI</span>
                            <div className="flex flex-wrap gap-2 justify-center mb-2">
                                <button disabled={isRegeneratingMsg} onClick={() => handleRegenerateMessage('funny')} className="text-xs bg-white px-2 py-1 rounded border hover:bg-blue-100">😂 Divertente</button>
                                <button disabled={isRegeneratingMsg} onClick={() => handleRegenerateMessage('heartfelt')} className="text-xs bg-white px-2 py-1 rounded border hover:bg-blue-100">❤️ Commovente</button>
                                <button disabled={isRegeneratingMsg} onClick={() => handleRegenerateMessage('rhyme')} className="text-xs bg-white px-2 py-1 rounded border hover:bg-blue-100">🎵 Rima</button>
                            </div>
                            {isRegeneratingMsg && <div className="text-xs text-center text-blue-500 mt-1 font-bold animate-pulse">Generazione in corso...</div>}
                        </div>
                    )}
                    
                    {/* Stickers */}
                    {data.stickers && data.stickers.length > 0 && (
                        <div className="flex flex-wrap justify-center gap-3 mt-4 pt-4 border-t border-gray-100 w-full">
                            {data.stickers.map((s, i) => (
                                <span key={i} className="text-4xl animate-[bounce_2s_infinite]" style={{ animationDelay: `${i * 0.2}s` }}>{s}</span>
                            ))}
                        </div>
                    )}

                </div>
           </div>

           {/* Right/Bottom: Crossword Grid */}
           {isCrossword && (
             <div className="bg-white/95 backdrop-blur p-6 md:p-8 rounded-3xl shadow-xl border-4 border-white/50 transform rotate-[1deg] hover:rotate-0 transition-transform duration-500">
                 
                 {/* Solution Hints */}
                 {data.solution && (
                     <div className="mb-4 bg-yellow-50 border border-yellow-200 p-3 rounded-xl text-center">
                         <span className="text-xs font-bold text-yellow-800 uppercase tracking-wider block mb-1">Obiettivo Segreto</span>
                         <div className="flex justify-center gap-1">
                             {data.solution.word.split('').map((char, i) => (
                                 <div key={i} className={`w-6 h-6 flex items-center justify-center border rounded ${revealAnswers ? 'bg-yellow-200 border-yellow-400' : 'bg-white border-gray-300 text-transparent'}`}>
                                     <span className="font-bold text-sm">{char}</span>
                                 </div>
                             ))}
                         </div>
                     </div>
                 )}

                 {renderGridCells()}

                 {/* Interactive Clue */}
                 <div className="mt-6 bg-gray-50 rounded-xl p-4 min-h-[80px] flex items-center justify-center text-center shadow-inner border border-gray-100">
                      {activeWord ? (
                          <div>
                              <span className="block text-xs font-bold text-gray-400 uppercase mb-1">{activeWord.number}. {activeWord.direction === Direction.ACROSS ? 'ORIZZONTALE' : 'VERTICALE'}</span>
                              <p className="font-medium text-lg text-gray-800">{activeWord.clue}</p>
                          </div>
                      ) : (
                          <p className="text-gray-400 italic text-sm">Seleziona una casella per vedere la definizione</p>
                      )}
                 </div>
             </div>
           )}
       </div>

       {/* --- PRINT LAYOUT (A4 Landscape) --- */}
       {/* This section is completely hidden on screen and only appears when printing */}
       <div className="hidden print:flex print-sheet">
           {/* Watermark Overlay for the whole sheet */}
           <div className="watermark">{themeAssets.watermark}</div>

           {/* LEFT HALF: COVER / GREETINGS */}
           <div className={`print-half ${themeAssets.printBorder} border-r-0 flex flex-col justify-between items-center text-center`}>
               {/* Header */}
               <div className="mt-4">
                   <h1 className={`text-4xl ${themeAssets.fontTitle} mb-2`}>{data.title}</h1>
                   <p className="text-sm text-gray-500 uppercase tracking-widest">{data.eventDate}</p>
               </div>

               {/* Central Visual */}
               <div className="flex-1 flex flex-col justify-center items-center w-full px-8 py-4">
                    {photos.length > 0 ? (
                        <div className="w-full aspect-[4/3] rounded-xl overflow-hidden shadow-sm border border-gray-200">
                            <PhotoCollage photos={photos} />
                        </div>
                    ) : data.images?.extraImage ? (
                        <img src={data.images.extraImage} className="max-h-64 object-contain" />
                    ) : (
                        <div className="text-9xl opacity-20 filter grayscale">{themeAssets.decoration}</div>
                    )}
               </div>

               {/* Message */}
               <div className="mb-8 w-3/4">
                   <p className={`text-xl leading-relaxed italic ${themeAssets.fontTitle}`}>
                       "{editableMessage}"
                   </p>
               </div>

               {/* Footer Stickers */}
               <div className="flex gap-4 mb-4 text-4xl justify-center">
                   {data.stickers?.slice(0,5).map((s,i) => <span key={i}>{s}</span>)}
               </div>
           </div>

           {/* RIGHT HALF: CROSSWORD */}
           {isCrossword ? (
               <div className={`print-half ${themeAssets.printBorder} flex flex-col`}>
                   <div className="flex justify-between items-end mb-4 border-b-2 border-black pb-2">
                       <h2 className="text-2xl font-bold uppercase tracking-tighter">Cruciverba</h2>
                       <span className="text-xs">Risolvi e scopri il messaggio segreto</span>
                   </div>

                   {/* Grid */}
                   <div className="flex-1 flex items-center justify-center mb-4">
                        <div style={{ width: '90%' }}>
                            {renderGridCells(true)}
                        </div>
                   </div>

                   {/* Clues */}
                   <div className="mt-auto bg-white/50 p-4 text-left">
                       {renderClues()}
                   </div>

                   {/* Solution Dashes */}
                   {data.solution && (
                       <div className="mt-4 p-2 border-t-2 border-dotted border-black text-center">
                           <span className="text-[10px] font-bold uppercase block mb-1">Soluzione Nascosta:</span>
                           <div className="flex justify-center gap-2">
                               {data.solution.word.split('').map((_, i) => (
                                   <div key={i} className="w-6 h-6 border-b-2 border-black"></div>
                               ))}
                           </div>
                       </div>
                   )}
               </div>
           ) : (
               // If simple card, right side can be a place for handwritten notes
               <div className={`print-half ${themeAssets.printBorder} flex flex-col items-center justify-center opacity-50`}>
                   <div className="border-4 border-dashed border-gray-300 w-full h-full rounded-xl flex items-center justify-center">
                       <p className="text-xl font-hand text-gray-400 rotate-[-5deg]">Spazio per dedica a mano...</p>
                   </div>
               </div>
           )}
       </div>
    </div>
  );
};

export default CrosswordGrid;
