import React, { useState, useEffect, useRef } from 'react';
import { CrosswordData, CellData, Direction, ThemeType, CardFormat } from '../types';
import { Printer, Edit, Eye, EyeOff, CheckCircle2, Palette, Download, Loader2, XCircle, Maximize, Info, Type, Grip, ArrowRightLeft, Pencil, BoxSelect, ImagePlus, SmilePlus, ChevronLeft, ChevronRight, LayoutTemplate, Camera, FolderInput, Save, Upload, HelpCircle, Stamp } from 'lucide-react';
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
    christmas: [
        "Ti auguro un Natale pieno di gioia.", "Che la magia delle feste illumini i tuoi giorni.", "Un piccolo dono per un grande sorriso.",
        "Pace, amore e felicità.", "Che il nuovo anno ti porti gioia.", "Brindiamo a nuovi inizi!", "Un pensiero speciale per te.",
        "Buone Feste!", "Auguri di cuore.", "Serenità e amore.", "Buon Natale!", "Felice Anno Nuovo",
        "Sotto l'albero tanta felicità.", "Che sia un Natale indimenticabile.", "Sorrisi e abbracci per te.", "Calore, luci e magia.",
        "Un dolce pensiero natalizio.", "A te che sei speciale, Buon Natale.", "Giorni felici e luminosi.", "Brilla come una stella di Natale.",
        "Possa questo dono portarti gioia.", "Auguri scintillanti!", "Con tutto il mio affetto.", "Magia pura per questo Natale.",
        "Che i tuoi sogni si avverino.", "Un abbraccio festoso.", "Cin cin alla felicità!", "Ricordi felici e futuri radiosi.",
        "Biscotti, amore e fantasia.", "Un regalo fatto col cuore.", "La gioia è nel donare.", "Per un Natale meraviglioso.",
        "Pace in terra e nel tuo cuore.", "Scarta la felicità!", "Auguri di buone vacanze.", "Riposo, relax e regali.",
        "Che la festa abbia inizio!", "Un pensiero solo per te.", "Sei nella mia lista dei buoni.", "Auguri grandissimi!",
        "Felicità formato regalo.", "Sorprese sotto l'albero.", "Un Natale da favola.", "Momenti preziosi.",
        "Luci, colori e allegria.", "Il regalo più bello sei tu.", "Grazie di esserci sempre.", "Buon Natale e felice anno!"
    ],
    birthday: ["Buon Compleanno!", "Tanti auguri di felicità.", "Un anno in più, sempre fantastico!", "Festeggia alla grande.", "Sorprese bellissime in arrivo."],
    generic: ["Un pensiero per te.", "Con i migliori auguri.", "Spero ti piaccia!", "Tanta felicità.", "Auguri sinceri."]
};

const STICKER_OPTIONS = ['🎅', '🎄', '🎁', '❄️', '⛄', '🎂', '🎈', '🎉', '🕯️', '🍰', '💍', '❤️', '💐', '🎃', '👻', '🎓', '🏆', '⚽', '🐶', '🐱', '⭐', '✨'];

const FORMAT_CONFIG: Record<CardFormat, { label: string, cssAspect: string, width: number, height: number, pdfFormat: any, pdfOrientation: 'p' | 'l', pdfWidth: number, pdfHeight: number }> = {
    'a4': { label: 'A4 Standard', cssAspect: 'aspect-[297/210]', width: 1123, height: 794, pdfFormat: 'a4', pdfOrientation: 'l', pdfWidth: 1123, pdfHeight: 794 },
    'a3': { label: 'A3 Maxi', cssAspect: 'aspect-[297/210]', width: 1587, height: 1123, pdfFormat: 'a3', pdfOrientation: 'l', pdfWidth: 1587, pdfHeight: 1123 },
    'square': { label: 'Quadrato', cssAspect: 'aspect-[2/1]', width: 1134, height: 567, pdfFormat: [300, 150], pdfOrientation: 'l', pdfWidth: 1134, pdfHeight: 567 },
    'tags': { label: 'Bigliettini', cssAspect: 'aspect-[10/7]', width: 500, height: 350, pdfFormat: 'a4', pdfOrientation: 'p', pdfWidth: 794, pdfHeight: 1123 } 
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
  const [showHelpModal, setShowHelpModal] = useState(false);
  
  const [viewMode, setViewMode] = useState<'single' | 'sheets'>('single');

  const inputRefs = useRef<(HTMLInputElement | null)[][]>([]);
  const singleTagFileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const albumUploadRef = useRef<HTMLInputElement>(null);

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
  const isCrossword = data.type === 'crossword' && data.format !== 'square' && data.format !== 'tags';
  const photos = data.images?.photos || [];
  const currentYear = new Date().getFullYear();
  const formatConfig = FORMAT_CONFIG[data.format || 'a4'];

  const totalPages = Math.ceil(Math.max(allTagImages.length, 8) / 8);

  useEffect(() => {
      const hasThemeChanged = prevDataRef.current.theme !== data.theme;
      const hasFormatChanged = prevDataRef.current.format !== data.format;
      
      if (hasThemeChanged || hasFormatChanged) {
          setAllTagImages([]);
          setCurrentSheetPage(0);
          setTagMessages([]);
          prevDataRef.current = data;
      }
      
      if (data.format === 'tags' && allTagImages.length === 0) {
           setAllTagImages(Array(8).fill(""));
      }
  }, [data.format, data.theme]);

  useEffect(() => {
      if (data.format !== 'tags') {
          setViewMode('single');
          return;
      }
      
      if (allTagImages.length > 0 && tagMessages.length < allTagImages.length) {
          const themeMessages = TAG_MESSAGES_DB[data.theme] || TAG_MESSAGES_DB.generic;
          let messagePool: string[] = [];
          while (messagePool.length < allTagImages.length) {
              messagePool = [...messagePool, ...shuffleArray(themeMessages)];
          }
          const currentLength = tagMessages.length;
          const needed = allTagImages.length - currentLength;
          const existing = [...tagMessages];
          const newPart = messagePool.slice(0, needed);
          setTagMessages([...existing, ...newPart]);

      } else if (tagMessages.length === 0 && allTagImages.length > 0) {
          const themeMessages = TAG_MESSAGES_DB[data.theme] || TAG_MESSAGES_DB.generic;
          let messagePool: string[] = [];
          while (messagePool.length < allTagImages.length) {
              messagePool = [...messagePool, ...shuffleArray(themeMessages)];
          }
          setTagMessages(messagePool.slice(0, allTagImages.length));
      }
      
      const startIdx = currentSheetPage * 8;
      const pageImages = allTagImages.slice(startIdx, startIdx + 8);
      while(pageImages.length < 8) pageImages.push("");

      const newVars = pageImages.map((img, i) => {
          let title = "Auguri!";
          const absoluteIndex = startIdx + i;
          if (data.theme === 'christmas') {
              title = (absoluteIndex % 8) < 4 ? "Buon Natale" : "Buone Feste";
          } else {
              title = data.title || "Auguri";
          }
          return { img, title };
      });
      setTagVariations(newVars);

  }, [allTagImages, currentSheetPage, data.format, data.theme, data.title, tagMessages.length]); 

  useEffect(() => {
    if (editableMessage !== data.message) {
        onUpdate({ message: editableMessage });
    }
  }, [editableMessage]);

  const handleTagMessageChange = (newMsg: string) => {
      const newMessages = [...tagMessages];
      const globalIndex = (currentSheetPage * 8) + currentTagIndex;
      newMessages[globalIndex] = newMsg;
      setTagMessages(newMessages);
  };

  const handleSingleTagUploadTrigger = () => {
      singleTagFileInputRef.current?.click();
  };

  const handleFolderUploadTrigger = () => {
      folderInputRef.current?.click();
  };
  
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

  const handleAlbumLoadTrigger = () => {
      albumUploadRef.current?.click();
  };

  const handleAlbumLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file)
