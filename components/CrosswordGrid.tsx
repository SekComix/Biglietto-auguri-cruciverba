import React, { useState, useEffect, useRef } from 'react';
import { CrosswordData, CellData, Direction, ThemeType, CardFormat } from '../types';
import { Printer, Edit, Eye, EyeOff, CheckCircle2, Palette, Download, Loader2, XCircle, Maximize, Info, Type, Grip, ArrowRightLeft, Pencil, BoxSelect, ImagePlus, SmilePlus, ChevronLeft, ChevronRight, LayoutTemplate, Camera, FolderInput, Save, Upload, HelpCircle, Stamp, FileWarning } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { PrintTemplates } from './PrintTemplates';

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

const TAG_MESSAGES_DB: Record<string, string[]> = {
    christmas: ["Ti auguro un Natale pieno di gioia.", "Buone Feste!", "Auguri di cuore.", "Buon Natale!", "Felice Anno Nuovo", "Sotto l'albero tanta felicità."],
    birthday: ["Buon Compleanno!", "Tanti auguri di felicità.", "Un anno in più, sempre fantastico!", "Festeggia alla grande.", "Sorprese bellissime in arrivo."],
    generic: ["Un pensiero per te.", "Con i migliori auguri.", "Spero ti piaccia!", "Tanta felicità.", "Auguri sinceri."]
};

const STICKER_OPTIONS = ['🎅', '🎄', '🎁', '❄️', '⛄', '🎂', '🎈', '🎉', '🕯️', '🍰', '💍', '❤️', '💐', '🎃', '👻', '🎓', '🏆', '⚽', '🐶', '🐱', '⭐', '✨'];

const FORMAT_CONFIG: Record<CardFormat, { label: string, cssAspect: string, width: number, height: number, pdfFormat: any, pdfOrientation: 'p' | 'l', pdfWidth: number, pdfHeight: number }> = {
    'a4': { label: 'A4 Standard', cssAspect: 'aspect-[297/210]', width: 1123, height: 794, pdfFormat: 'a4', pdfOrientation: 'l', pdfWidth: 1123, pdfHeight: 794 },
    'a3': { label: 'A3 Maxi', cssAspect: 'aspect-[297/210]', width: 1587, height: 1123, pdfFormat: 'a3', pdfOrientation: 'l', pdfWidth: 1587, pdfHeight: 1123 },
    'square': { label: 'Quadrato (2x)', cssAspect: 'aspect-[210/297]', width: 794, height: 1123, pdfFormat: 'a4', pdfOrientation: 'p', pdfWidth: 794, pdfHeight: 1123 },
    'tags': { label: 'Bigliettini', cssAspect: 'aspect-[210/297]', width: 794, height: 1123, pdfFormat: 'a4', pdfOrientation: 'p', pdfWidth: 794, pdfHeight: 1123 },
    'a6_2x': { label: 'Mini (2 su 1)', cssAspect: 'aspect-[210/297]', width: 794, height: 1123, pdfFormat: 'a4', pdfOrientation: 'p', pdfWidth: 794, pdfHeight: 1123 }
};

const getSolutionLabel = (index: number) => String.fromCharCode(64 + index);

const shuffleArray = (array: string[]) => {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
};

// --- RESTORED PHOTO COLLAGE FOR EDITOR PREVIEW ---
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

interface PositionableItem {
    id: string;
    type: string;
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
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showInstructionModal, setShowInstructionModal] = useState(false);
  
  const [viewMode, setViewMode] = useState<'single' | 'sheets'>('single');

  const inputRefs = useRef<(HTMLInputElement | null)[][]>([]);
  const singleTagFileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const albumUploadRef = useRef<HTMLInputElement>(null);

  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null); 
  
  const [wmSheet1, setWmSheet1] = useState({ id: 'wm1', type: 'wm1', scale: 1.5, x: 0, y: 0 });
  const [wmSheet2, setWmSheet2] = useState({ id: 'wm2', type: 'wm2', scale: 1.5, x: 0, y: 0 });
  
  const [imgSheet1, setImgSheet1] = useState({ id: 'img1', type: 'img1', scale: 1, x: 0, y: 0 });
  const [imgSheet2, setImgSheet2] = useState({ id: 'img2', type: 'img2', scale: 1, x: 0, y: 0 });
  
  const [txtSheet2, setTxtSheet2] = useState({ id: 'txt2', type: 'txt2', scale: 1, x: 0, y: 0 });
  
  const [stickerGroup, setStickerGroup] = useState({ id: 'stickerGroup', type: 'stickerGroup', scale: 0.8, x: -350, y: 200 }); 

  const [customTexts, setCustomTexts] = useState<PositionableItem[]>([]);

  const [allTagImages, setAllTagImages] = useState<string[]>([]);
  const [currentSheetPage, setCurrentSheetPage] = useState(0); 
  const [sheetsToPrint, setSheetsToPrint] = useState<number[]>([]);
  const [tagVariations, setTagVariations] = useState<Array<{img: string, title: string}>>([]);
  const [tagMessages, setTagMessages] = useState<string[]>([]);
  const [currentTagIndex, setCurrentTagIndex] = useState(0);
  
  const prevDataRef = useRef(data);
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
  const isCrossword = data.type === 'crossword' && data.format !== 'tags';
  const photos = data.images?.photos || [];
  const currentYear = new Date().getFullYear();
  const formatConfig = FORMAT_CONFIG[data.format || 'a4'];

  const isMultiItemFormat = data.format === 'tags' || data.format === 'a6_2x' || data.format === 'square';
  const itemsPerPage = data.format === 'tags' ? 8 : 2; 
  const totalPages = Math.ceil(Math.max(allTagImages.length, itemsPerPage) / itemsPerPage);

  // RESET DATI AL CAMBIO FORMATO
  useEffect(() => {
      const hasThemeChanged = prevDataRef.current.theme !== data.theme;
      const hasFormatChanged = prevDataRef.current.format !== data.format;
      
      if (hasThemeChanged || hasFormatChanged) {
          setAllTagImages([]);
          setCurrentSheetPage(0);
          setTagMessages([]);
          prevDataRef.current = data;
      }
      
      if (isMultiItemFormat && allTagImages.length === 0) {
           setAllTagImages(Array(itemsPerPage).fill(""));
      }
  }, [data.format, data.theme, isMultiItemFormat, itemsPerPage]);

  // LOGICA GENERAZIONE VARIANTI (IMMAGINI E MESSAGGI)
  useEffect(() => {
      if (!isMultiItemFormat) {
          setViewMode('single');
          return;
      }
      
      // -- LOGICA MESSAGGI --
      let currentMsgs = [...tagMessages];
      if (data.message && (currentMsgs.length === 0 || currentMsgs[0] !== data.message)) {
          const count = Math.max(allTagImages.length, itemsPerPage * 5); 
          currentMsgs = Array(count).fill(data.message);
          setTagMessages(currentMsgs);
      } else if (currentMsgs.length < allTagImages.length) {
          const themeMessages = TAG_MESSAGES_DB[data.theme] || TAG_MESSAGES_DB.generic;
          let messagePool: string[] = [];
          while (messagePool.length < Math.max(allTagImages.length, itemsPerPage)) {
              messagePool = [...messagePool, ...shuffleArray(themeMessages)];
          }
          currentMsgs = messagePool;
          setTagMessages(currentMsgs);
      }
      
      // -- LOGICA IMMAGINI --
      let displayImages = allTagImages;
      if (displayImages.length === 0) {
          displayImages = Array(itemsPerPage).fill(data.images?.extraImage || ""); 
      }
      
      const startIdx = currentSheetPage * itemsPerPage;
      const pageImages = displayImages.slice(startIdx, startIdx + itemsPerPage);
      while(pageImages.length < itemsPerPage) pageImages.push("");

      const newVars = pageImages.map((img, i) => {
          let title = "Auguri!";
          const absoluteIndex = startIdx + i;
          if (data.theme === 'christmas') {
              title = (absoluteIndex % itemsPerPage) < (itemsPerPage/2) ? "Buon Natale" : "Buone Feste";
          } else {
              title = data.title || "Auguri";
          }
          return { img: img || data.images?.extraImage || "", title };
      });
      setTagVariations(newVars);

  }, [allTagImages, currentSheetPage, data.format, data.theme, data.title, tagMessages.length, isMultiItemFormat, itemsPerPage, data.message, data.images?.extraImage]); 

  useEffect(() => {
    if (editableMessage !== data.message) {
        onUpdate({ message: editableMessage });
    }
  }, [editableMessage]);

  const handleTagMessageChange = (newMsg: string) => {
      const newMessages = [...tagMessages];
      const globalIndex = (currentSheetPage * itemsPerPage) + currentTagIndex;
      newMessages[globalIndex] = newMsg;
      setTagMessages(newMessages);
  };

  const handleSingleTagUploadTrigger = () => singleTagFileInputRef.current?.click();
  const handleFolderUploadTrigger = () => folderInputRef.current?.click();
  const handleAlbumLoadTrigger = () => albumUploadRef.current?.click();

  const handleAlbumSave = () => {
      if (allTagImages.length === 0 || allTagImages.every(img => !img)) {
          alert("Nessuna immagine da salvare.");
          return;
      }
      const blob = new Blob([JSON.stringify({ images: allTagImages })], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `album_${data.theme}_${allTagImages.length}foto.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
  };

  const handleAlbumLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
          try {
              const json = JSON.parse(ev.target?.result as string);
              if (json.images && Array.isArray(json.images)) {
                  setAllTagImages(json.images);
                  setTagMessages([]); 
                  setCurrentSheetPage(0);
                  alert(`Album caricato con successo! ${json.images.length} foto importate.`);
              } else {
                  alert("File album non valido.");
              }
          } catch (err) {
              alert("Errore caricamento album.");
          }
      };
      reader.readAsText(file);
      e.target.value = '';
  };

  const handleFolderUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      
      if (files.length > 40) {
          alert("Attenzione: Hai selezionato troppe foto. Ne verranno caricate solo le prime 40 per evitare blocchi.");
      }
      
      const imageFiles = Array.from(files)
        .filter(file => file.type.startsWith('image/'))
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }))
        .slice(0, 40);
      
      if (imageFiles.length === 0) { 
          alert("Nessuna immagine trovata nella selezione."); 
          return; 
      }

      const promises = imageFiles.map(file => new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (ev) => resolve(ev.target?.result as string);
          reader.onerror = () => resolve(""); 
          reader.readAsDataURL(file);
      }));

      Promise.all(promises).then(images => {
          const validImages = images.filter(img => img !== "");
          if (validImages.length === 0) return;
          
          setAllTagImages(validImages);
          if (tagMessages.length < validImages.length && data.message) {
              const newMsgs = Array(validImages.length).fill(data.message);
              setTagMessages(newMsgs);
          } else {
             setTagMessages([]); 
          }
          setCurrentSheetPage(0);
          alert(`Caricamento completato! ${validImages.length} foto pronte.`);
      });
      e.target.value = ''; 
  };

  const handleSingleTagFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onload = (ev) => {
              const result = ev.target?.result as string;
              if (result) {
                  const globalIndex = (currentSheetPage * itemsPerPage) + currentTagIndex;
                  setAllTagImages(prev => {
                      const clone = [...prev];
                      while(clone.length <= globalIndex) clone.push("");
                      clone[globalIndex] = result;
                      return clone;
                  });
              }
          };
          reader.readAsDataURL(file);
      }
      e.target.value = '';
  };

  const handlePrePrint = () => {
      setShowInstructionModal(true);
  };

  const handleConfirmPrint = () => {
      setShowInstructionModal(false);
      
      if (isMultiItemFormat && totalPages > 1) {
          const allPages = Array.from({ length: totalPages }, (_, i) => i);
          setSheetsToPrint(allPages);
      } else {
          setSheetsToPrint([currentSheetPage]);
      }
      
      setPrintRenderKey(p => p + 1); 
      setShowPrintModal(true);
  };

  useEffect(() => {
    if (showPrintModal) {
        generatePreviews();
    } else {
        setPdfPreviews([]);
    }
  }, [showPrintModal, showBorders, data, printRenderKey, currentSheetPage]);

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
        await new Promise(resolve => setTimeout(resolve, 1500)); 
        const sheet1 = exportRef.current.querySelector('#pdf-sheet-1') as HTMLElement;
        const sheet2 = exportRef.current.querySelector('#pdf-sheet-2') as HTMLElement;
        if (sheet1 && sheet2) {
            const options = { scale: 0.8, useCORS: true, logging: false, backgroundColor: '#ffffff', windowWidth: Math.max(1600, width + 100) };
            const canvas1 = await html2canvas(sheet1, options);
            const canvas2 = await html2canvas(sheet2, options);
            setPdfPreviews([canvas1.toDataURL('image/jpeg', 0.8), canvas2.toDataURL('image/jpeg', 0.8)]);
        }
    } catch (e) { console.error("Preview generation failed", e); } finally { setIsGeneratingPreview(false); }
  };

  useEffect(() => {
    if (!isCrossword) { setEditableMessage(data.message); return; }
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

  const getItemState = (id: string): PositionableItem => {
      if (id === 'wm1') return wmSheet1;
      if (id === 'wm2') return wmSheet2;
      if (id === 'img1') return imgSheet1;
      if (id === 'img2') return imgSheet2;
      if (id === 'txt2') return txtSheet2;
      if (id === 'stickerGroup') return stickerGroup;
      const customTxt = customTexts.find(t => t.id === id);
      if (customTxt) return customTxt;
      return { id, type: 'unknown', x:0, y:0, scale:1 };
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

  const toggleSheetPrintSelection = (index: number) => {
      setSheetsToPrint(prev => {
          if (prev.includes(index)) return prev.filter(i => i !== index);
          return [...prev, index].sort((a,b) => a-b);
      });
  };

  const handleDownloadPDF = async (directPrint = false) => {
      if (!exportRef.current) return;
      if (sheetsToPrint.length === 0) { alert("Seleziona almeno un foglio da stampare."); return; }

      const startPage = currentSheetPage;

      setIsGeneratingPDF(true);
      const width = formatConfig.pdfWidth;
      exportRef.current.style.width = `${width}px`;
      
      try {
        // @ts-ignore
        const doc = new jsPDF({ orientation: formatConfig.pdfOrientation, unit: 'mm', format: formatConfig.pdfFormat });
        const pdfWidth = doc.internal.pageSize.getWidth();
        const pdfHeight = doc.internal.pageSize.getHeight();
        
        let pageCount = 0;
        for (const actualPageIndex of sheetsToPrint) {
             
             if (isMultiItemFormat) {
                 setCurrentSheetPage(actualPageIndex);
                 // Increased delay to allow heavy images to load (2 seconds per page)
                 await new Promise(resolve => setTimeout(resolve, 2000)); 
             }

             // Extra wait for DOM stability
             await new Promise(resolve => setTimeout(resolve, 500));

             const sheet1 = exportRef.current.querySelector('#pdf-sheet-1') as HTMLElement;
             const sheet2 = exportRef.current.querySelector('#pdf-sheet-2') as HTMLElement;
             if (!sheet1 || !sheet2) throw new Error("Elements not found");

             const options = { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff', windowWidth: Math.max(1600, width + 100) };
             const canvas1 = await html2canvas(sheet1, options);
             const canvas2 = await html2canvas(sheet2, options);
             
             if (pageCount > 0) doc.addPage();
             doc.addImage(canvas1.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, pdfWidth, pdfHeight);
             doc.addPage();
             doc.addImage(canvas2.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, pdfWidth, pdfHeight);
             
             pageCount++;
        }

        if (directPrint) {
            doc.autoPrint(); 
            const blob = doc.output('blob');
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank'); 
        } else {
            doc.save(`${data.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`);
        }
        
        if (isMultiItemFormat) {
            setCurrentSheetPage(startPage);
        }
        setShowPrintModal(false);
      } catch (e) { console.error("PDF Error", e); alert("Errore PDF. Riduci il numero di pagine."); } finally { setIsGeneratingPDF(false); }
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
    const formats: CardFormat[] = ['a4', 'a3', 'square', 'tags', 'a6_2x'];
    const currentIndex = formats.indexOf(data.format || 'a4');
    const nextIndex = (currentIndex + 1) % formats.length;
    onUpdate({ format: formats[nextIndex] });
  };

  const handleGraphicChange = (type: 'photo' | 'sticker' | 'watermark' | 'brand', value: any) => {
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
     } else if (type === 'brand') {
         const file = value.target.files[0];
         if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const result = e.target?.result as string;
                onUpdate({ images: { ...data.images, brandLogo: result } });
            };
            reader.readAsDataURL(file);
         }
     }
  };

  return (
    <div className="flex flex-col items-center gap-8 w-full pb-20" onClick={handleGlobalClick}>
       
       <div className="flex flex-wrap gap-2 justify-center z-20 sticky top-2 p-2 bg-black/5 rounded-full backdrop-blur-sm shadow-xl border border-white/10" onClick={(e) => e.stopPropagation()}>
            <button onClick={onEdit} className="bg-white px-4 py-2 rounded-full shadow border text-sm flex items-center gap-2 font-bold hover:bg-gray-50 text-gray-700 active:scale-95"><Edit size={16} /> Dati</button>
            <button onClick={() => setShowGraphicsModal(true)} className="bg-white px-3 py-2 rounded-full shadow border text-sm flex items-center gap-2 font-bold hover:bg-pink-50 text-pink-600 active:scale-95 border-pink-200"><Palette size={16} /> Grafica</button>
            {isMultiItemFormat && (
                <div className="flex bg-gray-100 rounded-full p-1 border border-gray-300">
                    <input 
                        type="file" 
                        ref={folderInputRef}
                        // @ts-ignore
                        webkitdirectory="" directory="" multiple 
                        accept="image/png, image/jpeg, image/jpg, image/webp"
                        className="hidden" 
                        onChange={handleFolderUpload} 
                    />
                    <input type="file" ref={albumUploadRef} className="hidden" accept=".json" onChange={handleAlbumLoad} />

                    <div className="flex items-center gap-1 mr-2 px-2 border-r border-gray-300">
                        <button onClick={handleFolderUploadTrigger} className="p-2 rounded-full bg-yellow-100 text-yellow-700 hover:bg-yellow-200 shadow-sm" title="Carica Cartella"><FolderInput size={16}/></button>
                        <button onClick={handleAlbumSave} className="p-2 rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200 shadow-sm" title="Salva Album"><Save size={16}/></button>
                        <button onClick={handleAlbumLoadTrigger} className="p-2 rounded-full bg-green-100 text-green-700 hover:bg-green-200 shadow-sm" title="Carica Album"><Upload size={16}/></button>
                        <button onClick={() => setShowHelpModal(true)} className="p-2 rounded-full bg-gray-600 text-white hover:bg-gray-700 shadow-sm animate-pulse" title="Guida"><HelpCircle size={16}/></button>
                    </div>

                    <button onClick={() => setViewMode('single')} className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 transition-all ${viewMode === 'single' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:bg-gray-200'}`}><LayoutTemplate size={14}/> Singolo</button>
                    <button onClick={() => setViewMode('sheets')} className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 transition-all ${viewMode === 'sheets' ? 'bg-white shadow text-purple-600' : 'text-gray-500 hover:bg-gray-200'}`}><Eye size={14}/> FOGLI A4</button>
                </div>
            )}
            <button onClick={toggleFormat} className="bg-white px-3 py-2 rounded-full shadow border text-sm flex items-center gap-2 font-bold hover:bg-blue-50 text-blue-700 active:scale-95 border-blue-200" title="Cambia formato"><BoxSelect size={16}/> {data.format === 'square' ? 'Quadrato' : data.format === 'tags' ? 'Bigliettini' : data.format === 'a6_2x' ? 'Mini (2 su 1)' : (data.format || 'a4').toUpperCase()}</button>
            <button onClick={addCustomText} className="bg-white px-3 py-2 rounded-full shadow border text-sm flex items-center gap-2 font-bold hover:bg-purple-50 text-purple-700 active:scale-95 border-purple-200"><Type size={16}/> Testo</button>
            {isCrossword && <button onClick={() => setRevealAnswers(!revealAnswers)} className={`px-4 py-2 rounded-full shadow border text-sm flex items-center gap-2 font-bold active:scale-95 ${revealAnswers ? 'bg-yellow-100 text-yellow-800' : 'bg-white text-gray-700'}`}>{revealAnswers ? <EyeOff size={16}/> : <Eye size={16}/>}</button>}
            <button onClick={handlePrePrint} disabled={isGeneratingPDF} className={`text-white px-6 py-2 rounded-full shadow-lg text-sm flex items-center gap-2 font-bold active:scale-95 ${isGeneratingPDF ? 'bg-gray-400' : 'bg-gradient-to-r from-green-600 to-emerald-600'}`}>{isGeneratingPDF ? <Loader2 size={16} className="animate-spin"/> : <Printer size={16} />} ANTEPRIMA E STAMPA</button>
       </div>

       {showInstructionModal && (
           <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in" onClick={() => setShowInstructionModal(false)}>
               <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg border-l-4 border-yellow-500" onClick={e => e.stopPropagation()}>
                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-gray-800"><FileWarning className="text-yellow-500" size={28}/> Istruzioni di Stampa</h3>
                    <p className="text-sm text-gray-600 mb-4">Per evitare sprechi, imposta correttamente la tua stampante:</p>
                    
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-3 mb-6">
                        <div className="flex justify-between border-b pb-2">
                            <span className="text-gray-500 text-sm">Formato Scelto:</span>
                            <span className="font-bold text-gray-800">{formatConfig.label}</span>
                        </div>
                        <div className="flex justify-between border-b pb-2">
                            <span className="text-gray-500 text-sm">Orientamento Carta:</span>
                            <span className="font-bold text-gray-800">{formatConfig.pdfOrientation === 'l' ? 'Orizzontale (Landscape)' : 'Verticale (Portrait)'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-500 text-sm">Fronte/Retro:</span>
                            <span className={`font-bold px-2 py-1 rounded text-white text-xs uppercase ${formatConfig.pdfOrientation === 'l' ? 'bg-blue-600' : 'bg-purple-600'}`}>
                                {formatConfig.pdfOrientation === 'l' ? 'LATO CORTO' : 'LATO LUNGO (Standard)'}
                            </span>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button onClick={() => setShowInstructionModal(false)} className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-100 rounded-lg">Indietro</button>
                        <button onClick={handleConfirmPrint} className="flex-1 py-3 bg-gray-900 text-white rounded-lg font-bold hover:bg-black">Ho Capito, Procedi</button>
                    </div>
               </div>
           </div>
       )}

       {showHelpModal && (
           <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in" onClick={() => setShowHelpModal(false)}>
               <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg overflow-y-auto max-h-[90vh]" onClick={e => e.stopPropagation()}>
                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-gray-800 border-b pb-2"><HelpCircle className="text-blue-500"/> Guida all'Uso</h3>
                    <div className="space-y-6">
                        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                            <h4 className="font-bold text-yellow-800 mb-2 flex items-center gap-2"><FolderInput size={18}/> 1. Caricamento Cartella (96 Foto)</h4>
                            <p className="text-sm text-yellow-900 mb-2"><strong>Problema:</strong> "Vedo la cartella vuota quando la seleziono!"</p>
                            <p className="text-sm text-yellow-900 mb-2"><strong>Soluzione:</strong> È normale! Il computer ti chiede di scegliere il <u>contenitore</u>, non i file.</p>
                        </div>
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                            <h4 className="font-bold text-blue-800 mb-2 flex items-center gap-2"><Save size={18}/> 2. Salva e Carica Album (.JSON)</h4>
                            <p className="text-sm text-blue-900 mb-2">Per non dover ricaricare le 96 foto ogni volta.</p>
                        </div>
                    </div>
                    <button onClick={() => setShowHelpModal(false)} className="w-full mt-6 py-3 bg-gray-800 text-white rounded-lg font-bold hover:bg-gray-900 transition-colors">Ho Capito, Chiudi</button>
               </div>
           </div>
       )}

       {showGraphicsModal && (
           <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in" onClick={() => setShowGraphicsModal(false)}>
               <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Palette className="text-pink-500"/> Modifica Grafica</h3>
                    <div className="space-y-4">
                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                            <label className="text-xs font-bold text-gray-500 uppercase mb-2 block flex items-center gap-2"><ImagePlus size={14}/> Cambia Foto {isMultiItemFormat ? '(Copertina)' : ''}</label>
                            <input type="file" accept="image/*" className="text-sm w-full file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-pink-50 file:text-pink-700 hover:file:bg-pink-100" onChange={(e) => handleGraphicChange('photo', e)}/>
                        </div>
                        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                            <label className="text-xs font-bold text-blue-600 uppercase mb-2 block flex items-center gap-2"><Stamp size={14}/> Logo/Firma (Retro)</label>
                            <input type="file" accept="image/*" className="text-sm w-full file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200" onChange={(e) => handleGraphicChange('brand', e)}/>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                             <div className="flex justify-between items-center mb-2"><label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2"><SmilePlus size={14}/> Stickers ({data.stickers?.length || 0}/5)</label></div>
                             <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">{STICKER_OPTIONS.map(s => (<button key={s} onClick={() => handleGraphicChange('sticker', s)} className={`text-xl p-1 rounded hover:bg-gray-200 ${data.stickers?.includes(s) ? 'bg-blue-100 ring-1 ring-blue-300' : ''}`}>{s}</button>))}</div>
                        </div>
                        <button onClick={() => handleGraphicChange('watermark', null)} className={`w-full py-2 rounded-lg font-bold border flex items-center justify-center gap-2 ${data.hasWatermark ? 'bg-blue-50 border-blue-300 text-blue-600' : 'bg-white border-gray-300 text-gray-500'}`}>Filigrana: {data.hasWatermark ? 'SI' : 'NO'}</button>
                    </div>
                    {/* Pulsante Cornice VISIBILE per tutti TRANNE tags */}
                    {data.format !== 'tags' && (
                        <button onClick={() => setShowBorders(!showBorders)} className={`w-full mt-2 py-2 rounded-lg font-bold border flex items-center justify-center gap-2 ${showBorders ? 'bg-blue-50 border-blue-300 text-blue-600' : 'bg-white border-gray-300 text-gray-500'}`}>{showBorders ? <CheckCircle2 size={16}/> : <div className="w-4 h-4 rounded-full border border-gray-400"/>} Cornice Decorativa</button>
                    )}
                    <button onClick={() => setShowGraphicsModal(false)} className="w-full mt-4 py-2 bg-gray-800 text-white rounded-lg font-bold">Chiudi</button>
               </div>
           </div>
       )}

       {/* ... rest of JSX remains same (PrintTemplates call, etc.) ... */}
       <PrintTemplates 
            ref={exportRef}
            data={data}
            themeAssets={themeAssets}
            formatConfig={formatConfig}
            grid={grid}
            wmSheet1={wmSheet1}
            wmSheet2={wmSheet2}
            imgSheet2={imgSheet2}
            txtSheet2={txtSheet2}
            stickerGroup={stickerGroup}
            customTexts={customTexts}
            printRenderKey={printRenderKey}
            currentSheetPage={currentSheetPage}
            tagVariations={tagVariations}
            tagMessages={tagMessages}
            // Passiamo gli array completi per la stampa massiva
            allTagImages={allTagImages}
            // ---
            showBorders={showBorders}
            isCrossword={isCrossword}
            photos={photos}
            currentYear={currentYear}
            editableMessage={editableMessage}
            pdfScaleFactor={pdfScaleFactor}
       />
    </div>
  );
};

export default CrosswordGrid;
