import React, { useState, useEffect } from 'react';
import { generateCrossword } from '../services/geminiService';
import { CrosswordData, ManualInput, ThemeType } from '../types';
import { Loader2, Wand2, Plus, Trash2, Gift, PartyPopper, CalendarHeart, Crown, KeyRound, Image as ImageIcon, Upload, Calendar, AlertCircle, Grid3X3, MailOpen, Images, Ghost, GraduationCap, ScrollText, HeartHandshake, BookOpen, Search, X } from 'lucide-react';

interface CreatorProps {
  onCreated: (data: CrosswordData) => void;
  initialData?: CrosswordData | null;
}

const THEMES: { id: ThemeType; label: string; icon: any; color: string }[] = [
  { id: 'christmas', label: 'Natale', icon: Gift, color: 'bg-red-600' },
  { id: 'birthday', label: 'Compleanno', icon: PartyPopper, color: 'bg-pink-500' },
  { id: 'easter', label: 'Pasqua', icon: CalendarHeart, color: 'bg-green-400' },
  { id: 'halloween', label: 'Halloween', icon: Ghost, color: 'bg-orange-500' },
  { id: 'graduation', label: 'Laurea', icon: GraduationCap, color: 'bg-red-700' },
  { id: 'confirmation', label: 'Cresima', icon: BookOpen, color: 'bg-indigo-400' },
  { id: 'communion', label: 'Comunione', icon: ScrollText, color: 'bg-yellow-500' },
  { id: 'wedding', label: 'Matrimonio', icon: HeartHandshake, color: 'bg-rose-400' },
  { id: 'elegant', label: 'Elegante', icon: Crown, color: 'bg-gray-800' },
];

// DATASET COMPLETO STICKERS
const STICKER_DATA = [
    // NATALE
    { char: '🎅', tags: 'natale babbo christmas santa festa' },
    { char: '🎄', tags: 'natale albero tree christmas festa' },
    { char: '🎁', tags: 'regalo pacco dono gift natale compleanno festa' },
    { char: '❄️', tags: 'neve freddo inverno snow natale' },
    { char: '⛄', tags: 'pupazzo neve inverno natale' },
    { char: '🦌', tags: 'renna rudolph animale natale' },
    { char: '🧦', tags: 'calza epifania befana natale' },
    { char: '🍪', tags: 'biscotto cibo dolce natale' },
    { char: '🥛', tags: 'latte cibo natale' },
    { char: '🔔', tags: 'campana natale' },
    { char: '🕯️', tags: 'candela luce natale religione preghiera' },
    { char: '🌟', tags: 'stella star natale luce' },
    
    // COMPLEANNO
    { char: '🎂', tags: 'torta compleanno cibo dolce festa auguri' },
    { char: '🎈', tags: 'palloncino festa compleanno party' },
    { char: '🎉', tags: 'festa coriandoli party compleanno capodanno' },
    { char: '🍰', tags: 'fetta torta dolce cibo' },
    { char: '🥳', tags: 'festa faccina party felice' },
    { char: '👑', tags: 'corona re regina principessa' },
    { char: '🧢', tags: 'cappello festa' },
    { char: '🎺', tags: 'tromba musica festa' },
    { char: '🎊', tags: 'coriandoli festa' },

    // PASQUA
    { char: '🐣', tags: 'pulcino pasqua animale uovo' },
    { char: '🌸', tags: 'fiore primavera pasqua natura' },
    { char: '🐇', tags: 'coniglio pasqua animale' },
    { char: '🥚', tags: 'uovo pasqua cibo' },
    { char: '🌷', tags: 'tulipano fiore primavera pasqua' },
    { char: '🍫', tags: 'cioccolato cibo dolce pasqua' },
    { char: '🌻', tags: 'girasole fiore natura' },
    { char: '🐞', tags: 'coccinella fortuna natura' },
    { char: '🦋', tags: 'farfalla natura primavera' },
    { char: '🌱', tags: 'germoglio natura primavera' },
    { char: '🕊️', tags: 'colomba pace pasqua cresima religione' },

    // HALLOWEEN
    { char: '🎃', tags: 'zucca halloween paura' },
    { char: '👻', tags: 'fantasma halloween paura spirito' },
    { char: '🕷️', tags: 'ragno halloween insetto' },
    { char: '🕸️', tags: 'ragnatela halloween' },
    { char: '🧛', tags: 'vampiro halloween dracula' },
    { char: '🍬', tags: 'caramella dolcetto cibo halloween' },
    { char: '🦇', tags: 'pipistrello halloween animale' },
    { char: '💀', tags: 'teschio scheletro halloween morte' },
    { char: '🌙', tags: 'luna notte halloween' },
    { char: '🐈‍⬛', tags: 'gatto nero sfortuna halloween animale' },
    { char: '🧙‍♀️', tags: 'strega halloween magia' },

    // LAUREA
    { char: '🎓', tags: 'laurea tocco scuola università' },
    { char: '📜', tags: 'pergamena diploma laurea documento' },
    { char: '🏆', tags: 'coppa trofeo vittoria successo' },
    { char: '📚', tags: 'libri studio scuola' },
    { char: '🦉', tags: 'gufo saggezza laurea' },
    { char: '✏️', tags: 'matita scuola disegno' },
    { char: '🧠', tags: 'cervello mente studio' },
    { char: '💼', tags: 'borsa lavoro business' },
    { char: '🥇', tags: 'medaglia primo vittoria' },
    { char: '🏫', tags: 'scuola università edificio' },
    { char: '👩‍🎓', tags: 'laureata donna scuola' },
    { char: '👨‍🎓', tags: 'laureato uomo scuola' },

    // RELIGIOSI (Cresima/Comunione)
    { char: '✝️', tags: 'croce religione gesù chiesa' },
    { char: '⛪', tags: 'chiesa religione edificio' },
    { char: '🥖', tags: 'pane cibo comunione' },
    { char: '🍇', tags: 'uva vino cibo comunione' },
    { char: '👼', tags: 'angelo religione bambino' },
    { char: '🙌', tags: 'mani preghiera religione' },
    { char: '🛐', tags: 'preghiera religione' },
    { char: '🌅', tags: 'alba sole luce' },
    { char: '💒', tags: 'matrimonio chiesa amore' },

    // MATRIMONIO / AMORE
    { char: '💍', tags: 'anello matrimonio fidanzamento gioiello' },
    { char: '❤️', tags: 'cuore amore love rosso' },
    { char: '👰', tags: 'sposa matrimonio donna' },
    { char: '🤵', tags: 'sposo matrimonio uomo' },
    { char: '💐', tags: 'fiori mazzo matrimonio' },
    { char: '💌', tags: 'lettera amore posta invito' },
    { char: '💑', tags: 'coppia amore' },
    { char: '🥂', tags: 'brindisi bicchieri cin cin festa' },
    { char: '💞', tags: 'cuori amore' },
    { char: '💘', tags: 'cuore freccia amore san valentino' },

    // ANIMALI
    { char: '🐶', tags: 'cane animale cucciolo' },
    { char: '🐱', tags: 'gatto animale micio' },
    { char: '🦄', tags: 'unicorno fantasia cavallo' },
    { char: '🦁', tags: 'leone animale savana' },
    { char: '🐢', tags: 'tartaruga animale' },
    { char: '🦖', tags: 'dinosauro animale' },
    { char: '🐬', tags: 'delfino mare animale' },
    { char: '🐼', tags: 'panda animale' },
    { char: '🐨', tags: 'koala animale' },

    // CIBO & DRINK
    { char: '🍕', tags: 'pizza cibo fame italia' },
    { char: '🍔', tags: 'hamburger cibo panino' },
    { char: '🍟', tags: 'patatine cibo' },
    { char: '🍦', tags: 'gelato dolce estate' },
    { char: '🍩', tags: 'ciambella dolce' },
    { char: '🍫', tags: 'cioccolato dolce' },
    { char: '🍷', tags: 'vino bicchiere alcool' },
    { char: '🍺', tags: 'birra alcool' },
    { char: '☕', tags: 'caffe colazione tazza' },
    { char: '🍹', tags: 'cocktail drink estate' },
    { char: '🍓', tags: 'fragola frutta' },

    // SPORT & HOBBY
    { char: '⚽', tags: 'calcio pallone sport' },
    { char: '🏀', tags: 'basket pallone sport' },
    { char: '🎾', tags: 'tennis sport' },
    { char: '🏐', tags: 'pallavolo sport' },
    { char: '🎮', tags: 'gioco videogiochi controller' },
    { char: '🎨', tags: 'arte pittura colori' },
    { char: '🎸', tags: 'chitarra musica strumento' },
    { char: '✈️', tags: 'aereo viaggio vacanza' },
    { char: '🚗', tags: 'auto macchina viaggio' },
    { char: '🏖️', tags: 'spiaggia mare vacanza' },
    { char: '📸', tags: 'foto camera fotografia' },
    { char: '🚲', tags: 'bici sport' },
    { char: '🎵', tags: 'nota musica canzone' },
    { char: '🎶', tags: 'note musica' },

    // SIMBOLI
    { char: '⭐', tags: 'stella star' },
    { char: '✨', tags: 'scintille magia' },
    { char: '💫', tags: 'stella scia' },
    { char: '💎', tags: 'diamante gioiello ricchezza' },
    { char: '⚜️', tags: 'giglio elegante' },
    { char: '🍀', tags: 'fortuna quadrifoglio' },
    { char: '☀️', tags: 'sole estate caldo' },
    { char: '💣', tags: 'bomba esplosione' },
    { char: '💯', tags: 'cento voto perfetto' }
];

export const Creator: React.FC<CreatorProps> = ({ onCreated, initialData }) => {
  const [contentType, setContentType] = useState<'crossword' | 'simple'>('crossword');
  const [mode, setMode] = useState<'ai' | 'manual'>('ai');
  const [theme, setTheme] = useState<ThemeType>('christmas');
  
  // Basic Data
  const [topic, setTopic] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [hiddenSolution, setHiddenSolution] = useState('');

  // Visual Assets
  const [extraImage, setExtraImage] = useState<string | undefined>(undefined);
  const [photos, setPhotos] = useState<string[]>([]); 
  const [selectedStickers, setSelectedStickers] = useState<string[]>([]);

  // Search Sticker State
  const [stickerSearch, setStickerSearch] = useState('');

  // States
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  // Image Processing State - More detailed
  const [processingState, setProcessingState] = useState<{
      active: boolean;
      type: 'extra' | 'photo' | null;
      current: number;
      total: number;
  }>({ active: false, type: null, current: 0, total: 0 });

  // Manual Words
  const [manualWords, setManualWords] = useState<ManualInput[]>([
    { word: '', clue: '' },
    { word: '', clue: '' },
    { word: '', clue: '' }
  ]);

  // INITIALIZATION FOR EDIT MODE
  useEffect(() => {
    if (initialData) {
        setContentType(initialData.type);
        setRecipientName(initialData.recipientName);
        setEventDate(initialData.eventDate);
        setTheme(initialData.theme);
        setExtraImage(initialData.images?.extraImage);
        setPhotos(initialData.images?.photos || []);
        setSelectedStickers(initialData.stickers || []);
        
        if (initialData.type === 'crossword') {
            if (initialData.originalMode) setMode(initialData.originalMode);
            if (initialData.originalHiddenSolution) setHiddenSolution(initialData.originalHiddenSolution);
            
            if (initialData.originalMode === 'manual' && Array.isArray(initialData.originalInput)) {
                setManualWords(initialData.originalInput as ManualInput[]);
            } else if (typeof initialData.originalInput === 'string') {
                setTopic(initialData.originalInput);
            }
        }
    }
  }, [initialData]);

  // --- IMAGE PROCESSING HELPERS ---
  const processImageFile = (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (event) => {
              const img = new Image();
              img.onload = () => {
                  const canvas = document.createElement('canvas');
                  let width = img.width;
                  let height = img.height;
                  
                  // Resize logic: Ottimizzato per 9 foto.
                  // 800px è sufficiente per la stampa in collage e riduce drasticamente l'uso di memoria.
                  const MAX_SIZE = 800;
                  if (width > MAX_SIZE || height > MAX_SIZE) {
                      if (width > height) {
                          height *= MAX_SIZE / width;
                          width = MAX_SIZE;
                      } else {
                          width *= MAX_SIZE / height;
                          height = MAX_SIZE;
                      }
                  }
                  
                  canvas.width = width;
                  canvas.height = height;
                  const ctx = canvas.getContext('2d');
                  if (!ctx) { reject("Canvas error"); return; }
                  
                  // Sfondo bianco per PNG trasparenti convertiti in JPEG
                  ctx.fillStyle = "#FFFFFF";
                  ctx.fillRect(0, 0, width, height);
                  ctx.drawImage(img, 0, 0, width, height);
                  
                  // Compress to JPEG 0.70 for balance and stability with 9 photos
                  const dataUrl = canvas.toDataURL('image/jpeg', 0.70);
                  resolve(dataUrl);
              };
              img.onerror = () => reject("Image load error");
              img.src = event.target?.result as string;
          };
          reader.onerror = () => reject("File read error");
          reader.readAsDataURL(file);
      });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'extra' | 'photo') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Reset error
    setError(null);
    const fileArray = Array.from(files);
    
    // Determine files to process based on limits
    let filesToProcess = fileArray;
    if (type === 'photo') {
        // Max 9 total
        const remainingSlots = 9 - photos.length;
        if (remainingSlots <= 0) {
            setError("Hai già raggiunto il limite di 9 foto.");
            return;
        }
        filesToProcess = fileArray.slice(0, remainingSlots);
    } else {
        filesToProcess = [fileArray[0]]; // Single file for extra
    }

    // Set Loading State
    setProcessingState({
        active: true,
        type,
        current: 0,
        total: filesToProcess.length
    });

    const newPhotos: string[] = [];

    // SEQUENTIAL PROCESSING LOOP (Crucial for performance)
    for (let i = 0; i < filesToProcess.length; i++) {
        setProcessingState(prev => ({ ...prev, current: i + 1 }));
        
        try {
            // Piccolo delay per permettere alla UI di aggiornarsi e al GC di respirare
            await new Promise(r => setTimeout(r, 100));
            
            const dataUrl = await processImageFile(filesToProcess[i]);
            
            if (type === 'extra') {
                setExtraImage(dataUrl);
            } else {
                newPhotos.push(dataUrl);
            }
        } catch (err) {
            console.error(`Errore caricamento foto ${i+1}:`, err);
            // Non blocchiamo tutto, ma notifichiamo alla fine se necessario
        }
    }

    if (type === 'photo' && newPhotos.length > 0) {
        setPhotos(prev => [...prev, ...newPhotos].slice(0, 9));
    }

    if (newPhotos.length < filesToProcess.length && type === 'photo') {
        setError("Alcune foto non sono state caricate correttamente (memoria piena?). Riprova con meno foto alla volta.");
    }

    // Reset Loading State
    setProcessingState({ active: false, type: null, current: 0, total: 0 });
    // Reset input value to allow re-uploading same file if needed
    e.target.value = '';
  };

  const toggleSticker = (sticker: string) => {
    if (selectedStickers.includes(sticker)) {
      setSelectedStickers(selectedStickers.filter(s => s !== sticker));
    } else {
      if (selectedStickers.length < 5) {
        setSelectedStickers([...selectedStickers, sticker]);
      }
    }
  };

  const removeImage = (type: 'extra' | 'photo') => {
      if (type === 'extra') setExtraImage(undefined);
      else setPhotos([]);
  };

  const addRow = () => setManualWords([...manualWords, { word: '', clue: '' }]);
  const removeRow = (index: number) => {
    if (manualWords.length <= 2) return;
    const newWords = [...manualWords];
    newWords.splice(index, 1);
    setManualWords(newWords);
  };
  const handleManualChange = (index: number, field: keyof ManualInput, value: string) => {
    const newWords = [...manualWords];
    newWords[index] = { ...newWords[index], [field]: value };
    setManualWords(newWords);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || processingState.active) return; 
    
    setLoading(true);
    setStatusMsg(contentType === 'crossword' ? "Costruisco la griglia..." : "Creo il biglietto...");
    setError(null);

    try {
      let inputData: string | ManualInput[] = topic;
      
      // Validazione specifica per cruciverba
      if (contentType === 'crossword') {
          if (mode === 'manual') {
            const validWords = manualWords.filter(w => w.word.trim() && w.clue.trim());
            if (validWords.length < 2) throw new Error("Inserisci almeno 2 parole complete.");
            inputData = validWords;
          } else {
            if (!topic.trim()) throw new Error("Inserisci un argomento per il cruciverba.");
          }
      }

      if (!recipientName.trim()) throw new Error("Inserisci il nome del festeggiato.");

      const cleanSolution = hiddenSolution.trim().toUpperCase();
      
      const data = await generateCrossword(
        mode, 
        theme, 
        inputData, 
        cleanSolution || undefined,
        {
          recipientName,
          eventDate,
          images: { extraImage, photos },
          stickers: selectedStickers,
          contentType // Passiamo il tipo
        },
        (msg) => setStatusMsg(msg)
      );
      
      onCreated(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Errore. Riprova con meno parole.");
    } finally {
      setLoading(false);
    }
  };

  // Helper per renderizzare l'anteprima del collage
  const renderPhotoPreview = () => {
    const count = photos.length;
    if (count === 0) return null;

    let gridClass = 'grid-cols-1';
    if (count === 2) gridClass = 'grid-cols-2';
    else if (count > 2 && count <= 4) gridClass = 'grid-cols-2';
    else if (count >= 5) gridClass = 'grid-cols-3';

    return (
        <div className={`w-full h-full grid gap-0.5 overflow-hidden bg-gray-100 ${gridClass}`}>
            {photos.map((p, i) => (
                <div key={i} className="relative overflow-hidden w-full h-full">
                    <img src={p} className="w-full h-full object-cover" alt={`foto-${i}`} />
                </div>
            ))}
            {/* Overlay Modifica */}
             <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition-opacity z-10 pointer-events-none">
                {count} Foto - Clicca per aggiungere
             </div>
        </div>
    );
  };

  // Filter Stickers
  const filteredStickers = stickerSearch.trim() === '' 
      ? STICKER_DATA 
      : STICKER_DATA.filter(s => s.tags.includes(stickerSearch.toLowerCase()) || s.char.includes(stickerSearch));

  return (
    <form onSubmit={handleGenerate} className={`max-w-3xl mx-auto bg-white/95 backdrop-blur p-6 md:p-8 rounded-3xl shadow-2xl border-2 border-white/50 relative overflow-hidden transition-all`}>
      
      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 bg-white/95 z-50 flex items-center justify-center backdrop-blur-sm cursor-wait">
             <div className="text-center p-8 bg-white rounded-3xl shadow-xl border-4 border-blue-100 max-w-sm mx-4 animate-in fade-in zoom-in duration-300">
                 <div className="relative mb-4 mx-auto w-16 h-16">
                    <Loader2 className="w-16 h-16 text-blue-600 animate-spin absolute inset-0" />
                    <Gift className="w-6 h-6 text-blue-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                 </div>
                 <h3 className="text-xl font-bold text-gray-800 mb-2">Un attimo...</h3>
                 <p className="text-gray-500 text-sm mb-2">{statusMsg}</p>
                 <div className="w-full bg-gray-200 h-1 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 animate-[pulse_1s_ease-in-out_infinite] w-2/3"></div>
                 </div>
             </div>
        </div>
      )}

      <div className={`transition-opacity duration-500 ${loading ? 'opacity-20 pointer-events-none' : 'opacity-100'}`}>
          <div className="text-center mb-8">
            <h2 className="font-bold text-3xl md:text-4xl text-gray-800 mb-2 font-body">Crea il Tuo Biglietto</h2>
            <p className="text-gray-500">Suite Creativa v6.0 - WOW Edition</p>
          </div>

          {/* 1. Content Type Selection */}
          <div className="mb-6">
            <label className="block text-xs font-bold text-gray-400 mb-3 uppercase tracking-wider text-center">1. Cosa vuoi creare?</label>
            <div className="flex gap-4">
                <button
                   type="button"
                   onClick={() => setContentType('crossword')}
                   className={`flex-1 p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${contentType === 'crossword' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-blue-300'}`}
                >
                    <Grid3X3 size={28} />
                    <span className="font-bold">Cruciverba</span>
                    <span className="text-[10px] uppercase font-bold text-gray-400">Gioco + Auguri</span>
                </button>
                <button
                   type="button"
                   onClick={() => setContentType('simple')}
                   className={`flex-1 p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${contentType === 'simple' ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 hover:border-purple-300'}`}
                >
                    <MailOpen size={28} />
                    <span className="font-bold">Biglietto Classico</span>
                    <span className="text-[10px] uppercase font-bold text-gray-400">Solo Auguri</span>
                </button>
            </div>
          </div>

          {/* 2. Theme */}
          <div className="mb-6">
            <label className="block text-xs font-bold text-gray-400 mb-3 uppercase tracking-wider text-center">2. Evento</label>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTheme(t.id)}
                  className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all ${theme === t.id ? `${t.color} text-white scale-105 shadow-lg` : 'bg-gray-100 hover:bg-gray-200'}`}
                >
                  <t.icon size={20} className="mb-1" />
                  <span className="text-[10px] font-bold">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-xs font-bold text-gray-400 mb-2 uppercase">Per chi è?</label>
              <input 
                  required
                  type="text" 
                  placeholder="Nome (es. Marco)" 
                  className="w-full p-3 border-2 border-gray-200 rounded-xl font-bold focus:border-blue-400 outline-none"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 mb-2 uppercase">Data Evento</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 text-gray-400" size={20} />
                <input 
                    type="text" 
                    placeholder="es. 25 Dicembre 2024" 
                    className="w-full p-3 pl-10 border-2 border-gray-200 rounded-xl font-bold focus:border-blue-400 outline-none"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Mode (ONLY FOR CROSSWORD) */}
          {contentType === 'crossword' && (
              <div className="mb-6 bg-gray-50 p-4 rounded-xl border border-gray-100 animate-fade-in">
                <div className="flex bg-white rounded-lg p-1 mb-4 border border-gray-200 shadow-sm">
                    <button type="button" onClick={() => setMode('ai')} className={`flex-1 py-2 rounded-md font-bold text-sm transition-all ${mode === 'ai' ? 'bg-blue-100 text-blue-700 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>✨ AI Magic</button>
                    <button type="button" onClick={() => setMode('manual')} className={`flex-1 py-2 rounded-md font-bold text-sm transition-all ${mode === 'manual' ? 'bg-blue-100 text-blue-700 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>📝 Manuale</button>
                </div>

                {mode === 'ai' ? (
                    <textarea
                        rows={2}
                        className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                        placeholder="Argomento (es: Zio Carlo, ama la pesca e il vino...)"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                    />
                ) : (
                    <div className="space-y-2">
                        {manualWords.map((item, idx) => (
                            <div key={idx} className="flex gap-2 relative">
                                <div className="relative w-1/3">
                                    <input 
                                        placeholder="PAROLA" 
                                        value={item.word} 
                                        onChange={(e) => handleManualChange(idx, 'word', e.target.value)} 
                                        className="w-full p-2 border rounded-lg font-bold uppercase focus:border-blue-400 outline-none pr-8" 
                                    />
                                    {item.word.length > 0 && (
                                        <span className="absolute right-2 top-2.5 text-[10px] text-gray-400 font-bold">{item.word.length}</span>
                                    )}
                                </div>
                                <input placeholder="Indizio" value={item.clue} onChange={(e) => handleManualChange(idx, 'clue', e.target.value)} className="flex-1 p-2 border rounded-lg focus:border-blue-400 outline-none" />
                                {manualWords.length > 2 && <button type="button" onClick={() => removeRow(idx)}><Trash2 size={18} className="text-gray-400 hover:text-red-500" /></button>}
                            </div>
                        ))}
                        <button type="button" onClick={addRow} className="text-blue-500 text-sm font-bold flex items-center gap-1 mt-2 hover:bg-blue-50 p-2 rounded-lg transition-colors"><Plus size={16}/> Aggiungi riga</button>
                    </div>
                )}
              </div>
          )}

          {/* Solution (ONLY FOR CROSSWORD) */}
          {contentType === 'crossword' && (
              <div className="mb-6 p-3 bg-yellow-50 rounded-xl border border-yellow-200 animate-fade-in">
                  <label className="flex items-center gap-2 text-sm font-bold text-yellow-800 mb-2"><KeyRound size={16}/> Parola Nascosta (Opzionale)</label>
                  <input 
                    type="text" 
                    placeholder="SOLUZIONE SEGRETA" 
                    className="w-full p-2 border border-yellow-300 rounded uppercase font-bold text-center tracking-widest focus:ring-2 focus:ring-yellow-400 outline-none bg-white"
                    value={hiddenSolution}
                    onChange={(e) => setHiddenSolution(e.target.value)}
                    maxLength={15}
                  />
              </div>
          )}

          {/* Visuals */}
          <div className="grid grid-cols-2 gap-4 mb-6">
              {/* Box Logo/Disegno */}
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:bg-gray-50 cursor-pointer relative transition-colors group overflow-hidden h-32 flex items-center justify-center">
                    <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'extra')} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                    {processingState.active && processingState.type === 'extra' ? (
                       <div className="flex flex-col items-center text-blue-500 animate-pulse">
                          <Loader2 className="animate-spin mb-1"/>
                          <span className="text-[10px] font-bold">Elaborazione...</span>
                       </div>
                    ) : extraImage ? (
                        <div className="relative w-full h-full group-hover:scale-95 transition-transform">
                             <img src={extraImage} className="h-full w-full object-contain mx-auto" />
                             <button type="button" onClick={(e) => { e.preventDefault(); removeImage('extra'); }} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 z-20 hover:bg-red-600"><Trash2 size={12}/></button>
                             <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition-opacity">Modifica</div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center group-hover:scale-105 transition-transform">
                             <Upload className="text-gray-400 mb-1"/>
                             <span className="text-[10px] font-bold text-gray-500 uppercase">Logo / Disegno</span>
                        </div>
                    )}
              </div>

              {/* Box Foto Ricordo - COLLAGE ENABLED */}
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-0 text-center hover:bg-gray-50 cursor-pointer relative transition-colors group overflow-hidden h-32 flex items-center justify-center">
                    {/* Input accetta MULTIPLE */}
                    <input type="file" accept="image/*" multiple onChange={(e) => handleImageUpload(e, 'photo')} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                    
                    {processingState.active && processingState.type === 'photo' ? (
                       <div className="flex flex-col items-center text-blue-500 w-full px-4">
                          <Loader2 className="animate-spin mb-1"/>
                          <span className="text-[10px] font-bold block">Elaborazione...</span>
                          <div className="w-full bg-gray-200 h-1.5 rounded-full mt-2 overflow-hidden">
                              <div 
                                className="bg-blue-500 h-full transition-all duration-300"
                                style={{ width: `${(processingState.current / processingState.total) * 100}%` }}
                              ></div>
                          </div>
                          <span className="text-[9px] text-gray-400 mt-1">{processingState.current} di {processingState.total}</span>
                       </div>
                    ) : photos.length > 0 ? (
                        <div className="relative w-full h-full">
                             {renderPhotoPreview()}
                             <button type="button" onClick={(e) => { e.preventDefault(); removeImage('photo'); }} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 z-30 hover:bg-red-600"><Trash2 size={12}/></button>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center group-hover:scale-105 transition-transform p-4">
                             <Images className="text-gray-400 mb-1"/>
                             <span className="text-[10px] font-bold text-gray-500 uppercase">Foto Ricordo (1-9)</span>
                             <span className="text-[8px] text-gray-400">Crea collage automatico</span>
                        </div>
                    )}
              </div>
          </div>

          {/* Stickers Section - RESTORED LAYOUT */}
          <div className="mb-6 bg-gray-50 p-4 rounded-xl border border-gray-100">
             <div className="flex justify-between items-center mb-3">
                <label className="text-xs font-bold text-gray-400 uppercase">Decorazioni</label>
                <span className={`text-xs font-bold ${selectedStickers.length >= 5 ? 'text-red-500' : 'text-blue-500'}`}>
                    {selectedStickers.length}/5
                </span>
             </div>
             
             {/* Sticker Search Bar */}
             <div className="relative mb-4">
                 <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                 <input 
                    type="text" 
                    placeholder="Cerca (es. torta, natale, cuore...)" 
                    className="w-full pl-9 pr-8 py-2 text-sm rounded-lg border border-gray-200 focus:border-blue-400 outline-none bg-white shadow-sm"
                    value={stickerSearch}
                    onChange={(e) => setStickerSearch(e.target.value)}
                 />
                 {stickerSearch && (
                     <button type="button" onClick={() => setStickerSearch('')} className="absolute right-2 top-2 text-gray-400 hover:text-gray-600 p-1">
                         <X size={16}/>
                     </button>
                 )}
             </div>

             <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 justify-items-center max-h-56 overflow-y-auto p-2 bg-white rounded-xl border border-gray-100 custom-scrollbar">
                {filteredStickers.length > 0 ? (
                    filteredStickers.map((s, idx) => (
                        <button 
                            key={`${s.char}-${idx}`} 
                            type="button" 
                            onClick={() => toggleSticker(s.char)} 
                            disabled={!selectedStickers.includes(s.char) && selectedStickers.length >= 5}
                            className={`text-3xl w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-200
                                ${selectedStickers.includes(s.char) ? 'bg-blue-100 shadow-sm scale-110 ring-2 ring-blue-300' : 'hover:bg-gray-100 hover:scale-110'}
                                ${!selectedStickers.includes(s.char) && selectedStickers.length >= 5 ? 'opacity-30 cursor-not-allowed grayscale' : ''}
                            `}
                            title={s.tags}
                        >
                            {s.char}
                        </button>
                    ))
                ) : (
                    <div className="col-span-full text-center py-6 text-gray-400 text-sm italic">
                        Nessuna decorazione trovata per "{stickerSearch}"
                    </div>
                )}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 text-red-700 rounded-xl text-sm mb-4 flex items-center gap-3 border border-red-200 animate-pulse">
               <AlertCircle size={24} className="shrink-0" />
               <div className="font-bold">{error}</div>
            </div>
          )}

          <button
              type="submit"
              disabled={loading || processingState.active}
              className={`w-full py-4 rounded-xl text-white font-bold text-lg shadow-xl flex items-center justify-center gap-2 transition-all active:scale-95 ${loading || processingState.active ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'}`}
            >
              <Wand2 /> {initialData ? "RIGENERA BIGLIETTO" : "GENERA BIGLIETTO"}
          </button>
      </div>
    </form>
  );
};
