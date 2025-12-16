
import React, { useState, useEffect, useRef } from 'react';
import { CrosswordData, CellData, Direction, ThemeType, CardFormat } from '../types';
import { Printer, Edit, Eye, EyeOff, BookOpen, FileText, CheckCircle2, Palette, Download, Loader2, XCircle, RotateCw, Maximize, Move, Info, Type, Trash2, Grip, ArrowRightLeft, Pencil, Frame, RefreshCcw, BoxSelect, ImagePlus, SmilePlus, ChevronLeft, ChevronRight, LayoutTemplate, Camera, Shuffle } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface CrosswordGridProps {
  data: CrosswordData;
  onComplete: () => void;
  onEdit: () => void; 
  onUpdate: (data: Partial<CrosswordData>) => void;
}

const THEME_ASSETS: Record<ThemeType, any> = {
  christmas: { fontTitle: 'font-christmas', printBorder: 'border-double border-4 border-red-800', pdfBorder: '4px double #991b1b', decoration: '🎄', watermark: '🎅' },
  birthday: { fontTitle: 'font-fun', printBorder: 'border-dashed border-4 border-pink-500', pdfBorder: '4px dashed #ec4899', decoration: '🎂', watermark: '🎉' },
  easter: { fontTitle: 'font-hand', printBorder: 'border-dotted border-4 border-green-500', pdfBorder: '4px dotted #22c55e', decoration: '🐣', watermark: '🌸' },
  halloween: { fontTitle: 'font-christmas', printBorder: 'border-solid border-4 border-orange-500', pdfBorder: '4px solid #f97316', decoration: '🎃', watermark: '🕸️' },
  graduation: { fontTitle: 'font-elegant', printBorder: 'border-double border-4 border-red-900', pdfBorder: '4px double #7f1d1d', decoration: '🎓', watermark: '📜' },
  confirmation: { fontTitle: 'font-script', printBorder: 'border-solid border-2 border-gray-400', pdfBorder: '2px solid #9ca3af', decoration: '🕊️', watermark: '⛪' },
  communion: { fontTitle: 'font-hand', printBorder: 'border-double border-4 border-yellow-500', pdfBorder: '4px double #eab308', decoration: '🥖', watermark: '🍇' },
  wedding: { fontTitle: 'font-script', printBorder: 'border-solid border-1 border-rose-300', pdfBorder: '1px solid #fda4af', decoration: '💍', watermark: '❤️' },
  elegant: { fontTitle: 'font-elegant', printBorder: 'border-double border-4 border-gray-900', pdfBorder: '4px double #111827', decoration: '⚜️', watermark: '⚜️' },
  generic: { fontTitle: 'font-body', printBorder: 'border-solid border-2 border-gray-300', pdfBorder: '2px solid #d1d5db', decoration: '🎁', watermark: '🎁' }
};

// Immagini di default
const THEME_TAG_IMAGES: Record<ThemeType, string[]> = {
    christmas: [
        "https://images.unsplash.com/photo-1607344645830-6e84163475ad?auto=format&fit=crop&w=400&q=80", 
        "https://images.unsplash.com/photo-1543589077-47d81606c1bf?auto=format&fit=crop&w=400&q=80", 
        "https://images.unsplash.com/photo-1512909006721-3d6018887383?auto=format&fit=crop&w=400&q=80", 
        "https://images.unsplash.com/photo-1605007662972-e56593dc3ac1?auto=format&fit=crop&w=400&q=80", 
        "https://images.unsplash.com/photo-1576692131265-4395025b6d33?auto=format&fit=crop&w=400&q=80", 
        "https://images.unsplash.com/photo-1512389142860-9c449e58a543?auto=format&fit=crop&w=400&q=80", 
        "https://images.unsplash.com/photo-1482517967863-00e15c9b4499?auto=format&fit=crop&w=400&q=80",
        "https://images.unsplash.com/photo-1575549591388-f640483c6dfa?auto=format&fit=crop&w=400&q=80",
        "https://images.unsplash.com/photo-1543258103-a62bdc069871?auto=format&fit=crop&w=400&q=80",
        "https://images.unsplash.com/photo-1511516412963-801b050c92aa?auto=format&fit=crop&w=400&q=80",
        "https://images.unsplash.com/photo-1602936357413-5a7a72384775?auto=format&fit=crop&w=400&q=80",
        "https://images.unsplash.com/photo-1512474932049-78ea69616019?auto=format&fit=crop&w=400&q=80",
        "https://images.unsplash.com/photo-1576088279457-3c3b0185e33d?auto=format&fit=crop&w=400&q=80",
        "https://images.unsplash.com/photo-1545622783-b3e021430fee?auto=format&fit=crop&w=400&q=80"
    ],
    birthday: [
        "https://images.unsplash.com/photo-1530103862676-de3c9a59af38?auto=format&fit=crop&w=400&q=80", 
        "https://images.unsplash.com/photo-1558636508-e0db3814bd1d?auto=format&fit=crop&w=400&q=80",
        "https://images.unsplash.com/photo-1464349153735-7db50ed83c84?auto=format&fit=crop&w=400&q=80",
        "https://images.unsplash.com/photo-1527481138388-31827a7c94d5?auto=format&fit=crop&w=400&q=80",
        "https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=400&q=80",
        "https://images.unsplash.com/photo-1563725581894-3cb182885935?auto=format&fit=crop&w=400&q=80",
        "https://images.unsplash.com/photo-1608681288289-53e77f09312c?auto=format&fit=crop&w=400&q=80",
        "https://images.unsplash.com/photo-1588107931388-e21626c927c8?auto=format&fit=crop&w=400&q=80"
    ],
    easter: [
        "https://images.unsplash.com/photo-1521911527092-23c26780c942?auto=format&fit=crop&w=400&q=80",
        "https://images.unsplash.com/photo-1616496350917-0c75c87a2a07?auto=format&fit=crop&w=400&q=80",
        "https://images.unsplash.com/photo-1584307374776-9c426336338e?auto=format&fit=crop&w=400&q=80",
        "https://images.unsplash.com/photo-1520111166311-53644f123f8b?auto=format&fit=crop&w=400&q=80"
    ],
    halloween: ["https://images.unsplash.com/photo-1508361001413-7a9dca21d08a?auto=format&fit=crop&w=400&q=80"],
    graduation: ["https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=400&q=80"],
    confirmation: ["https://images.unsplash.com/photo-1519817914152-22d216bb9170?auto=format&fit=crop&w=400&q=80"],
    communion: ["https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?auto=format&fit=crop&w=400&q=80"],
    wedding: ["https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?auto=format&fit=crop&w=400&q=80"],
    elegant: ["https://images.unsplash.com/photo-1496293455970-f8581aae0e3c?auto=format&fit=crop&w=400&q=80"],
    generic: [
        "https://images.unsplash.com/photo-1513201099705-a9746e1e201f?auto=format&fit=crop&w=400&q=80",
        "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=400&q=80",
        "https://images.unsplash.com/photo-1507608616759-54f48f0af0ee?auto=format&fit=crop&w=400&q=80"
    ]
};

const TAG_MESSAGES_DB: Record<string, string[]> = {
    christmas: [
        "Ti auguro un Natale pieno di gioia.",
        "Che la magia delle feste illumini i tuoi giorni.",
        "Un piccolo dono per un grande sorriso.",
        "Pace, amore e felicità.",
        "Che il nuovo anno ti porti gioia.",
        "Brindiamo a nuovi inizi!",
        "Un pensiero speciale per te.",
        "Buone Feste!",
        "Auguri di cuore.",
        "Serenità e amore.",
        "Buon Natale!",
        "Felice Anno Nuovo"
    ],
    birthday: ["Buon Compleanno!", "Tanti auguri di felicità.", "Un anno in più, sempre fantastico!", "Festeggia alla grande.", "Sorprese bellissime in arrivo.", "Dolce come la torta.", "Cento di questi giorni.", "Un regalo speciale per te."],
    generic: ["Un pensiero per te.", "Con i migliori auguri.", "Spero ti piaccia!", "Tanta felicità.", "Auguri sinceri.", "Giorno indimenticabile.", "Con affetto.", "Auguri!"]
};

const STICKER_OPTIONS = ['🎅', '🎄', '🎁', '❄️', '⛄', '🎂', '🎈', '🎉', '🕯️', '🍰', '💍', '❤️', '💐', '🎃', '👻', '🎓', '🏆', '⚽', '🐶', '🐱', '⭐', '✨'];

const FORMAT_CONFIG: Record<CardFormat, { label: string, cssAspect: string, width: number, height: number, pdfFormat: any, pdfOrientation: 'p' | 'l', pdfWidth: number, pdfHeight: number }> = {
    'a4': { label: 'A4 Standard', cssAspect: 'aspect-[297/210]', width: 1123, height: 794, pdfFormat: 'a4', pdfOrientation: 'l', pdfWidth: 1123, pdfHeight: 794 },
    'a3': { label: 'A3 Maxi', cssAspect: 'aspect-[297/210]', width: 1587, height: 1123, pdfFormat: 'a3', pdfOrientation: 'l', pdfWidth: 1587, pdfHeight: 1123 },
    'square': { label: 'Quadrato', cssAspect: 'aspect-[2/1]', width: 1134, height: 567, pdfFormat: [300, 150], pdfOrientation: 'l', pdfWidth: 1134, pdfHeight: 567 },
    'tags': { label: 'Bigliettini', cssAspect: 'aspect-[10/7]', width: 500, height: 350, pdfFormat: 'a4', pdfOrientation: 'p', pdfWidth: 794, pdfHeight: 1123 } 
};

const getSolutionLabel = (index: number) => String.fromCharCode(64 + index);

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
                <div key={i} className="relative w-full h-full overflow-hidden">
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
  
  const [revealAnswers, setRevealAnswers] = useState(false);
  const [showBorders, setShowBorders] = useState(true);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showGraphicsModal, setShowGraphicsModal] = useState(false); 
  
  const [viewMode, setViewMode] = useState<'single' | 'sheets'>('single');

  const inputRefs = useRef<(HTMLInputElement | null)[][]>([]);
  const singleTagFileInputRef = useRef<HTMLInputElement>(null);

  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null); 
  
  const [wmSheet1, setWmSheet1] = useState({ scale: 1.5, x: 0, y: 0 });
  const [wmSheet2, setWmSheet2] = useState({ scale: 1.5, x: 0, y: 0 });
  
  const [imgSheet1, setImgSheet1] = useState({ scale: 1, x: 0, y: 0 });
  const [imgSheet2, setImgSheet2] = useState({ scale: 1, x: 0, y: 0 });
  
  const [txtSheet2, setTxtSheet2] = useState({ scale: 1, x: 0, y: 0 });
  
  const [stickerGroup, setStickerGroup] = useState({ scale: 0.8, x: -350, y: 200 }); 

  const [customTexts, setCustomTexts] = useState<PositionableItem[]>([]);

  // State for Tags
  const [tagVariations, setTagVariations] = useState<Array<{img: string, title: string}>>([]);
  const [tagMessages, setTagMessages] = useState<string[]>([]);
  const [currentTagIndex, setCurrentTagIndex] = useState(0);
  
  // Track previous data to force resets
  const prevDataRef = useRef(data);
  // KEY FOR PRINT REFRESH
  const [printRenderKey, setPrintRenderKey] = useState(0);

  const [activeDrag, setActiveDrag] = useState<{id: string, startX: number, startY: number, initialX: number, initialY: number} | null>(null);
  const [activeResize, setActiveResize] = useState<{id: string, startX: number, startY: number, initialScale: number, initialWidth?: number, mode: 'scale' | 'width'} | null>(null);

  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [pdfPreviews, setPdfPreviews] = useState<string[]>([]);
  const [pdfScaleFactor, setPdfScaleFactor] = useState(1); 
  const exportRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  const themeAssets = THEME_ASSETS[data.theme] || THEME_ASSETS.generic;
  const isCrossword = data.type === 'crossword' && data.format !== 'square' && data.format !== 'tags';
  const photos = data.images?.photos || [];
  const currentYear = new Date().getFullYear();
  const formatConfig = FORMAT_CONFIG[data.format || 'a4'];

  const isHighDensity = data.words.length > 10;
  const printFontSize = isHighDensity ? '7.5px' : '9px';

  // SET TAG VARIATIONS & MESSAGES (WITH ROBUST RANDOMIZATION)
  useEffect(() => {
      // RESET LOGIC: If theme or format changed, wipe state to force fresh generation
      const hasThemeChanged = prevDataRef.current.theme !== data.theme;
      const hasFormatChanged = prevDataRef.current.format !== data.format;
      
      if (hasThemeChanged || hasFormatChanged) {
          setTagVariations([]);
          setTagMessages([]);
          prevDataRef.current = data;
          return; // Skip the rest, next render will handle init
      }

      if (data.format === 'tags') {
          // 1. MESSAGES (Always init if empty or insufficient)
          if (tagMessages.length < 8) {
              const themeMessages = TAG_MESSAGES_DB[data.theme] || TAG_MESSAGES_DB.generic;
              let msgPool = [...themeMessages];
              // Fill strictly up to 8 using modulo to ensure NO HOLES
              const currentMsgs = [...tagMessages];
              for (let i = currentMsgs.length; i < 8; i++) {
                  currentMsgs.push(msgPool[i % msgPool.length]);
              }
              setTagMessages(currentMsgs);
          }

          // 2. IMAGES (Strict 8 items logic)
          if (tagVariations.length < 8) {
              let defaults = THEME_TAG_IMAGES[data.theme] || THEME_TAG_IMAGES.generic;
              if (!defaults || defaults.length === 0) defaults = THEME_TAG_IMAGES.generic;

              setTagVariations(prev => {
                  const newVars = [...prev];
                  // Strictly fill up to 8
                  while (newVars.length < 8) {
                      const i = newVars.length;
                      // Safe modulo access
                      const img = defaults[i % defaults.length] || ""; // Allow empty string if defaults fail, ensures item exists

                      let title = "Auguri!";
                      if (data.theme === 'christmas') {
                          title = i < 4 ? "Buon Natale" : "Buone Feste";
                      } else {
                          title = data.title || "Auguri";
                      }
                      newVars.push({ img, title });
                  }
                  return newVars;
              });
          }
      } else {
          setViewMode('single'); // Reset to single for non-tag formats
          setTagVariations([]); 
          setTagMessages([]);
      }
  }, [data.format, data.theme, data.title, tagVariations.length, tagMessages.length]);

  useEffect(() => {
    if (editableMessage !== data.message) {
        onUpdate({ message: editableMessage });
    }
  }, [editableMessage]);

  const handleTagMessageChange = (newMsg: string) => {
      const newMessages = [...tagMessages];
      newMessages[currentTagIndex] = newMsg;
      setTagMessages(newMessages);
  };

  // --- NEW TAG IMAGE CONTROLS ---
  const handleSingleTagRandomize = () => {
      const pool = THEME_TAG_IMAGES[data.theme] || THEME_TAG_IMAGES.generic;
      if (!pool || pool.length === 0) return;

      const currentImg = tagVariations[currentTagIndex]?.img;
      
      // Filter out the current image to force a change, but prevent empty list
      let availablePool = pool.filter(img => img !== currentImg);
      if (availablePool.length === 0) availablePool = pool;
      
      const randomImg = availablePool[Math.floor(Math.random() * availablePool.length)];
      if (!randomImg) return; 

      setTagVariations(prev => {
          const clone = [...prev];
          // Ensure object exists
          if (!clone[currentTagIndex]) clone[currentTagIndex] = { title: "Auguri", img: randomImg };
          else clone[currentTagIndex] = { ...clone[currentTagIndex], img: randomImg };
          return clone;
      });
  };

  const handleSingleTagUploadTrigger = () => {
      singleTagFileInputRef.current?.click();
  };

  const handleSingleTagFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onload = (ev) => {
              const result = ev.target?.result as string;
              if (result) {
                  setTagVariations(prev => {
                      const clone = [...prev];
                      if (!clone[currentTagIndex]) clone[currentTagIndex] = { title: "Auguri", img: result };
                      else clone[currentTagIndex] = { ...clone[currentTagIndex], img: result };
                      return clone;
                  });
              }
          };
          reader.readAsDataURL(file);
      }
  };

  const handleOpenPrintModal = () => {
      setPrintRenderKey(p => p + 1); // FORCE REFRESH
      setShowPrintModal(true);
  };

  useEffect(() => {
    if (showPrintModal) {
        generatePreviews();
    } else {
        setPdfPreviews([]);
    }
  }, [showPrintModal, showBorders, data, printRenderKey]);

  const generatePreviews = async () => {
    if (!exportRef.current) return;
    setIsGeneratingPreview(true);
    setPdfPreviews([]); 
    
    const width = formatConfig.pdfWidth;
    exportRef.current.style.width = `${width}px`;

    const currentEditorWidth = editorRef.current?.offsetWidth || formatConfig.width;
    const factor = formatConfig.width / currentEditorWidth;
    setPdfScaleFactor(factor);

    try {
        // Wait 2.5 seconds for images to load in the hidden div
        await new Promise(resolve => setTimeout(resolve, 2500)); 
        
        const sheet1 = exportRef.current.querySelector('#pdf-sheet-1') as HTMLElement;
        const sheet2 = exportRef.current.querySelector('#pdf-sheet-2') as HTMLElement;
        
        if (sheet1 && sheet2) {
            const options = { scale: 0.8, useCORS: true, logging: false, backgroundColor: '#ffffff', windowWidth: Math.max(1600, width + 100) };
            const canvas1 = await html2canvas(sheet1, options);
            const canvas2 = await html2canvas(sheet2, options);
            setPdfPreviews([
                canvas1.toDataURL('image/jpeg', 0.8),
                canvas2.toDataURL('image/jpeg', 0.8)
            ]);
        }
    } catch (e) {
        console.error("Preview generation failed", e);
    } finally {
        setIsGeneratingPreview(false);
    }
  };

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
  }, [data.words, data.solution, data.height, data.width, data.type, isCrossword]); 

  // --- DRAG AND RESIZE LOGIC (simplified for brevity, kept functional) ---
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
            e.preventDefault(); e.stopPropagation();
            if (activeResize.mode === 'width') {
                 const deltaX = e.clientX - activeResize.startX;
                 setItemState(activeResize.id, { width: Math.max(100, (activeResize.initialWidth || 200) + deltaX) });
            } else {
                 const deltaY = e.clientY - activeResize.startY; 
                 setItemState(activeResize.id, { scale: Math.max(0.1, Math.min(activeResize.initialScale + (deltaY * 0.01), 6.0)) });
            }
        } else if (activeDrag) {
            e.preventDefault(); e.stopPropagation();
            setItemState(activeDrag.id, { x: activeDrag.initialX + (e.clientX - activeDrag.startX), y: activeDrag.initialY + (e.clientY - activeDrag.startY) });
        }
    };
    const handleMouseUp = () => { setActiveResize(null); setActiveDrag(null); };
    if (activeResize || activeDrag) { window.addEventListener('mousemove', handleMouseMove); window.addEventListener('mouseup', handleMouseUp); }
    return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); };
  }, [activeResize, activeDrag, customTexts]);

  const startDrag = (e: React.MouseEvent, id: string) => {
      if (editingItemId === id) return;
      e.preventDefault(); e.stopPropagation();
      setActiveItemId(id);
      const current = getItemState(id);
      setActiveDrag({ id, startX: e.clientX, startY: e.clientY, initialX: current.x, initialY: current.y });
  };

  const startResize = (e: React.MouseEvent, id: string, mode: 'scale' | 'width' = 'scale') => {
      if (activeItemId !== id) return;
      e.stopPropagation(); e.preventDefault(); 
      const current = getItemState(id);
      setActiveResize({ id, startX: e.clientX, startY: e.clientY, initialScale: current.scale, initialWidth: current.width, mode });
  };

  const addCustomText = () => {
      const newId = `custom-${Date.now()}`;
      setCustomTexts([...customTexts, { id: newId, type: 'customTxt', x: -200, y: -50, scale: 1, width: 250, content: "Tuo Testo" }]);
      setActiveItemId(newId);
  };

  const updateCustomTextContent = (id: string, newText: string) => {
      setCustomTexts(prev => prev.map(p => p.id === id ? { ...p, content: newText } : p));
  };
  
  const removeCustomText = (id: string) => {
      setCustomTexts(prev => prev.filter(p => p.id !== id));
      setActiveItemId(null); setEditingItemId(null);
  };

  const handleGlobalClick = () => { setActiveItemId(null); setEditingItemId(null); };

  const renderSolution = (isPrint = false) => {
      if (!data.solution) return null;
      // @ts-ignore
      const rawString = data.solution.original || data.solution.word;
      const chars = rawString.split('');
      let letterIndexCounter = 0;
      const len = chars.length;
      let boxSize = len > 15 ? '14px' : (len > 10 ? '18px' : '20px');
      let fontSize = len > 15 ? '9px' : (len > 10 ? '11px' : '12px');
      let numFontSize = len > 15 ? '6px' : (len > 10 ? '7px' : '8px');
      if (isPrint) {
           boxSize = len > 15 ? '14px' : (len > 10 ? '16px' : '20px');
           fontSize = len > 15 ? '8px' : (len > 10 ? '10px' : '12px');
      }
      return (
        <div className={`mb-1 p-1 w-full flex justify-center pointer-events-auto ${!isPrint ? 'bg-white/80 backdrop-blur-sm rounded-lg shadow-sm z-20 relative' : ''}`}>
            <div className="flex justify-center gap-1 flex-wrap items-center">
                {chars.map((char: string, i: number) => {
                    const isSpace = !/[A-Z]/i.test(char);
                    if (isSpace) return <div key={i} style={{ width: String(parseInt(boxSize)*0.6)+'px', height: boxSize }}></div>;
                    letterIndexCounter++;
                    return (
                        <div key={i} style={{ width: boxSize, height: boxSize, backgroundColor: (!isPrint && revealAnswers) ? '#FEF08A' : 'white', border: '1px solid #EAB308', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: fontSize, color: '#854D0E', position: 'relative', flexShrink: 0, overflow: 'hidden', lineHeight: 1 }}>
                            {!isPrint && revealAnswers && <span style={{zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', lineHeight: 1}}>{char}</span>}
                            <span style={{ position: 'absolute', bottom: '1px', right: '1px', fontSize: numFontSize, color: '#B45309', fontWeight: 'bold', lineHeight: 1 }}>{getSolutionLabel(letterIndexCounter)}</span>
                        </div>
                    );
                })}
            </div>
        </div>
      );
  };

  const handleDownloadPDF = async () => {
      if (!exportRef.current) return;
      const width = formatConfig.pdfWidth;
      exportRef.current.style.width = `${width}px`;
      const currentEditorWidth = editorRef.current?.offsetWidth || formatConfig.width;
      const factor = formatConfig.width / currentEditorWidth;
      setPdfScaleFactor(factor);
      setIsGeneratingPDF(true);
      try {
        await new Promise(resolve => setTimeout(resolve, 800));
        const sheet1 = exportRef.current.querySelector('#pdf-sheet-1') as HTMLElement;
        const sheet2 = exportRef.current.querySelector('#pdf-sheet-2') as HTMLElement;
        if (!sheet1 || !sheet2) throw new Error("Elements not found");
        
        const options = { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff', windowWidth: Math.max(1600, width + 100) };
        const canvas1 = await html2canvas(sheet1, options);
        const canvas2 = await html2canvas(sheet2, options);
        const imgData1 = canvas1.toDataURL('image/jpeg', 0.95);
        const imgData2 = canvas2.toDataURL('image/jpeg', 0.95);
        // @ts-ignore
        const doc = new jsPDF({ orientation: formatConfig.pdfOrientation, unit: 'mm', format: formatConfig.pdfFormat });
        const pdfWidth = doc.internal.pageSize.getWidth();
        const pdfHeight = doc.internal.pageSize.getHeight();
        doc.addImage(imgData1, 'JPEG', 0, 0, pdfWidth, pdfHeight);
        doc.addPage();
        doc.addImage(imgData2, 'JPEG', 0, 0, pdfWidth, pdfHeight);
        doc.save(`${data.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`);
        setShowPrintModal(false);
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

  const toggleFormat = () => {
    const formats: CardFormat[] = ['a4', 'a3', 'square', 'tags'];
    const currentIndex = formats.indexOf(data.format || 'a4');
    const nextIndex = (currentIndex + 1) % formats.length;
    onUpdate({ format: formats[nextIndex] });
  };

  const handleGraphicChange = (type: 'photo' | 'sticker' | 'watermark', value: any) => {
     if (type === 'watermark') {
         onUpdate({ hasWatermark: !data.hasWatermark });
     } else if (type === 'sticker') {
         const current = data.stickers || [];
         let newStickers;
         if (current.includes(value)) newStickers = current.filter(s => s !== value);
         else { if (current.length >= 5) return; newStickers = [...current, value]; }
         onUpdate({ stickers: newStickers });
     } else if (type === 'photo') {
         const file = value.target.files[0];
         if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const result = e.target?.result as string;
                onUpdate({ images: { ...data.images, photos: [result], photo: result, extraImage: result } });
            };
            reader.readAsDataURL(file);
         }
     }
  };

  const renderGridCells = (isPrint = false) => (
    <div className={`grid gap-[1px] bg-black/10 p-2 rounded-lg pointer-events-auto`} style={{ gridTemplateColumns: `repeat(${data.width}, minmax(0, 1fr))`, aspectRatio: `${data.width}/${data.height}`, width: '100%', maxHeight: '100%', margin: '0 auto' }}>
      {grid.map((row, y) => row.map((cell, x) => {
          const isSelected = !isPrint && selectedCell?.x === x && selectedCell?.y === y;
          const displayChar = isPrint ? '' : (revealAnswers ? cell.char : cell.userChar); 
          if (!cell.char) return <div key={`${x}-${y}`} className={`bg-black/5 rounded-sm`} />;
          return (
            <div key={`${x}-${y}-${revealAnswers}`} onClick={() => !isPrint && handleCellClick(x, y)} className={`relative flex items-center justify-center w-full h-full text-xl font-bold cursor-pointer rounded-sm`} style={{ backgroundColor: cell.isSolutionCell ? '#FEF08A' : (isSelected && !revealAnswers && !isPrint ? '#DBEAFE' : '#FFFFFF'), boxSizing: 'border-box' }}>
              {cell.number && <span className={`absolute top-0 left-0 leading-none ${isPrint ? 'text-[8px] p-[1px] font-bold text-gray-500' : 'text-[9px] p-0.5 text-gray-500'}`}>{cell.number}</span>}
              {cell.isSolutionCell && cell.solutionIndex !== undefined && <div className={`absolute bottom-0 right-0 leading-none font-bold text-gray-600 bg-white/60 rounded-tl-sm z-10 ${isPrint ? 'text-[8px] p-[1px]' : 'text-[9px] p-0.5'}`}>{getSolutionLabel(cell.solutionIndex)}</div>}
              {isPrint ? <span className="font-bold text-lg"></span> : (isSelected && !revealAnswers ? <input ref={(el) => { inputRefs.current[y][x] = el; }} maxLength={1} className="w-full h-full text-center bg-transparent outline-none uppercase" value={cell.userChar} onChange={(e) => handleInput(x, y, e.target.value)} /> : <div className={`w-full h-full flex items-center justify-center uppercase ${revealAnswers ? 'text-green-600' : ''}`}>{displayChar}</div>)}
            </div>
          );
      }))}
    </div>
  );

  return (
    <div className="flex flex-col items-center gap-8 w-full pb-20" onClick={handleGlobalClick}>
       
       <div className="flex flex-wrap gap-2 justify-center z-20 sticky top-2 p-2 bg-black/5 rounded-full backdrop-blur-sm shadow-xl border border-white/10" onClick={(e) => e.stopPropagation()}>
            <button onClick={onEdit} className="bg-white px-4 py-2 rounded-full shadow border text-sm flex items-center gap-2 font-bold hover:bg-gray-50 text-gray-700 active:scale-95"><Edit size={16} /> Dati</button>
            <button onClick={() => setShowGraphicsModal(true)} className="bg-white px-3 py-2 rounded-full shadow border text-sm flex items-center gap-2 font-bold hover:bg-pink-50 text-pink-600 active:scale-95 border-pink-200"><Palette size={16} /> Grafica</button>
            {data.format === 'tags' && (
                <div className="flex bg-gray-100 rounded-full p-1 border border-gray-300">
                    <button onClick={() => setViewMode('single')} className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 transition-all ${viewMode === 'single' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:bg-gray-200'}`}><LayoutTemplate size={14}/> Singolo</button>
                    <button onClick={() => setViewMode('sheets')} className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 transition-all ${viewMode === 'sheets' ? 'bg-white shadow text-purple-600' : 'text-gray-500 hover:bg-gray-200'}`}><Eye size={14}/> FOGLI A4</button>
                </div>
            )}
            <button onClick={toggleFormat} className="bg-white px-3 py-2 rounded-full shadow border text-sm flex items-center gap-2 font-bold hover:bg-blue-50 text-blue-700 active:scale-95 border-blue-200" title="Cambia formato"><BoxSelect size={16}/> {data.format === 'square' ? 'Quadrato' : data.format === 'tags' ? 'Bigliettini' : (data.format || 'a4').toUpperCase()}</button>
            <button onClick={addCustomText} className="bg-white px-3 py-2 rounded-full shadow border text-sm flex items-center gap-2 font-bold hover:bg-purple-50 text-purple-700 active:scale-95 border-purple-200"><Type size={16}/> Testo</button>
            {isCrossword && <button onClick={() => setRevealAnswers(!revealAnswers)} className={`px-4 py-2 rounded-full shadow border text-sm flex items-center gap-2 font-bold active:scale-95 ${revealAnswers ? 'bg-yellow-100 text-yellow-800' : 'bg-white text-gray-700'}`}>{revealAnswers ? <EyeOff size={16}/> : <Eye size={16}/>}</button>}
            <button onClick={handleOpenPrintModal} disabled={isGeneratingPDF} className={`text-white px-6 py-2 rounded-full shadow-lg text-sm flex items-center gap-2 font-bold active:scale-95 ${isGeneratingPDF ? 'bg-gray-400' : 'bg-gradient-to-r from-green-600 to-emerald-600'}`}>{isGeneratingPDF ? <Loader2 size={16} className="animate-spin"/> : <Printer size={16} />} ANTEPRIMA E STAMPA</button>
       </div>

       {/* GRAPHICS EDITOR MODAL */}
       {showGraphicsModal && (
           <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in" onClick={() => setShowGraphicsModal(false)}>
               <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Palette className="text-pink-500"/> Modifica Grafica</h3>
                    <div className="space-y-4">
                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                            <label className="text-xs font-bold text-gray-500 uppercase mb-2 block flex items-center gap-2"><ImagePlus size={14}/> Cambia Foto {data.format === 'tags' ? '(Copertina)' : ''}</label>
                            <input type="file" accept="image/*" className="text-sm w-full file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-pink-50 file:text-pink-700 hover:file:bg-pink-100" onChange={(e) => handleGraphicChange('photo', e)}/>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                             <div className="flex justify-between items-center mb-2"><label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2"><SmilePlus size={14}/> Stickers ({data.stickers?.length || 0}/5)</label></div>
                             <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">{STICKER_OPTIONS.map(s => (<button key={s} onClick={() => handleGraphicChange('sticker', s)} className={`text-xl p-1 rounded hover:bg-gray-200 ${data.stickers?.includes(s) ? 'bg-blue-100 ring-1 ring-blue-300' : ''}`}>{s}</button>))}</div>
                        </div>
                        <button onClick={() => handleGraphicChange('watermark', null)} className={`w-full py-2 rounded-lg font-bold border flex items-center justify-center gap-2 ${data.hasWatermark ? 'bg-blue-50 border-blue-300 text-blue-600' : 'bg-white border-gray-300 text-gray-500'}`}>Filigrana: {data.hasWatermark ? 'SI' : 'NO'}</button>
                    </div>
                    <button onClick={() => setShowGraphicsModal(false)} className="w-full mt-4 py-2 bg-gray-800 text-white rounded-lg font-bold">Chiudi</button>
               </div>
           </div>
       )}

       {/* MODALE OPZIONI STAMPA & ANTEPRIMA */}
       {showPrintModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in" onClick={() => setShowPrintModal(false)}>
            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden w-full max-w-5xl border-4 border-blue-100 scale-100 animate-in zoom-in-95 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
               <div className="flex justify-between items-center p-6 border-b bg-gray-50 shrink-0">
                   <div>
                       <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><Printer className="text-blue-600"/> Anteprima di Stampa</h3>
                       <div className="flex items-center gap-3 mt-1"><p className="text-sm text-gray-500">Controlla il risultato finale.</p></div>
                   </div>
                   <button onClick={() => setShowPrintModal(false)} className="bg-white text-gray-400 hover:text-red-500 rounded-full p-2 hover:bg-red-50 transition-all"><XCircle size={28}/></button>
               </div>
               <div className="flex-1 overflow-y-auto p-6 bg-gray-100/50 flex flex-col items-center justify-center relative min-h-[300px]">
                   {isGeneratingPreview ? (
                       <div className="flex flex-col items-center gap-3 text-blue-500 animate-pulse">
                           <Loader2 size={48} className="animate-spin"/>
                           <span className="font-bold text-sm uppercase tracking-widest text-center">
                               Sto preparando le immagini...<br/>
                               <span className="text-[10px] normal-case opacity-70">Attendo che si carichino in alta qualità</span>
                           </span>
                       </div>
                   ) : pdfPreviews.length > 0 ? (
                       <div className="flex flex-col md:flex-row gap-6 w-full justify-center items-center">
                           <div className="flex flex-col gap-2 items-center w-full md:w-1/2 max-w-lg">
                               <span className="text-xs font-bold uppercase text-gray-400 tracking-widest bg-white px-2 py-1 rounded-full shadow-sm">Foglio 1: Esterno</span>
                               <img src={pdfPreviews[0]} alt="Preview 1" className="w-full h-auto shadow-xl rounded-sm border bg-white" />
                           </div>
                           <div className="flex flex-col gap-2 items-center w-full md:w-1/2 max-w-lg">
                               <span className="text-xs font-bold uppercase text-gray-400 tracking-widest bg-white px-2 py-1 rounded-full shadow-sm">Foglio 2: Interno</span>
                               <img src={pdfPreviews[1]} alt="Preview 2" className="w-full h-auto shadow-xl rounded-sm border bg-white" />
                           </div>
                       </div>
                   ) : (
                       <div className="text-gray-400 flex flex-col items-center"><Info size={40} className="mb-2"/><p>Impossibile generare l'anteprima.</p></div>
                   )}
               </div>
               <div className="p-6 border-t bg-white shrink-0">
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                         <button onClick={() => setShowBorders(!showBorders)} className={`w-full md:w-auto px-6 py-3 rounded-xl border-2 flex items-center justify-center gap-3 font-bold transition-all ${showBorders ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>{showBorders ? <CheckCircle2 size={20} className="text-blue-600"/> : <div className="w-5 h-5 rounded-full border-2 border-gray-300"/>} Cornice Decorativa</button>
                         <div className="flex gap-3 w-full md:w-auto">
                            <button onClick={() => setShowPrintModal(false)} className="flex-1 md:flex-none px-6 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-colors">Annulla</button>
                            <button onClick={handleDownloadPDF} disabled={isGeneratingPDF} className={`flex-1 md:flex-none px-8 py-3 rounded-xl font-bold text-white shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-2 ${isGeneratingPDF ? 'bg-gray-400' : 'bg-gradient-to-r from-blue-600 to-indigo-600'}`}>{isGeneratingPDF ? <Loader2 size={20} className="animate-spin"/> : <Download size={20}/>} Scarica PDF</button>
                         </div>
                    </div>
               </div>
            </div>
          </div>
       )}
       
       {/* EDITOR VISUALIZATION */}
       <div className="w-full max-w-5xl px-4 md:px-0">
            <h3 className="text-center text-white font-bold uppercase tracking-widest mb-4 flex items-center justify-center gap-2 drop-shadow-md"><Edit size={20}/> EDITOR {data.format === 'tags' ? '(Anteprima Singolo Bigliettino)' : 'BIGLIETTO'}</h3>
            
            {/* Tag Navigation */}
            {data.format === 'tags' && viewMode === 'single' && (
                <div className="flex justify-center items-center gap-4 mb-4 text-white">
                    <button onClick={() => setCurrentTagIndex(p => Math.max(0, p - 1))} disabled={currentTagIndex === 0} className="p-2 bg-white/20 rounded-full hover:bg-white/40 disabled:opacity-30"><ChevronLeft size={24}/></button>
                    <span className="font-bold text-lg">Bigliettino {currentTagIndex + 1} di 8</span>
                    <button onClick={() => setCurrentTagIndex(p => Math.min(7, p + 1))} disabled={currentTagIndex === 7} className="p-2 bg-white/20 rounded-full hover:bg-white/40 disabled:opacity-30"><ChevronRight size={24}/></button>
                </div>
            )}

            {data.format === 'tags' && viewMode === 'sheets' ? (
                <div className="w-full flex flex-col md:flex-row gap-4 justify-center items-start">
                    {/* SHEET VIEW IN EDITOR */}
                    {[0, 1].map(sheetIdx => (
                        <div key={sheetIdx} className="bg-white p-2 shadow-xl rounded w-full md:w-1/2 flex flex-col items-center">
                            <p className="text-xs font-bold uppercase text-gray-500 mb-2">Foglio {sheetIdx + 1} ({sheetIdx === 0 ? 'Fronte/Esterno' : 'Retro/Interno'})</p>
                            <div className="w-full relative bg-gray-100 overflow-hidden" style={{ aspectRatio: '210/297' }}>
                                 {/* Using a clone of the render logic just for display, scaled down */}
                                 <div className="absolute top-0 left-0 w-full h-full flex flex-wrap content-start bg-white origin-top-left transform scale-[0.4] md:scale-[0.35] lg:scale-[0.5]" style={{ width: '794px', height: '1123px' }}>
                                    {tagVariations.map((_, i) => {
                                        const isSheet1 = sheetIdx === 0;
                                        // Sheet 2 Logic: Swap columns
                                        const dataIndex = isSheet1 ? i : (i % 2 === 0 ? i + 1 : i - 1);
                                        const v = tagVariations[dataIndex];
                                        const msg = tagMessages[dataIndex];
                                        
                                        if (!v) return <div key={i} className="w-[397px] h-[280px]"></div>;

                                        return (
                                            <div key={i} style={{ width: '397px', height: '280px', padding: '10px', display: 'flex', boxSizing: 'border-box' }}>
                                                <div className="w-full h-full flex overflow-hidden border border-dashed border-gray-300">
                                                    {isSheet1 ? (
                                                        <>
                                                            <div className="w-1/2 h-full bg-gray-50 flex items-center justify-center relative"><span className="absolute bottom-2 text-[8px] text-gray-300">Created by Enigmistica</span></div>
                                                            <div className="w-1/2 h-full bg-gray-100 overflow-hidden relative">
                                                                {v.img ? <img src={v.img} className="w-full h-full object-cover" /> : null}
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <div className="w-1/2 h-full p-2 flex flex-col items-center justify-center text-center border-r border-dotted border-gray-200">
                                                                <div className="text-[10px] text-gray-400 mt-auto pt-2 border-t w-3/4">Da:</div>
                                                            </div>
                                                            <div className="w-1/2 h-full p-2 flex flex-col items-center justify-center text-center">
                                                                <div className={`${themeAssets.fontTitle} text-lg text-gray-800`}>{v.title}</div>
                                                                <div className="text-[9px] italic text-gray-600 overflow-hidden h-12">{msg}</div>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                 </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div ref={editorRef} className={`bg-white w-full ${formatConfig.cssAspect} shadow-2xl flex relative rounded-sm select-none p-4 mx-auto`}>
                    <div className="absolute inset-y-0 left-1/2 w-px bg-gray-300 border-l border-dashed border-gray-400 opacity-50 z-10 pointer-events-none"></div>

                    {/* CONTENT LAYER */}
                    <div className={`absolute inset-4 flex z-10 pointer-events-none`}>
                        
                        {/* LEFT COLUMN (Fronte/Copertina nei Tags) */}
                        <div className={`w-1/2 h-full p-6 flex flex-col text-center ${showBorders ? themeAssets.printBorder : 'border-none'} border-r-0 relative z-20 box-border pointer-events-none overflow-hidden`}>
                            
                            {/* Header (Only for Cards) */}
                            {data.format !== 'tags' && <div className="shrink-0 mb-2 pointer-events-auto z-20">
                                <h1 className={`text-2xl md:text-3xl ${themeAssets.fontTitle} text-gray-900 leading-tight drop-shadow-sm`}>{data.title}</h1>
                                <p className="text-xs uppercase text-gray-500 font-bold tracking-widest mt-1">{data.eventDate || "Data Speciale"} • {currentYear}</p>
                            </div>}
                            
                            {/* Image Container */}
                            <div className="flex-1 min-h-0 flex items-center justify-center relative w-full my-2">
                                <div className={`relative w-full h-full flex items-center justify-center pointer-events-auto ${activeItemId === 'img2' ? 'cursor-move ring-2 ring-blue-500 ring-dashed z-50' : ''}`}
                                    style={{ transform: `translate(${imgSheet2.x}px, ${imgSheet2.y}px) scale(${imgSheet2.scale})` }}
                                    onMouseDown={(e) => startDrag(e, 'img2')}
                                    onClick={(e) => e.stopPropagation()} 
                                    onDoubleClick={(e) => { e.stopPropagation(); setActiveItemId('img2'); }}
                                >
                                    {data.format === 'tags' ? (
                                        // For Tags, show current variation with controls
                                        <div className="relative w-full h-full group">
                                            <img 
                                                src={tagVariations[currentTagIndex]?.img || data.images?.extraImage || photos[0]} 
                                                className="max-w-full max-h-full object-cover drop-shadow-md shadow-lg w-full h-full" 
                                            />
                                            {/* OVERLAY CONTROLS FOR SINGLE TAG */}
                                            <div className="absolute bottom-2 right-2 flex gap-2 z-50 pointer-events-auto opacity-0 group-hover:opacity-100 transition-opacity">
                                                 <input type="file" ref={singleTagFileInputRef} className="hidden" accept="image/*" onChange={handleSingleTagFileChange}/>
                                                 <button onClick={handleSingleTagUploadTrigger} className="bg-white text-gray-700 p-2 rounded-full shadow hover:bg-gray-100 hover:text-blue-600" title="Carica foto per questo bigliettino"><Camera size={16}/></button>
                                                 <button onClick={handleSingleTagRandomize} className="bg-white text-gray-700 p-2 rounded-full shadow hover:bg-gray-100 hover:text-purple-600" title="Immagine casuale"><Shuffle size={16}/></button>
                                            </div>
                                        </div>
                                    ) : photos.length === 1 ? (
                                        <img src={photos[0]} className="max-w-full max-h-full object-contain drop-shadow-md shadow-lg border-4 border-white bg-gray-100 rotate-1" style={{ width: 'auto', height: 'auto' }} />
                                    ) : photos.length > 1 ? (
                                        <div className="max-w-full max-h-full aspect-square shadow-lg border-4 border-white bg-gray-100 rotate-1 overflow-hidden">
                                            <PhotoCollage photos={photos} />
                                        </div>
                                    ) : data.images?.extraImage ? (
                                        <img src={data.images.extraImage} className="max-w-full max-h-full object-contain drop-shadow-md w-full h-full" />
                                    ) : <div className="w-full h-full border-2 border-dashed border-gray-200 rounded flex items-center justify-center opacity-30"><ImagePlus size={32}/></div>}

                                    {activeItemId === 'img2' && <div onMouseDown={(e) => startResize(e, 'img2')} className="absolute -bottom-6 -right-6 w-10 h-10 bg-blue-600 text-white rounded-full shadow-xl flex items-center justify-center cursor-nwse-resize z-50 pointer-events-auto hover:scale-110"><Maximize size={20} /></div>}
                                </div>
                            </div>

                            {/* Message Container (Cards only) */}
                            {data.format !== 'tags' && (
                                <div className={`w-full relative group pointer-events-auto shrink-0 mt-2 ${activeItemId === 'txt2' ? 'cursor-move ring-2 ring-blue-500 ring-dashed z-50' : ''}`} 
                                    style={{ transform: `translate(${txtSheet2.x}px, ${txtSheet2.y}px) scale(${txtSheet2.scale})` }} 
                                    onMouseDown={(e) => startDrag(e, 'txt2')}
                                    onClick={(e) => e.stopPropagation()} 
                                    onDoubleClick={(e) => { e.stopPropagation(); setEditingItemId('txt2'); }}
                                >
                                    {editingItemId === 'txt2' ? (
                                        <div className="w-full bg-white p-2 rounded-xl shadow-lg border border-blue-200 z-20 absolute top-[-50px] left-0 pointer-events-auto" onMouseDown={(e) => e.stopPropagation()}>
                                            <textarea autoFocus className="w-full p-2 bg-gray-50 border border-blue-200 rounded-lg text-center text-sm font-hand" rows={4} value={editableMessage} onChange={(e) => setEditableMessage(e.target.value)}/>
                                            <button onClick={() => setEditingItemId(null)} className="bg-green-500 text-white text-xs px-3 py-1 rounded-full font-bold mt-2">Fatto</button>
                                        </div>
                                    ) : (
                                        <div className="relative p-2 transition-colors border border-transparent hover:border-yellow-200">
                                            <p className={`text-xl md:text-2xl leading-relaxed ${themeAssets.fontTitle} text-gray-800 drop-shadow-sm`}>"{editableMessage}"</p>
                                            {activeItemId === 'txt2' && <button onClick={(e) => { e.stopPropagation(); setEditingItemId('txt2'); }} className="absolute -top-3 -right-3 bg-white text-blue-600 rounded-full p-1.5 shadow-md border border-blue-100 hover:bg-blue-50 z-50"><Pencil size={12}/></button>}
                                        </div>
                                    )}
                                    {activeItemId === 'txt2' && !editingItemId && <div onMouseDown={(e) => startResize(e, 'txt2')} className="absolute -bottom-6 -right-6 w-10 h-10 bg-blue-600 text-white rounded-full shadow-xl flex items-center justify-center cursor-nwse-resize z-50 pointer-events-auto hover:scale-110"><Maximize size={20} /></div>}
                                </div>
                            )}
                        </div>

                        {/* RIGHT COLUMN (Interno/Testo nei Tags) */}
                        <div className={`w-1/2 h-full p-6 flex flex-col relative z-10 pointer-events-none overflow-hidden box-border ${showBorders ? themeAssets.printBorder : 'border-none'} border-l-0`}>
                            {isCrossword ? (
                                <div className="flex flex-col h-full w-full justify-between">
                                    <div className="shrink-0 pointer-events-auto">
                                        <h2 className="text-lg font-bold uppercase border-b-2 border-black mb-1 pb-1 text-center tracking-widest">Cruciverba</h2>
                                        {renderSolution()}
                                    </div>
                                    <div className="flex-grow min-h-0 flex items-center justify-center py-1 relative w-full pointer-events-none">
                                        <div className="w-full h-full max-h-full flex items-center justify-center pointer-events-auto" style={{ maxHeight: '100%' }}>{renderGridCells(false)}</div>
                                    </div>
                                    <div className="shrink-0 mt-1 text-[9px] md:text-[10px] grid grid-cols-2 gap-2 leading-tight w-full border-t border-black pt-1 overflow-y-auto max-h-[140px] pointer-events-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                                        <div className="pr-1"><b className="block border-b border-gray-300 mb-1 pb-0.5 font-bold text-xs">Orizzontali</b>{data.words.filter(w=>w.direction===Direction.ACROSS).map(w=><div key={w.id} className="mb-0.5"><b className="mr-1">{w.number}.</b>{w.clue}</div>)}</div>
                                        <div className="pl-1 border-l border-gray-100"><b className="block border-b border-gray-300 mb-1 pb-0.5 font-bold text-xs">Verticali</b>{data.words.filter(w=>w.direction===Direction.DOWN).map(w=><div key={w.id} className="mb-0.5"><b className="mr-1">{w.number}.</b>{w.clue}</div>)}</div>
                                    </div>
                                </div>
                            ) : data.format === 'tags' ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-center p-2">
                                    {data.recipientName && <p className="text-xs uppercase text-gray-400 font-bold mb-4">A: {data.recipientName}</p>}
                                    
                                    <p className={`${themeAssets.fontTitle} text-2xl text-gray-800 whitespace-pre-line leading-tight`}>{tagVariations[currentTagIndex]?.title || "Auguri!"}</p>
                                    
                                    {/* Editable Tag Message */}
                                    <div className="mt-4 w-full relative pointer-events-auto group">
                                        <textarea 
                                            className="w-full text-center text-xs font-serif bg-transparent outline-none resize-none border-b border-transparent hover:border-gray-200 focus:border-blue-400 transition-colors" 
                                            rows={3} 
                                            value={tagMessages[currentTagIndex] || ""} 
                                            onChange={(e) => handleTagMessageChange(e.target.value)}
                                        />
                                        <span className="absolute -top-3 -right-3 opacity-0 group-hover:opacity-100 text-gray-400 bg-white rounded-full p-1 shadow-sm transition-opacity"><Pencil size={10}/></span>
                                    </div>

                                    {data.eventDate && <div style={{ fontSize: '10px', marginTop: '5px', color: '#666', textTransform: 'uppercase' }}>{data.eventDate}</div>}
                                    <div className="mt-8 border-t border-dashed border-gray-300 w-full pt-2">
                                        <p className="text-xs text-gray-400">Da:</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex-1 flex items-center justify-center opacity-20 border-2 border-dashed border-gray-300 m-8 rounded-xl"><p className="text-xl font-hand rotate-[-5deg] text-center">Spazio per dedica<br/>scritta a mano...</p></div>
                            )}
                        </div>
                    </div>

                    {/* OVERLAY ELEMENTS */}
                    <div className="absolute inset-0 z-50 pointer-events-none">
                        {/* Sticker Container */}
                        <div className={`absolute left-1/2 top-1/2 pointer-events-auto ${activeItemId === 'stickerGroup' ? 'cursor-move ring-2 ring-green-400 ring-dashed bg-green-50/30 rounded-lg z-50' : ''}`} 
                            style={{ transform: `translate(-50%, -50%) translate(${stickerGroup.x}px, ${stickerGroup.y}px) scale(${stickerGroup.scale})` }} 
                            onMouseDown={(e) => startDrag(e, 'stickerGroup')}
                            onClick={(e) => e.stopPropagation()} 
                            onDoubleClick={(e) => { e.stopPropagation(); setActiveItemId('stickerGroup'); }}
                        >
                            <div className="flex gap-2 text-3xl drop-shadow-sm">{(data.stickers || []).slice(0,5).map((s,i) => <span key={i}>{s}</span>)}</div>
                            {activeItemId === 'stickerGroup' && <div onMouseDown={(e) => startResize(e, 'stickerGroup')} className="absolute -bottom-6 -right-6 w-10 h-10 bg-blue-600 text-white rounded-full shadow-xl flex items-center justify-center cursor-nwse-resize z-50 pointer-events-auto hover:scale-110"><Maximize size={20} /></div>}
                        </div>
                        {/* Custom Texts */}
                        {customTexts.map(t => (
                            <div key={t.id} className={`absolute left-1/2 top-1/2 flex items-center justify-center pointer-events-auto ${activeItemId === t.id ? 'cursor-move ring-1 ring-purple-300 ring-dashed bg-white/80 rounded-lg shadow-sm z-50' : 'z-40'}`} 
                                style={{ transform: `translate(-50%, -50%) translate(${t.x}px, ${t.y}px)` }} 
                                onMouseDown={(e) => startDrag(e, t.id)}
                                onClick={(e) => e.stopPropagation()} 
                                onDoubleClick={(e) => { e.stopPropagation(); setEditingItemId(t.id); }}
                            >
                                {editingItemId === t.id ? (
                                    <div className="relative group p-2 border-2 border-purple-300 border-dashed rounded-lg bg-white shadow-xl z-50" style={{ width: `${t.width || 250}px` }} onMouseDown={(e) => e.stopPropagation()}>
                                        <textarea autoFocus value={t.content} onChange={(e) => updateCustomTextContent(t.id, e.target.value)} className="w-full bg-transparent text-center font-hand focus:outline-none text-purple-900 placeholder-purple-300 resize-none overflow-hidden" style={{ fontSize: `${(t.scale * 20)}px`, lineHeight: 1.2 }} rows={Math.max(1, (t.content?.split('\n').length || 1))}/>
                                        <button onClick={() => setEditingItemId(null)} className="absolute -top-3 -right-3 bg-green-500 text-white rounded-full p-1 shadow-md hover:bg-green-600"><CheckCircle2 size={14}/></button>
                                        <button onClick={() => removeCustomText(t.id)} className="absolute -top-3 -left-3 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"><Trash2 size={14}/></button>
                                        <div onMouseDown={(e) => startResize(e, t.id, 'scale')} className="absolute -bottom-3 -right-3 w-6 h-6 bg-purple-600 text-white rounded-full shadow-md flex items-center justify-center cursor-nwse-resize pointer-events-auto hover:scale-110 z-20"><Maximize size={12}/></div>
                                        <div onMouseDown={(e) => startResize(e, t.id, 'width')} className="absolute top-1/2 -right-3 -translate-y-1/2 w-4 h-8 bg-purple-400 text-white rounded-md shadow-md flex items-center justify-center cursor-ew-resize pointer-events-auto hover:scale-110 z-20"><ArrowRightLeft size={12}/></div>
                                    </div>
                                ) : (
                                    <div style={{ width: `${t.width || 250}px` }} className="relative"><p className="font-hand text-purple-900 text-center px-2" style={{ fontSize: `${(t.scale * 20)}px`, lineHeight: 1.2, wordWrap: 'break-word' }}>{t.content}</p>{activeItemId === t.id && <button onClick={(e) => { e.stopPropagation(); setEditingItemId(t.id); }} className="absolute -top-3 -right-3 bg-white text-purple-600 rounded-full p-1.5 shadow-md border border-purple-100 hover:bg-purple-50 z-50"><Pencil size={12}/></button>}</div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
       </div>

       {/* --- HIDDEN PDF EXPORT STAGE --- */}
       <div ref={exportRef} style={{ position: 'fixed', top: 0, left: '-9999px', zIndex: -100 }}>
            {data.format === 'tags' ? (
                // TAGS LAYOUT: 8 Items Grid on A4 PORTRAIT (794x1123px)
                // KEY ADDED HERE TO FORCE RE-RENDER ON PRINT
                <div key={printRenderKey}>
                    <div id="pdf-sheet-1" style={{ width: '794px', height: '1123px', display: 'flex', flexWrap: 'wrap', alignContent: 'flex-start', padding: '0', margin: '0', backgroundColor: 'white', boxSizing: 'border-box' }}>
                        {Array(8).fill(null).map((_, i) => {
                             const v = tagVariations[i];
                             if (!v) return <div key={i} style={{ width: '397px', height: '280px' }}></div>;
                             return (
                            <div key={i} style={{ width: '397px', height: '280px', boxSizing: 'border-box', padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {/* CARD OUTER: LEFT=BACK, RIGHT=FRONT */}
                                <div style={{ width: '100%', height: '100%', display: 'flex', overflow: 'hidden', border: '1px dashed #e5e7eb' }}>
                                     {/* Back Cover (Left) - NOW HORIZONTAL AND CENTERED AT BOTTOM */}
                                     <div style={{ width: '50%', height: '100%', backgroundColor: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                                         <div style={{ position: 'absolute', bottom: '5px', width: '100%', textAlign: 'center' }}>
                                             <span style={{ fontSize: '6px', color: '#d1d5db', textTransform: 'uppercase' }}>Created by Enigmistica</span>
                                         </div>
                                     </div>
                                     {/* Front Cover (Right) - IMAGE */}
                                     <div style={{ width: '50%', height: '100%', position: 'relative', overflow: 'hidden', backgroundColor: '#f3f4f6' }}>
                                          {v.img ? (
                                              <img 
                                                src={v.img} 
                                                crossOrigin="anonymous" 
                                                loading="eager"
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                                onError={(e) => { e.currentTarget.style.display = 'none'; if(e.currentTarget.parentElement) e.currentTarget.parentElement.style.backgroundColor = '#e5e7eb'; }}
                                              />
                                          ) : <div style={{width:'100%', height:'100%', background: '#eee'}}></div>}
                                     </div>
                                </div>
                            </div>
                        )})}
                    </div>

                    <div id="pdf-sheet-2" style={{ width: '794px', height: '1123px', display: 'flex', flexWrap: 'wrap', alignContent: 'flex-start', padding: '0', margin: '0', backgroundColor: 'white', boxSizing: 'border-box' }}>
                        {Array(8).fill(null).map((_, i) => {
                            // SWAP COLUMNS LOGIC for Duplex Printing (Long Edge)
                            const dataIndex = i % 2 === 0 ? i + 1 : i - 1;
                            const v = tagVariations[dataIndex];
                            const msg = tagMessages[dataIndex];
                            if (!v) return <div key={i} style={{ width: '397px', height: '280px' }}></div>;

                            return (
                                <div key={i} style={{ width: '397px', height: '280px', boxSizing: 'border-box', padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {/* CARD INNER: LEFT=DEDICATION, RIGHT=MESSAGE */}
                                    <div style={{ width: '100%', height: '100%', display: 'flex', overflow: 'hidden', border: '1px dashed #e5e7eb' }}>
                                        {/* Inner Left - DEDICATION */}
                                        <div style={{ width: '50%', height: '100%', padding: '5px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', borderRight: '1px dotted #eee', boxSizing: 'border-box' }}>
                                            {data.recipientName && <div style={{fontSize: '10px', fontWeight: 'bold', color: '#9ca3af', textTransform: 'uppercase', marginBottom: '5px'}}>A: {data.recipientName}</div>}
                                            <div style={{ marginTop: 'auto', borderTop: '1px dashed #e5e7eb', width: '80%', paddingTop: '5px', fontSize: '10px', color: '#9ca3af' }}>Da:</div>
                                        </div>
                                        {/* Inner Right - MESSAGE */}
                                        <div style={{ width: '50%', height: '100%', padding: '5px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', boxSizing: 'border-box' }}>
                                            <div className={themeAssets.fontTitle} style={{ fontSize: '16px', color: '#1f2937', lineHeight: '1', marginBottom: '5px' }}>{v.title}</div>
                                            <div style={{ fontSize: '9px', fontStyle: 'italic', color: '#4b5563', overflow: 'hidden' }}>{msg}</div>
                                            {data.eventDate && <div style={{ fontSize: '8px', marginTop: '5px', color: '#9ca3af', textTransform: 'uppercase' }}>{data.eventDate}</div>}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : (
                // STANDARD CARD LAYOUT (LANDSCAPE A4)
                <div key={printRenderKey}>
                    {/* SHEET 1 */}
                    <div id="pdf-sheet-1" style={{ width: `${formatConfig.pdfWidth}px`, height: `${formatConfig.pdfHeight}px`, display: 'flex', position: 'relative', backgroundColor: 'white', overflow: 'hidden', boxSizing: 'border-box', padding: '25px' }}>
                        {/* WATERMARK - OPTIONAL - APPLIED SCALE */}
                        {data.hasWatermark && (
                            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: `translate(-50%, -50%) translate(${wmSheet1.x * pdfScaleFactor}px, ${wmSheet1.y * pdfScaleFactor}px) scale(${wmSheet1.scale}) rotate(12deg)`, fontSize: '130px', opacity: 0.20, zIndex: 0, whiteSpace: 'nowrap' }}>{themeAssets.watermark}</div>
                        )}
                        <div style={{ width: '49%', marginRight: '1%', height: '100%', padding: '30px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', position: 'relative', zIndex: 10, boxSizing: 'border-box', borderRight: 'none', border: showBorders ? themeAssets.pdfBorder : 'none' }}>
                            <div style={{ fontSize: '80px', opacity: 0.2, marginBottom: '20px' }}>{themeAssets.decoration}</div>
                            {data.images?.brandLogo && <div style={{ position: 'absolute', bottom: '40px', left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: 0.8 }}><p style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '2px', color: '#9ca3af', marginBottom: '5px' }}>Created by</p><img src={data.images.brandLogo} style={{ height: '40px', objectFit: 'contain' }} /></div>}
                        </div>
                        
                        <div style={{ width: '49%', marginLeft: '1%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', position: 'relative', zIndex: 10, boxSizing: 'border-box', borderLeft: 'none', border: showBorders ? themeAssets.pdfBorder : 'none' }}>
                            {/* COVER FULL SIZE - WITH INTERNAL PADDING TO PREVENT BORDER OVERLAP */}
                            {data.images?.extraImage ? (
                                <div style={{ width: '100%', height: '100%', padding: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <img src={data.images.extraImage} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                                </div>
                            ) : <div style={{ fontSize: '120px', opacity: 0.8 }}>{themeAssets.decoration}</div>}
                        </div>
                    </div>
                    
                    {/* SHEET 2 - PDF LAYOUT REFACTORED FOR STRICT PROPORTIONS */}
                    <div id="pdf-sheet-2" style={{ width: `${formatConfig.pdfWidth}px`, height: `${formatConfig.pdfHeight}px`, display: 'flex', position: 'relative', backgroundColor: 'white', overflow: 'hidden', boxSizing: 'border-box', padding: '25px' }}>
                        {/* WATERMARK */}
                        {data.hasWatermark && (
                            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: `translate(-50%, -50%) translate(${wmSheet2.x * pdfScaleFactor}px, ${wmSheet2.y * pdfScaleFactor}px) scale(${wmSheet2.scale}) rotate(12deg)`, fontSize: '130px', opacity: 0.20, zIndex: 0, whiteSpace: 'nowrap' }}>{themeAssets.watermark}</div>
                        )}
                        
                        {/* LEFT PAGE (DEDICA) - Flex Column Layout for PDF */}
                        <div style={{ width: '49%', marginRight: '1%', height: '100%', position: 'relative', zIndex: 10, boxSizing: 'border-box', overflow: 'hidden', borderRight: 'none', border: showBorders ? themeAssets.pdfBorder : 'none' }}>
                            
                            {/* WRAPPER */}
                            <div style={{ width: '100%', height: '100%', padding: '30px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', justifyContent: 'space-between' }}>
                                
                                {/* HEADER */}
                                <div style={{marginBottom: '10px', width: '100%', flexShrink: 0}}>
                                    <h1 className={themeAssets.fontTitle} style={{ fontSize: '40px', marginBottom: '5px', lineHeight: 1.2 }}>{data.title}</h1>
                                    <p style={{ fontSize: '14px', textTransform: 'uppercase', color: '#666', letterSpacing: '2px' }}>{data.eventDate || "Data Speciale"} • {currentYear}</p>
                                </div>

                                {/* PHOTO AREA - Flex Grow to take space, but strict containment */}
                                <div style={{ flex: '1 1 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', overflow: 'hidden', minHeight: 0, margin: '10px 0', position: 'relative' }}>
                                    {/* Wrapper for transforms */}
                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `translate(${imgSheet2.x * pdfScaleFactor}px, ${imgSheet2.y * pdfScaleFactor}px) scale(${imgSheet2.scale})` }}>
                                        {photos.length === 1 ? (
                                            // SINGLE PHOTO: No cropping, strict object-contain
                                            <img 
                                                src={photos[0]} 
                                                style={{ 
                                                    maxWidth: '100%', 
                                                    maxHeight: '100%', 
                                                    width: 'auto', 
                                                    height: 'auto', 
                                                    objectFit: 'contain', 
                                                    border: '5px solid white', 
                                                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)', 
                                                    backgroundColor: '#f3f4f6', 
                                                    transform: 'rotate(1deg)' 
                                                }} 
                                            />
                                        ) : photos.length > 1 ? (
                                            <div style={{ width: 'auto', height: 'auto', maxWidth: '100%', maxHeight: '100%', aspectRatio: '1/1', border: '5px solid white', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', overflow: 'hidden', backgroundColor: '#f3f4f6', transform: 'rotate(1deg)' }}>
                                                <PhotoCollage photos={photos} />
                                            </div>
                                        ) : data.images?.extraImage ? (
                                            // FIXED: Object Contain to avoid stretching
                                            <img src={data.images.extraImage} style={{ maxWidth: '100%', maxHeight: '100%', width: '100%', height: '100%', objectFit: 'contain' }} />
                                        ) : null}
                                    </div>
                                </div>

                                {/* MESSAGE AREA */}
                                <div style={{ flexShrink: 0, width: '100%', position: 'relative', minHeight: '50px' }}>
                                    <div style={{ transform: `translate(${txtSheet2.x * pdfScaleFactor}px, ${txtSheet2.y * pdfScaleFactor}px) scale(${txtSheet2.scale})` }}>
                                        <p className={themeAssets.fontTitle} style={{ fontSize: '24px', lineHeight: 1.5 }}>"{editableMessage}"</p>
                                    </div>
                                </div>
                            </div>

                        </div>
                        
                        {/* RIGHT PAGE (CROSSWORD) */}
                        <div style={{ width: '49%', marginLeft: '1%', height: '100%', position: 'relative', zIndex: 10, boxSizing: 'border-box', overflow: 'hidden', borderLeft: 'none', border: showBorders ? themeAssets.pdfBorder : 'none' }}>
                            <div style={{ width: '100%', height: '100%', padding: '40px', paddingRight: '50px', display: 'flex', flexDirection: 'column' }}>
                                {isCrossword ? (
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                                    <div style={{ flexShrink: 0 }}>
                                            <h2 style={{ fontSize: '20px', fontWeight: 'bold', textTransform: 'uppercase', borderBottom: '2px solid black', marginBottom: '10px', paddingBottom: '5px', textAlign: 'center', letterSpacing: '2px' }}>Cruciverba</h2>
                                            {renderSolution(true)}
                                    </div>
                                    <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px 0', overflow: 'hidden' }}>
                                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {renderGridCells(true)}
                                        </div>
                                    </div>
                                    <div style={{ flexShrink: 0, fontSize: printFontSize, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', lineHeight: 1.1, borderTop: '2px solid black', paddingTop: '10px' }}>
                                            <div><b style={{ display: 'block', borderBottom: '1px solid #ccc', marginBottom: '4px', paddingBottom: '2px', textTransform: 'uppercase', fontWeight: 'bold' }}>Orizzontali</b>{data.words.filter(w=>w.direction===Direction.ACROSS).map(w=><div key={w.id} style={{ marginBottom: '2px', whiteSpace: 'normal' }}><b style={{ marginRight: '4px' }}>{w.number}.</b>{w.clue}</div>)}</div>
                                            <div><b style={{ display: 'block', borderBottom: '1px solid #ccc', marginBottom: '4px', paddingBottom: '2px', textTransform: 'uppercase', fontWeight: 'bold' }}>Verticali</b>{data.words.filter(w=>w.direction===Direction.DOWN).map(w=><div key={w.id} style={{ marginBottom: '2px', whiteSpace: 'normal' }}><b style={{ marginRight: '4px' }}>{w.number}.</b>{w.clue}</div>)}</div>
                                    </div>
                                </div>
                            ) : <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed #ccc', borderRadius: '10px', opacity: 0.3 }}></div>}
                            </div>
                        </div>

                        {/* ABSOLUTE ELEMENTS */}
                        <div style={{ position: 'absolute', left: '50%', top: '50%', transform: `translate(-50%, -50%) translate(${stickerGroup.x * pdfScaleFactor}px, ${stickerGroup.y * pdfScaleFactor}px) scale(${stickerGroup.scale})`, pointerEvents: 'none', zIndex: 50 }}>
                            <div style={{display:'flex', gap:'10px', fontSize:'50px'}}>{(data.stickers || []).slice(0,5).map((s,i) => <span key={i}>{s}</span>)}</div>
                        </div>
                        {customTexts.map(t => (
                            <div key={t.id} style={{ position: 'absolute', left: '50%', top: '50%', transform: `translate(-50%, -50%) translate(${t.x * pdfScaleFactor}px, ${t.y * pdfScaleFactor}px)`, pointerEvents: 'none', zIndex: 50 }}>
                                <div style={{ width: `${(t.width || 250) * pdfScaleFactor}px` }}>
                                    <p className="font-hand" style={{ fontSize: `${(t.scale * 20) * pdfScaleFactor}px`, lineHeight: 1.2, color: '#581c87', textAlign: 'center', wordWrap: 'break-word' }}>{t.content}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
       </div>
    </div>
  );
};

export default CrosswordGrid;
