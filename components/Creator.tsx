
import React, { useState, useEffect, useRef } from 'react';
import { generateCrossword, regenerateGreetingOptions } from '../services/geminiService';
import { CrosswordData, ManualInput, ThemeType, ToneType, Direction, CardFormat } from '../types';
import { Loader2, Wand2, Plus, Trash2, Gift, PartyPopper, CalendarHeart, Crown, KeyRound, Image as ImageIcon, Upload, Calendar, AlertCircle, Grid3X3, MailOpen, Images, Ghost, GraduationCap, ScrollText, HeartHandshake, BookOpen, Search, X, Smile, Heart, Music, Sparkles, Edit, PenTool, LayoutGrid, Zap, Check, MessageSquareDashed, Info, HelpCircle, Bot, BrainCircuit, Feather, Quote, Briefcase, GraduationCap as GradCap, Puzzle, Stamp, FileBadge, BoxSelect, Tag } from 'lucide-react';

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

const STICKER_CATEGORIES: Record<string, string[]> = {
    'Natale': ['🎅', '🎄', '🎁', '❄️', '⛄', '🦌', '🧦', '🍪', '🥛', '🔔', '🕯️', '🌟'],
    'Feste': ['🎂', '🎈', '🎉', '🕯️', '🍰', '🥳', '🎁', '👑', '🧢', '🎺', '🎊'],
    'Amore': ['💍', '❤️', '👰', '🤵', '💒', '💐', '💌', '💑', '🥂', '💞', '💘'],
    'Pasqua/Primavera': ['🐣', '🌸', '🐇', '🥚', '🌷', '🍫', '🌻', '🐞', '🦋', '🌱', '🕊️'],
    'Halloween': ['🎃', '👻', '🕷️', '🕸️', '🧛', '🍬', '🦇', '💀', '🌙', '🐈‍⬛', '🧙‍♀️'],
    'Scuola/Lavoro': ['🎓', '📜', '🏆', '📚', '🦉', '✏️', '🧠', '💼', '🥇', '🏫', '👩‍🎓', '👨‍🎓'],
    'Religione': ['🕊️', '✝️', '⛪', '🥖', '🍇', '🕯️', '👼', '🙌', '🛐', '🌅', '💒'],
    'Animali': ['🐶', '🐱', '🦄', '🦁', '🐢', '🦖', '🐬', '🌲', '🌵', '🌈', '🐼', '🐨'],
    'Cibo': ['🍕', '🍔', '🍟', '🍦', '🍩', '🍪', '🍫', '🍷', '🍺', '☕', '🍹', '🍓'],
    'Sport/Hobby': ['⚽', '🏀', '🎾', '🏐', '🎮', '🎨', '🎸', '✈️', '🚗', '🏖️', '📸', '🚲'],
    'Extra': ['⭐', '🌟', '✨', '💫', '💎', '⚜️', '🍀', '🎵', '🎶', '☀️', '💣', '💯']
};

const AI_TONES = [
    { id: 'surprise', label: 'Sorpresa', icon: Sparkles, desc: 'Entusiasta e gioioso' },
    { id: 'funny', label: 'Simpatico', icon: Smile, desc: 'Divertente e leggero' },
    { id: 'heartfelt', label: 'Dolce', icon: Heart, desc: 'Affettuoso e commovente' },
    { id: 'rhyme', label: 'Rima', icon: Music, desc: 'In rima baciata o alternata' },
    { id: 'sarcastic', label: 'Sarcastico', icon: Zap, desc: 'Pungente ma scherzoso' },
    { id: 'quotes', label: 'Citazioni', icon: Quote, desc: 'Ispirato a frasi famose' },
    { id: 'poetic', label: 'Poetico', icon: Feather, desc: 'Lirico ed elegante' },
    { id: 'formal', label: 'Formale', icon: Briefcase, desc: 'Classico e rispettoso' },
];

const ACTIVITY_MODULES = [
    { id: 'crossword', label: 'Cruciverba', icon: Grid3X3, desc: 'Parole incrociate personalizzate' },
    { id: 'simple', label: 'Solo Dedica', icon: MailOpen, desc: 'Nessun gioco, solo testo' },
];

const CARD_FORMATS: { id: CardFormat; label: string; desc: string; icon?: any }[] = [
    { id: 'a4', label: 'Standard (A4)', desc: 'Piegato a metà (A5)', icon: BoxSelect },
    { id: 'a3', label: 'Maxi (A3)', desc: 'Stampa grande poster', icon: BoxSelect },
    { id: 'square', label: 'Quadrato', desc: 'Formato moderno (2:1)', icon: BoxSelect },
    { id: 'tags', label: 'Bigliettini', desc: '8x Pacchetti (5x7cm)', icon: Tag },
];

type CreationMode = 'guided' | 'freestyle' | 'manual';

export const Creator: React.FC<CreatorProps> = ({ onCreated, initialData }) => {
  const currentYear = new Date().getFullYear();
  const DEFAULT_DATES: Partial<Record<ThemeType, string>> = {
    christmas: `25 Dicembre`,
    halloween: `31 Ottobre`,
    easter: `Pasqua`,
    birthday: `Oggi`,
    wedding: `Oggi`,
    graduation: `Oggi`
  };

  // State
  const [creationMode, setCreationMode] = useState<CreationMode>('guided');
  const [selectedActivity, setSelectedActivity] = useState<string>('crossword'); 
  
  const [tone, setTone] = useState<ToneType>('surprise');
  const [theme, setTheme] = useState<ThemeType>('christmas');
  const [format, setFormat] = useState<CardFormat>('a4');
  const [hasWatermark, setHasWatermark] = useState(false);
  
  const [topic, setTopic] = useState('');
  
  const [recipientName, setRecipientName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [hiddenSolution, setHiddenSolution] = useState('');

  const [extraImage, setExtraImage] = useState<string | undefined>(undefined);
  const [photos, setPhotos] = useState<string[]>([]); 
  const [brandLogo, setBrandLogo] = useState<string | undefined>(undefined);
  const [selectedStickers, setSelectedStickers] = useState<string[]>([]);
  const [activeStickerTab, setActiveStickerTab] = useState('Natale');

  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const [suggestedPhrases, setSuggestedPhrases] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  // Validation state triggers
  const [showNameError, setShowNameError] = useState(false);
  const [showTopicError, setShowTopicError] = useState(false);
  
  const [processingImg, setProcessingImg] = useState<'extra' | 'photo' | 'brand' | null>(null);

  const [manualWords, setManualWords] = useState<ManualInput[]>([
    { word: '', clue: '' },
    { word: '', clue: '' },
    { word: '', clue: '' }
  ]);

  // REFS FOR VALIDATION
  const nameInputRef = useRef<HTMLInputElement>(null);
  const topicInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (initialData) {
        setSelectedActivity(initialData.type); 
        setRecipientName(initialData.recipientName);
        setEventDate(initialData.eventDate);
        setTheme(initialData.theme);
        setFormat(initialData.format || 'a4');
        setHasWatermark(!!initialData.hasWatermark);
        setExtraImage(initialData.images?.extraImage);
        setPhotos(initialData.images?.photos || []);
        setBrandLogo(initialData.images?.brandLogo);
        setSelectedStickers(initialData.stickers || []);
        
        if (initialData.originalMode === 'manual') {
            setCreationMode('manual');
            if (Array.isArray(initialData.originalInput)) {
                setManualWords(initialData.originalInput as ManualInput[]);
            }
        } else {
            if (initialData.originalTone === 'custom') {
                setCreationMode('freestyle');
                setTopic(initialData.originalCustomTone || (initialData.originalInput as string) || '');
            } else {
                setCreationMode('guided');
                if (initialData.originalTone) setTone(initialData.originalTone);
                setTopic(initialData.originalInput as string || '');
            }
        }
        
        if (initialData.originalHiddenSolution) setHiddenSolution(initialData.originalHiddenSolution);
    } else {
        setRecipientName('');
        setEventDate('');
        setTopic('');
        setHiddenSolution('');
        setExtraImage(undefined);
        setPhotos([]);
        setBrandLogo(undefined);
        setSelectedStickers([]);
        setManualWords([{ word: '', clue: '' }, { word: '', clue: '' }, { word: '', clue: '' }]);
        setCreationMode('guided');
        setSelectedActivity('crossword');
        setHasWatermark(false);
        setFormat('a4');
    }
  }, [initialData]);

  // Gestione Errore Dinamico (Toast a tempo) e Reset bordi rossi
  useEffect(() => {
      if (error) {
          const timer = setTimeout(() => {
              setError(null);
              setShowNameError(false);
              setShowTopicError(false);
          }, 5000);
          return () => clearTimeout(timer);
      }
  }, [error]);

  // Reset visual error on input
  useEffect(() => { if(recipientName) setShowNameError(false); }, [recipientName]);
  useEffect(() => { if(topic) setShowTopicError(false); }, [topic]);

  const handleFormatChange = (newFormat: CardFormat) => {
      setFormat(newFormat);
      // Se si sceglie Quadrato o Bigliettini, si disabilita il cruciverba
      if (newFormat === 'square' || newFormat === 'tags') {
          setSelectedActivity('simple');
      }
  };

  const handleActivityChange = (activityId: string) => {
      setSelectedActivity(activityId);
      // Se si sceglie Cruciverba ma si è in formato non compatibile, passa ad A4
      if (activityId === 'crossword' && (format === 'square' || format === 'tags')) {
          setFormat('a4');
      }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'extra' | 'photo' | 'brand') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setProcessingImg(type);
    const fileArray = Array.from(files) as File[];
    const filesToProcess = type === 'photo' ? fileArray.slice(0, 9 - (photos.length)) : [fileArray[0]];

    if (filesToProcess.length === 0) {
        setProcessingImg(null);
        return;
    }

    let processedCount = 0;
    const newPhotos: string[] = [];

    filesToProcess.forEach(file => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            const MAX_SIZE = 1200;
            if (width > MAX_SIZE || height > MAX_SIZE) {
              if (width > height) { height *= MAX_SIZE / width; width = MAX_SIZE; }
              else { width *= MAX_SIZE / height; height = MAX_SIZE; }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            
            if (type === 'extra') {
                setExtraImage(dataUrl);
                setProcessingImg(null); 
            } else if (type === 'brand') {
                setBrandLogo(dataUrl);
                setProcessingImg(null);
            } else {
                newPhotos.push(dataUrl);
                processedCount++;
                if (processedCount === filesToProcess.length) {
                    setPhotos(prev => [...prev, ...newPhotos].slice(0, 9));
                    setProcessingImg(null);
                }
            }
          };
          img.src = event.target?.result as string;
        };
        reader.onerror = () => { setError("Errore caricamento"); setProcessingImg(null); };
        reader.readAsDataURL(file);
    });
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

  const removeImage = (type: 'extra' | 'photo' | 'brand') => {
      if (type === 'extra') setExtraImage(undefined);
      else if (type === 'brand') setBrandLogo(undefined);
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

  const handleQuickTest = () => {
     setRecipientName("Mario Rossi");
     setEventDate("25 Dicembre");
     setTheme('christmas');
     setCreationMode('guided');
     setSelectedActivity('crossword');
     setTone('funny');
     setFormat('a4');
     setTopic("Ama il calcio, la pizza e dormire sul divano.");
     setHiddenSolution("AUGURI");
  };

  const handleGenerateSuggestions = async () => {
      // Name is mandatory only if NOT in tags mode
      if (format !== 'tags' && !recipientName) { 
          setError("Inserisci prima il nome del festeggiato"); 
          setShowNameError(true);
          // Trigger browser validation popup
          nameInputRef.current?.focus();
          nameInputRef.current?.reportValidity();
          return; 
      }
      setIsGeneratingSuggestions(true);
      setSuggestedPhrases([]);
      try {
          const toneToUse = creationMode === 'freestyle' ? 'custom' : tone;
          // For tags, allow empty prompt (will generate generic greetings)
          const promptToUse = creationMode === 'freestyle' ? topic : undefined;
          const effectiveRecipient = recipientName || "una persona speciale";
          
          const phrases = await regenerateGreetingOptions("placeholder", theme, effectiveRecipient, toneToUse, promptToUse);
          setSuggestedPhrases(phrases);
      } catch (e) {
          setError("Impossibile generare idee.");
      } finally {
          setIsGeneratingSuggestions(false);
      }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || processingImg) return; 
    setLoading(true);
    const finalContentType = (selectedActivity === 'crossword' || selectedActivity === 'simple') ? selectedActivity : 'simple';
    
    setStatusMsg(finalContentType === 'crossword' ? "Costruisco la griglia..." : "Creo il biglietto...");
    setError(null);
    setShowNameError(false);
    setShowTopicError(false);

    try {
      let inputData: string | ManualInput[] = topic;
      let finalTone: ToneType | undefined = tone;
      let finalCustomTone: string | undefined = undefined;
      let finalMode: 'ai' | 'manual' = 'ai';

      if (creationMode === 'manual') {
          finalMode = 'manual';
          if (finalContentType === 'crossword') {
             const validWords = manualWords.filter(w => w.word.trim() && w.clue.trim());
             if (validWords.length < 2) throw new Error("Inserisci almeno 2 parole complete.");
             inputData = validWords;
          } else {
             // For tags, manual input can be empty (we use default messages)
             if (format !== 'tags' && !topic.trim()) {
                 setShowTopicError(true);
                 // Validation popup
                 topicInputRef.current?.focus();
                 topicInputRef.current?.reportValidity();
                 throw new Error("Scrivi il messaggio di auguri.");
             }
          }
      } else if (creationMode === 'freestyle') {
          // For tags, freestyle prompt can be empty (generates based on theme)
          if (format !== 'tags' && !topic.trim()) {
              setShowTopicError(true);
              topicInputRef.current?.focus();
              topicInputRef.current?.reportValidity();
              throw new Error("Scrivi le istruzioni per l'IA.");
          }
          finalTone = 'custom';
          finalCustomTone = topic; 
          inputData = topic; 
      } else {
          if (finalContentType === 'crossword' && !topic.trim()) {
              setShowTopicError(true);
              topicInputRef.current?.focus();
              topicInputRef.current?.reportValidity();
              throw new Error("Inserisci un argomento (es. Zio Mario).");
          }
          // For tags, simple message topic can be empty
          if (format !== 'tags' && finalContentType === 'simple' && !topic.trim()) {
              setShowTopicError(true);
              topicInputRef.current?.focus();
              topicInputRef.current?.reportValidity();
              throw new Error("Scrivi o seleziona un messaggio.");
          }
      }

      // Name validation only if NOT tags
      if (format !== 'tags' && !recipientName.trim()) {
          setShowNameError(true);
          nameInputRef.current?.focus();
          nameInputRef.current?.reportValidity();
          throw new Error("Inserisci il nome del festeggiato.");
      }

      const cleanSolution = hiddenSolution.trim().toUpperCase();
      const finalDate = eventDate.trim() || DEFAULT_DATES[theme] || 'Oggi';

      const data = await generateCrossword(
        finalMode, 
        theme, 
        inputData, 
        cleanSolution || undefined,
        {
          recipientName,
          eventDate: finalDate, 
          images: { extraImage, photos, brandLogo },
          stickers: selectedStickers,
          contentType: finalContentType,
          tone: finalMode === 'ai' ? finalTone : undefined,
          customTone: finalCustomTone,
          hasWatermark: hasWatermark,
          format: format
        },
        (msg) => setStatusMsg(msg)
      );
      
      onCreated(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Errore.");
    } finally {
      setLoading(false);
    }
  };

  const renderPhotoPreview = () => {
    if (photos.length === 0) return null;
    const count = photos.length;
    let gridClass = 'grid-cols-1';
    if (count === 2) gridClass = 'grid-cols-2';
    else if (count > 2 && count <= 4) gridClass = 'grid-cols-2';
    else if (count >= 5) gridClass = 'grid-cols-3';

    return (
        <div className={`grid gap-0.5 w-full h-full bg-white overflow-hidden ${gridClass} pointer-events-none`}>
            {photos.map((p, i) => (
                <div key={i} className="relative w-full h-full overflow-hidden aspect-square">
                    <img src={p} className="w-full h-full object-cover" alt={`preview-${i}`} />
                </div>
            ))}
        </div>
    );
  };

  const ActivitySelector = () => (
    <div className="grid grid-cols-2 gap-3 mb-4">
        {ACTIVITY_MODULES.map(act => {
            const isDisabled = act.id === 'crossword' && (format === 'square' || format === 'tags');
            return (
            <button
                key={act.id}
                type="button"
                disabled={isDisabled}
                onClick={() => handleActivityChange(act.id)}
                className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${isDisabled ? 'opacity-50 cursor-not-allowed bg-gray-50 border-gray-100' : selectedActivity === act.id ? 'bg-white border-blue-500 shadow-md ring-2 ring-blue-100' : 'bg-white/40 border-gray-200 hover:bg-white'}`}
                title={isDisabled ? "Non disponibile per questo formato" : ""}
            >
                <div className={`p-2 rounded-full ${selectedActivity === act.id && !isDisabled ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                    <act.icon size={18} />
                </div>
                <div className="text-left">
                    <div className={`text-sm font-bold ${selectedActivity === act.id && !isDisabled ? 'text-gray-800' : 'text-gray-500'}`}>{act.label}</div>
                    <div className="text-[10px] text-gray-400 leading-tight">{act.desc}</div>
                </div>
            </button>
        )})}
    </div>
  );

  return (
    <form onSubmit={handleGenerate} className={`max-w-3xl mx-auto bg-white/95 backdrop-blur p-6 md:p-8 rounded-3xl shadow-2xl border-2 border-white/50 relative overflow-hidden transition-all`}>
      
      {/* ERROR TOAST - DYNAMIC ALERT */}
      {error && (
        <div 
            onClick={() => setError(null)}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-red-600 text-white px-6 py-4 rounded-full shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-5 cursor-pointer hover:bg-red-700 transition-colors max-w-[90vw] md:max-w-md"
            style={{ animation: 'shake 0.5s cubic-bezier(.36,.07,.19,.97) both' }}
        >
            <AlertCircle size={24} className="shrink-0" />
            <span className="font-bold text-sm">{error}</span>
            <X size={16} className="ml-auto opacity-70" />
        </div>
      )}

      {loading && (
        <div className="absolute inset-0 bg-white/95 z-50 flex items-center justify-center backdrop-blur-sm cursor-wait">
             <div className="text-center p-8 bg-white rounded-3xl shadow-xl border-4 border-blue-100 max-w-sm mx-4 animate-in fade-in zoom-in duration-300">
                 <div className="relative mb-4 mx-auto w-16 h-16">
                    <Loader2 className="w-16 h-16 text-blue-600 animate-spin absolute inset-0" />
                    <Gift className="w-6 h-6 text-blue-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                 </div>
                 <h3 className="text-xl font-bold text-gray-800 mb-2">Un attimo...</h3>
                 <p className="text-gray-500 text-sm mb-2">{statusMsg}</p>
             </div>
        </div>
      )}

      <div className={`transition-opacity duration-500 ${loading ? 'opacity-20 pointer-events-none' : 'opacity-100'}`}>
          {/* ... (Header and other form elements unchanged) ... */}
          <div className="text-center mb-8 relative">
            <h2 className="font-bold text-3xl md:text-4xl text-gray-800 mb-2 font-body">Crea il Tuo Biglietto</h2>
            <button 
                type="button" 
                onClick={handleQuickTest}
                className="absolute top-0 right-0 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 hover:bg-yellow-300 transition-colors shadow-sm"
            >
                <Zap size={10} fill="currentColor"/> Test Rapido
            </button>
          </div>

          {/* STEP 1: EVENT DETAILS */}
          <div className="mb-6">
            <label className="block text-xs font-bold text-gray-400 mb-3 uppercase tracking-wider text-center">1. Destinatario & Evento</label>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-4">
              {THEMES.map((t) => (
                <button key={t.id} type="button" onClick={() => setTheme(t.id)} className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all ${theme === t.id ? `${t.color} text-white scale-105 shadow-lg` : 'bg-gray-100 hover:bg-gray-200'}`}>
                  <t.icon size={20} className="mb-1" /><span className="text-[10px] font-bold">{t.label}</span>
                </button>
              ))}
            </div>
            
            <div className="flex flex-wrap gap-2 md:gap-4 mb-4 items-center justify-center">
                 {/* FORMAT SELECTOR */}
                 <div className="bg-gray-50 p-1 rounded-lg flex shadow-sm border border-gray-200 overflow-x-auto">
                     {CARD_FORMATS.map(f => (
                         <button
                            key={f.id}
                            type="button"
                            onClick={() => handleFormatChange(f.id)}
                            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${format === f.id ? 'bg-white text-blue-600 shadow-sm border border-blue-100' : 'text-gray-500 hover:bg-gray-100'}`}
                            title={f.desc}
                         >
                            {f.icon ? <f.icon size={14}/> : <BoxSelect size={14}/>} {f.label}
                         </button>
                     ))}
                 </div>

                 <button 
                    type="button"
                    onClick={() => setHasWatermark(!hasWatermark)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-xs font-bold transition-all ${hasWatermark ? 'bg-blue-100 text-blue-700 border-blue-300' : 'bg-gray-50 text-gray-500 border-gray-200'}`}
                 >
                     <FileBadge size={14}/> {hasWatermark ? 'Filigrana: SI' : 'Filigrana: NO'}
                 </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={format === 'tags' ? 'opacity-70' : ''}>
                    <label className={`block text-xs font-bold mb-2 uppercase ${showNameError ? 'text-red-500' : 'text-gray-400'}`}>
                        Per chi è? {format !== 'tags' ? '*' : '(Opzionale)'}
                    </label>
                    <input 
                        ref={nameInputRef} 
                        required={format !== 'tags'} 
                        type="text" 
                        placeholder={format === 'tags' ? "Lascia vuoto per biglietto generico" : "Nome"} 
                        className={`w-full p-3 border-2 rounded-xl font-bold outline-none transition-colors ${showNameError ? 'border-red-500 bg-red-50 animate-pulse' : (!recipientName && error && format !== 'tags' ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-blue-400')}`} 
                        value={recipientName} 
                        onChange={(e) => setRecipientName(e.target.value)} 
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-400 mb-2 uppercase">Data Evento</label>
                    <input type="text" placeholder={DEFAULT_DATES[theme] || "es. 25 Dicembre"} className="w-full p-3 border-2 border-gray-200 rounded-xl font-bold focus:border-blue-400 outline-none" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
                </div>
            </div>
          </div>

          {/* STEP 2: CONTENT CONFIGURATION */}
          <div className="mb-6">
            <label className="block text-xs font-bold text-gray-400 mb-3 uppercase tracking-wider text-center">2. Personalizza Contenuto</label>
            
            <div className="bg-gray-100 p-1 rounded-xl flex mb-4 text-sm font-bold text-gray-600 shadow-inner">
                <button type="button" onClick={() => setCreationMode('guided')} className={`flex-1 py-3 rounded-lg flex items-center justify-center gap-2 transition-all ${creationMode === 'guided' ? 'bg-white text-blue-600 shadow-sm' : 'hover:bg-gray-200'}`}><Wand2 size={16}/> Assistente</button>
                <button type="button" onClick={() => setCreationMode('freestyle')} className={`flex-1 py-3 rounded-lg flex items-center justify-center gap-2 transition-all ${creationMode === 'freestyle' ? 'bg-white text-purple-600 shadow-sm' : 'hover:bg-gray-200'}`}><BrainCircuit size={16}/> Prompt AI</button>
                <button type="button" onClick={() => setCreationMode('manual')} className={`flex-1 py-3 rounded-lg flex items-center justify-center gap-2 transition-all ${creationMode === 'manual' ? 'bg-white text-orange-600 shadow-sm' : 'hover:bg-gray-200'}`}><Edit size={16}/> Manuale</button>
            </div>

            {/* SHARED ACTIVITY SELECTOR - NOW VISIBLE FOR ALL MODES */}
            <div className="mb-4 animate-fade-in">
                 <label className="block text-xs font-bold text-gray-400 mb-2 uppercase ml-1">Tipo di Sorpresa:</label>
                 <ActivitySelector />
            </div>

            {/* TAB CONTENT: GUIDED */}
            {creationMode === 'guided' && (
                <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100 animate-in fade-in">
                    <label className="block text-xs font-bold text-blue-400 mb-2 uppercase border-b border-blue-200 pb-2">Stile e Tono:</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                        {AI_TONES.map((t) => (
                            <button key={t.id} type="button" onClick={() => setTone(t.id as ToneType)} className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all h-20 ${tone === t.id ? 'bg-white border-blue-500 shadow-md text-blue-600 ring-2 ring-blue-100' : 'bg-white/50 border-gray-200 hover:border-blue-300 text-gray-600 hover:bg-white'}`}>
                                <t.icon size={20} className="mb-1" />
                                <span className="text-xs font-bold">{t.label}</span>
                                <span className="text-[9px] opacity-70 leading-tight hidden md:block">{t.desc}</span>
                            </button>
                        ))}
                    </div>

                    <div className="relative">
                        <label className={`block text-xs font-bold mb-2 uppercase ${showTopicError ? 'text-red-500' : 'text-gray-400'}`}>
                            {selectedActivity === 'crossword' 
                                ? "Argomento del Cruciverba * (es. Calcio, Cucina):" 
                                : `Messaggio o Istruzioni ${format !== 'tags' ? '*' : '(Opzionale)'}:`
                            }
                        </label>
                        <textarea
                            ref={topicInputRef}
                            required={selectedActivity === 'crossword'}
                            rows={3}
                            className={`w-full p-3 border rounded-xl focus:ring-2 outline-none resize-none bg-white transition-all ${showTopicError ? 'border-red-500 ring-2 ring-red-200' : (!topic && error && format !== 'tags' ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:ring-blue-500')}`}
                            placeholder={selectedActivity === 'crossword' 
                                ? "Es: Zio Mario, ama il calcio, la pizza e dormire..." 
                                : format === 'tags' 
                                    ? "Lascia vuoto per frasi a sorpresa..." 
                                    : "Es: Auguri per i 50 anni, ringrazia per la festa..."
                            }
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                        />
                        {showTopicError && <p className="text-[10px] text-red-500 font-bold mt-1 text-right">Compila questo campo per generare</p>}
                        <button type="button" onClick={handleGenerateSuggestions} disabled={isGeneratingSuggestions} className={`absolute right-2 bottom-2 text-xs bg-blue-100 text-blue-600 hover:bg-blue-200 px-3 py-1.5 rounded-full font-bold flex items-center gap-1 transition-all ${isGeneratingSuggestions ? 'opacity-70 cursor-wait' : ''}`} title="Genera idee">
                            {isGeneratingSuggestions ? <Loader2 size={12} className="animate-spin"/> : <Sparkles size={12}/>} Suggerimenti
                        </button>
                    </div>
                    {suggestedPhrases.length > 0 && (
                             <div className="mt-3 grid gap-2 animate-in slide-in-from-top-2">
                                 <p className="text-xs font-bold text-gray-400 uppercase">Idee per te:</p>
                                 {suggestedPhrases.map((phrase, i) => (
                                     <button key={i} type="button" onClick={() => { setTopic(phrase); setSuggestedPhrases([]); }} className="text-left text-xs p-2 bg-white border border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors flex gap-2 group">
                                        <span className="mt-0.5 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"><Check size={12}/></span>{phrase}
                                     </button>
                                 ))}
                             </div>
                    )}
                </div>
            )}

            {/* TAB CONTENT: FREESTYLE */}
            {creationMode === 'freestyle' && (
                <div className="bg-purple-50/50 rounded-xl p-4 border border-purple-100 animate-in fade-in">
                    <div className="flex items-center gap-2 mb-2">
                        <Bot className="text-purple-600" size={20}/>
                        <label className="text-sm font-bold text-purple-900">Istruzioni Libere (Prompt)</label>
                    </div>
                    <p className="text-xs text-purple-700 mb-3">Scrivi qui esattamente cosa vuoi che faccia l'IA.</p>
                    <textarea ref={topicInputRef} required={format !== 'tags'} rows={5} className={`w-full p-4 border-2 bg-white rounded-xl outline-none resize-none text-purple-900 placeholder-purple-300 font-medium ${showTopicError ? 'border-red-500 ring-2 ring-red-200' : (!topic && error && format !== 'tags' ? 'border-red-400 bg-red-50' : 'border-purple-200 focus:ring-2 focus:ring-purple-400')}`} placeholder={format === 'tags' ? "Lascia vuoto per default o scrivi un prompt..." : "Es: Crea un cruciverba per Mario..."} value={topic} onChange={(e) => setTopic(e.target.value)}/>
                    {showTopicError && <p className="text-[10px] text-red-500 font-bold mt-1 text-right">Compila questo campo per generare</p>}
                </div>
            )}

            {/* TAB CONTENT: MANUAL */}
            {creationMode === 'manual' && (
                <div className="bg-orange-50/50 rounded-xl p-4 border border-orange-100 animate-in fade-in">
                    <div className="pt-1">
                    {selectedActivity === 'crossword' ? (
                        <>
                             <div className="bg-orange-100 p-3 rounded-lg mb-4 flex gap-3 items-start"><div className="bg-white p-1 rounded-full text-orange-500 mt-0.5"><Edit size={14} /></div><div><h4 className="text-xs font-bold text-orange-900 mb-1">Inserimento Parole</h4><p className="text-[10px] text-orange-800 leading-relaxed">Tu scegli le parole e gli indizi, noi calcoliamo solo l'incastro.</p></div></div>
                            <div className="space-y-2">
                                {manualWords.map((item, idx) => (
                                    <div key={idx} className="flex gap-2 relative">
                                        <div className="relative w-1/3"><input placeholder="PAROLA" value={item.word} onChange={(e) => handleManualChange(idx, 'word', e.target.value)} className="w-full p-2 border border-orange-200 bg-white rounded-lg font-bold uppercase focus:border-orange-400 outline-none text-sm" /></div>
                                        <input placeholder="Indizio (es. Il suo piatto preferito)" value={item.clue} onChange={(e) => handleManualChange(idx, 'clue', e.target.value)} className="flex-1 p-2 border border-orange-200 bg-white rounded-lg focus:border-orange-400 outline-none text-sm" />
                                        {manualWords.length > 2 && <button type="button" onClick={() => removeRow(idx)}><Trash2 size={16} className="text-gray-400 hover:text-red-500" /></button>}
                                    </div>
                                ))}
                                <button type="button" onClick={addRow} className="text-orange-600 text-xs font-bold flex items-center gap-1 mt-2 hover:bg-orange-100 p-2 rounded-lg transition-colors"><Plus size={14}/> Aggiungi riga</button>
                            </div>
                        </>
                    ) : (
                        <div>
                            <label className="block text-xs font-bold text-orange-400 mb-2 uppercase">Scrivi il tuo messaggio:</label>
                            <textarea ref={topicInputRef} required={format !== 'tags'} rows={4} className={`w-full p-3 border rounded-xl outline-none resize-none bg-white ${showTopicError ? 'border-red-500 ring-2 ring-red-200' : (!topic && error && format !== 'tags' ? 'border-red-400 bg-red-50' : 'border-orange-200 focus:ring-2 focus:ring-orange-500')}`} placeholder={format === 'tags' ? "Lascia vuoto per default..." : "Scrivi qui i tuoi auguri..."} value={topic} onChange={(e) => setTopic(e.target.value)}/>
                            {showTopicError && <p className="text-[10px] text-red-500 font-bold mt-1 text-right">Compila questo campo per generare</p>}
                        </div>
                    )}
                    </div>
                </div>
            )}
          </div>

          {selectedActivity === 'crossword' && (
              <div className="mb-6 p-3 bg-yellow-50 rounded-xl border border-yellow-200 animate-fade-in">
                  <label className="flex items-center gap-2 text-sm font-bold text-yellow-800 mb-2"><KeyRound size={16}/> Parola Nascosta (Opzionale)</label>
                  <input type="text" placeholder="SOLUZIONE SEGRETA" className="w-full p-2 border border-yellow-300 rounded uppercase font-bold text-center tracking-widest focus:ring-2 focus:ring-yellow-400 outline-none bg-white" value={hiddenSolution} onChange={(e) => setHiddenSolution(e.target.value)} maxLength={15} />
              </div>
          )}

          {/* STEP 3: IMAGES */}
          <div className="mb-6">
            <label className="block text-xs font-bold text-gray-400 mb-3 uppercase tracking-wider text-center">3. Immagini e Foto</label>
            <div className="grid grid-cols-2 gap-4 mb-4">
                {/* COPERTINA */}
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:bg-gray-50 cursor-pointer relative transition-colors group overflow-hidden h-40 flex items-center justify-center bg-gray-50/50">
                        {!extraImage && <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'extra')} className="absolute inset-0 opacity-0 cursor-pointer z-10" />}
                        {processingImg === 'extra' ? <div className="flex flex-col items-center text-blue-500"><Loader2 className="animate-spin mb-1"/><span className="text-[10px] font-bold">Elaborazione...</span></div> : extraImage ? (
                            <div className="relative w-full h-full group-hover:scale-95 transition-transform"><img src={extraImage} className="h-full w-full object-contain mx-auto" /><div className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-[10px] py-1 font-bold">COPERTINA</div><button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeImage('extra'); }} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 z-20 hover:bg-red-600"><Trash2 size={12}/></button></div>
                        ) : (
                            <div className="flex flex-col items-center group-hover:scale-105 transition-transform px-2"><div className="bg-white p-2 rounded-full shadow-sm mb-2"><ImageIcon className="text-blue-400" size={24}/></div><span className="text-xs font-bold text-gray-600 uppercase">Immagine di Copertina</span><span className="text-[9px] text-gray-400">(Logo, Disegno, etc.)</span></div>
                        )}
                </div>
                {/* FOTO INTERNO */}
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-0 text-center hover:bg-gray-50 cursor-pointer relative transition-colors group overflow-hidden h-40 flex items-center justify-center bg-gray-50/50">
                        {photos.length === 0 && <input type="file" accept="image/*" multiple onChange={(e) => handleImageUpload(e, 'photo')} className="absolute inset-0 opacity-0 cursor-pointer z-10" />}
                        {processingImg === 'photo' ? <div className="flex flex-col items-center text-blue-500"><Loader2 className="animate-spin mb-1"/><span className="text-[10px] font-bold">Collage...</span></div> : photos.length > 0 ? (
                            <div className="relative w-full h-full">{renderPhotoPreview()}<div className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-[10px] py-1 font-bold">INTERNO</div><button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeImage('photo'); }} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 z-30 hover:bg-red-600"><Trash2 size={12}/></button></div>
                        ) : (
                            <div className="flex flex-col items-center group-hover:scale-105 transition-transform px-2"><div className="bg-white p-2 rounded-full shadow-sm mb-2"><Images className="text-purple-400" size={24}/></div><span className="text-xs font-bold text-gray-600 uppercase">Foto Ricordo</span><span className="text-[9px] text-gray-400">(Per collage interno)</span></div>
                        )}
                </div>
            </div>

            {/* BRAND */}
            <div className="flex justify-center">
                 <div className="w-full max-w-xs border-2 border-dashed border-gray-200 rounded-lg p-2 flex items-center gap-3 relative hover:bg-gray-50 transition-colors">
                     {!brandLogo && <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'brand')} className="absolute inset-0 opacity-0 cursor-pointer z-10" />}
                     <div className="bg-gray-100 p-2 rounded-full text-gray-500 shrink-0">{processingImg === 'brand' ? <Loader2 className="animate-spin" size={16}/> : <Stamp size={16}/>}</div>
                     <div className="flex-1 text-left"><span className="block text-xs font-bold text-gray-600 uppercase">Firma Autore / Logo</span><span className="block text-[9px] text-gray-400">Appare sul retro del biglietto</span></div>
                     {brandLogo && (<div className="relative w-10 h-10 border rounded bg-white"><img src={brandLogo} className="w-full h-full object-contain" /><button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeImage('brand'); }} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 z-20 hover:bg-red-600"><X size={10}/></button></div>)}
                 </div>
            </div>
          </div>
          
          <div className="mb-6 bg-gray-50 p-3 rounded-xl border border-gray-100">
             <div className="flex justify-between items-center mb-2"><label className="text-xs font-bold text-gray-400 uppercase">Decorazioni</label><span className={`text-xs font-bold ${selectedStickers.length >= 5 ? 'text-red-500' : 'text-blue-500'}`}>{selectedStickers.length}/5</span></div>
             {selectedStickers.length > 0 && <div className="flex gap-2 mb-3 bg-white p-2 rounded-lg border border-dashed border-gray-200 overflow-x-auto custom-scrollbar"><span className="text-[10px] text-gray-400 font-bold uppercase shrink-0 py-1">I tuoi sticker:</span>{selectedStickers.map((s, idx) => <button key={idx} type="button" onClick={() => toggleSticker(s)} className="text-lg hover:bg-red-100 rounded-full px-1" title="Clicca per rimuovere">{s}</button>)}</div>}
             <div className="flex gap-2 overflow-x-auto pb-2 mb-2 custom-scrollbar">{Object.keys(STICKER_CATEGORIES).map(cat => <button key={cat} type="button" onClick={() => setActiveStickerTab(cat)} className={`text-xs px-2 py-1 rounded-full whitespace-nowrap transition-colors ${activeStickerTab === cat ? 'bg-blue-600 text-white font-bold' : 'bg-white text-gray-600 hover:bg-gray-100 border'}`}>{cat}</button>)}</div>
             <div className="flex flex-wrap gap-2 justify-center max-h-32 overflow-y-auto p-1 custom-scrollbar bg-white rounded-lg border-inner shadow-inner">{STICKER_CATEGORIES[activeStickerTab].map(s => <button key={s} type="button" onClick={() => toggleSticker(s)} disabled={!selectedStickers.includes(s) && selectedStickers.length >= 5} className={`text-2xl p-2 rounded-full transition-all duration-300 ${selectedStickers.includes(s) ? 'bg-blue-50 shadow-md scale-110 ring-2 ring-blue-200' : 'opacity-60 hover:opacity-100 hover:scale-105'} ${!selectedStickers.includes(s) && selectedStickers.length >= 5 ? 'opacity-20 cursor-not-allowed' : ''}`}>{s}</button>)}</div>
          </div>

          <button type="submit" disabled={loading || !!processingImg} className={`w-full py-4 rounded-xl text-white font-bold text-lg shadow-xl flex items-center justify-center gap-2 transition-all active:scale-95 ${loading || !!processingImg ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'}`}>
              <Wand2 /> {initialData ? "RIGENERA BIGLIETTO" : "GENERA BIGLIETTO"}
          </button>
      </div>
    </form>
  );
};
