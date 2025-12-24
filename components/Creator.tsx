import React, { useState, useEffect, useRef } from 'react';
import { generateCrossword, regenerateGreetingOptions } from '../services/geminiService';
import { CrosswordData, ManualInput, ThemeType, ToneType, Direction, CardFormat } from '../types';
import { Loader2, Wand2, Plus, Trash2, Gift, PartyPopper, CalendarHeart, Crown, KeyRound, Image as ImageIcon, Upload, Calendar, AlertCircle, Grid3X3, MailOpen, Images, Ghost, GraduationCap, ScrollText, HeartHandshake, BookOpen, Search, X, Smile, Heart, Music, Sparkles, Edit, PenTool, LayoutGrid, Zap, Check, MessageSquareDashed, Info, HelpCircle, Bot, BrainCircuit, Feather, Quote, Briefcase, GraduationCap as GradCap, Puzzle, Stamp, FileBadge, BoxSelect, Tag, Copy, RefreshCcw } from 'lucide-react';

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

// Flatten stickers for fallback usage
const STICKER_OPTIONS = Object.values(STICKER_CATEGORIES).flat();

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
    { id: 'a6_2x', label: 'Mini (2x)', desc: '2 Biglietti su A4 (A6)', icon: Copy },
    { id: 'square', label: 'Quadrato (2x)', desc: '2 Quadrati su A4', icon: Copy },
    { id: 'a3', label: 'Maxi (A3)', desc: 'Stampa grande poster', icon: BoxSelect },
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
  const [brandLogo, setBrandLogo] = useState<string | undefined>('/logo.png');
  const [selectedStickers, setSelectedStickers] = useState<string[]>([]);
  const [activeStickerTab, setActiveStickerTab] = useState('Natale');
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const [suggestedPhrases, setSuggestedPhrases] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showNameError, setShowNameError] = useState(false);
  const [showTopicError, setShowTopicError] = useState(false);
  const [processingImg, setProcessingImg] = useState<'extra' | 'photo' | 'brand' | null>(null);
  const [manualWords, setManualWords] = useState<ManualInput[]>([{ word: '', clue: '' }, { word: '', clue: '' }, { word: '', clue: '' }]);

  const nameInputRef = useRef<HTMLInputElement>(null);
  const topicInputRef = useRef<HTMLTextAreaElement>(null);

  const isMassFormat = format === 'tags' || format === 'a6_2x' || format === 'square';

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
        setBrandLogo(initialData.images?.brandLogo || '/logo.png');
        setSelectedStickers(initialData.stickers || []);
        if (initialData.originalMode === 'manual') {
            setCreationMode('manual');
            if (Array.isArray(initialData.originalInput)) setManualWords(initialData.originalInput as ManualInput[]);
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
        setBrandLogo('/logo.png'); 
        setSelectedStickers([]);
        setManualWords([{ word: '', clue: '' }, { word: '', clue: '' }, { word: '', clue: '' }]);
        setCreationMode('guided');
        setSelectedActivity('crossword');
        setHasWatermark(false);
        setFormat('a4');
    }
  }, [initialData]);

  useEffect(() => {
      if (error) {
          const timer = setTimeout(() => { setError(null); setShowNameError(false); setShowTopicError(false); }, 5000);
          return () => clearTimeout(timer);
      }
  }, [error]);

  useEffect(() => { if(recipientName) setShowNameError(false); }, [recipientName]);
  useEffect(() => { if(topic) setShowTopicError(false); }, [topic]);

  const handleFormatChange = (newFormat: CardFormat) => {
      setFormat(newFormat);
      if (newFormat === 'square' || newFormat === 'tags' || newFormat === 'a6_2x') {
          setSelectedActivity('simple');
      }
  };

  const handleActivityChange = (activityId: string) => {
      setSelectedActivity(activityId);
      if (activityId === 'crossword' && (format === 'square' || format === 'tags' || format === 'a6_2x')) {
          setFormat('a4');
      }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'extra' | 'photo' | 'brand') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setProcessingImg(type);
    const fileArray = Array.from(files) as File[];
    const filesToProcess = type === 'photo' ? fileArray.slice(0, 9 - (photos.length)) : [fileArray[0]];
    if (filesToProcess.length === 0) { setProcessingImg(null); return; }
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
            if (type === 'extra') { setExtraImage(dataUrl); setProcessingImg(null); }
            else if (type === 'brand') { setBrandLogo(dataUrl); setProcessingImg(null); }
            else { newPhotos.push(dataUrl); processedCount++; if (processedCount === filesToProcess.length) { setPhotos(prev => [...prev, ...newPhotos].slice(0, 9)); setProcessingImg(null); } }
          };
          img.src = event.target?.result as string;
        };
        reader.onerror = () => { setError("Errore caricamento"); setProcessingImg(null); };
        reader.readAsDataURL(file);
    });
  };

  const toggleSticker = (sticker: string) => {
    if (selectedStickers.includes(sticker)) { setSelectedStickers(selectedStickers.filter(s => s !== sticker)); }
    else { if (selectedStickers.length < 5) { setSelectedStickers([...selectedStickers, sticker]); } }
  };

  const removeImage = (type: 'extra' | 'photo' | 'brand') => {
      if (type === 'extra') setExtraImage(undefined);
      else if (type === 'brand') setBrandLogo('/logo.png');
      else setPhotos([]);
  };

  const addRow = () => setManualWords([...manualWords, { word: '', clue: '' }]);
  const removeRow = (index: number) => { if (manualWords.length <= 2) return; const newWords = [...manualWords]; newWords.splice(index, 1); setManualWords(newWords); };
  const handleManualChange = (index: number, field: keyof ManualInput, value: string) => { const newWords = [...manualWords]; newWords[index] = { ...newWords[index], [field]: value }; setManualWords(newWords); };

  const handleQuickTest = () => {
     setRecipientName("Mario Rossi"); setEventDate("25 Dicembre"); setTheme('christmas'); setCreationMode('guided'); setSelectedActivity('crossword'); setTone('funny'); setFormat('a4'); setTopic("Ama il calcio, la pizza e dormire sul divano."); setHiddenSolution("AUGURI");
  };

  const handleGenerateSuggestions = async () => {
      if (!isMassFormat && !recipientName) { setError("Inserisci prima il nome del festeggiato"); setShowNameError(true); nameInputRef.current?.focus(); nameInputRef.current?.reportValidity(); return; }
      setIsGeneratingSuggestions(true); setSuggestedPhrases([]);
      try {
          const toneToUse = creationMode === 'freestyle' ? 'custom' : tone;
          const promptToUse = creationMode === 'freestyle' ? topic : undefined;
          const effectiveRecipient = recipientName || "una persona speciale";
          const phrases = await regenerateGreetingOptions("placeholder", theme, effectiveRecipient, toneToUse, promptToUse);
          setSuggestedPhrases(phrases);
      } catch (e) { setError("Impossibile generare idee."); } finally { setIsGeneratingSuggestions(false); }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || processingImg) return; 
    setLoading(true); setStatusMsg(selectedActivity === 'crossword' ? "Costruisco la griglia..." : "Creo il biglietto..."); setError(null); setShowNameError(false); setShowTopicError(false);
    try {
      let inputData: string | ManualInput[] = topic;
      let finalTone: ToneType | undefined = tone;
      let finalCustomTone: string | undefined = undefined;
      let finalMode: 'ai' | 'manual' = 'ai';

      if (creationMode === 'manual') {
          finalMode = 'manual';
          if (selectedActivity === 'crossword') {
             const validWords = manualWords.filter(w => w.word.trim() && w.clue.trim());
             if (validWords.length < 2) throw new Error("Inserisci almeno 2 parole complete.");
             inputData = validWords;
          } else {
             if (!isMassFormat && !topic.trim()) { setShowTopicError(true); topicInputRef.current?.focus(); topicInputRef.current?.reportValidity(); throw new Error("Scrivi il messaggio di auguri."); }
          }
      } else if (creationMode === 'freestyle') {
          if (!isMassFormat && !topic.trim()) { setShowTopicError(true); topicInputRef.current?.focus(); topicInputRef.current?.reportValidity(); throw new Error("Scrivi le istruzioni per l'IA."); }
          finalTone = 'custom'; finalCustomTone = topic; inputData = topic; 
      } else {
          if (selectedActivity === 'crossword' && !topic.trim()) { setShowTopicError(true); topicInputRef.current?.focus(); topicInputRef.current?.reportValidity(); throw new Error("Inserisci un argomento."); }
          if (!isMassFormat && selectedActivity === 'simple' && !topic.trim()) { setShowTopicError(true); topicInputRef.current?.focus(); topicInputRef.current?.reportValidity(); throw new Error("Scrivi o seleziona un messaggio."); }
      }
      if (!isMassFormat && !recipientName.trim()) { setShowNameError(true); nameInputRef.current?.focus(); nameInputRef.current?.reportValidity(); throw new Error("Inserisci il nome del festeggiato."); }
      const cleanSolution = hiddenSolution.trim().toUpperCase();
      const finalDate = eventDate.trim() || DEFAULT_DATES[theme] || 'Oggi';
      const data = await generateCrossword(
        finalMode, theme, inputData, cleanSolution || undefined,
        {
          recipientName, eventDate: finalDate, 
          images: { extraImage, photos, brandLogo },
          stickers: selectedStickers,
          contentType: selectedActivity === 'crossword' ? 'crossword' : 'simple',
          tone: finalMode === 'ai' ? finalTone : undefined,
          customTone: finalCustomTone,
          hasWatermark: hasWatermark,
          format: format
        },
        (msg) => setStatusMsg(msg)
      );
      onCreated(data);
    } catch (err: any) { console.error(err); setError(err.message || "Errore."); } finally { setLoading(false); }
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
            const isDisabled = act.id === 'crossword' && (format === 'square' || isMassFormat);
            return (
            <button key={act.id} type="button" disabled={isDisabled} onClick={() => handleActivityChange(act.id)} className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${isDisabled ? 'opacity-50 cursor-not-allowed bg-gray-50 border-gray-100' : selectedActivity === act.id ? 'bg-white border-blue-500 shadow-md ring-2 ring-blue-100' : 'bg-white/40 border-gray-200 hover:bg-white'}`} title={isDisabled ? "Non disponibile per questo formato" : ""}>
                <div className={`p-2 rounded-full ${selectedActivity === act.id && !isDisabled ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}><act.icon size={18} /></div>
                <div className="text-left"><div className={`text-sm font-bold ${selectedActivity === act.id && !isDisabled ? 'text-gray-800' : 'text-gray-500'}`}>{act.label}</div><div className="text-[10px] text-gray-400 leading-tight">{act.desc}</div></div>
            </button>
        )})}
    </div>
  );

  return (
    <form onSubmit={handleGenerate} className={`max-w-3xl mx-auto bg-white/95 backdrop-blur p-6 md:p-8 rounded-3xl shadow-2xl border-2 border-white/50 relative overflow-hidden transition-all`}>
      {error && (<div onClick={() => setError(null)} className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-red-600 text-white px-6 py-4 rounded-full shadow-2xl flex items-center gap-3 cursor-pointer hover:bg-red-700 transition-colors animate-in fade-in slide-in-from-top-5"><AlertCircle size={24} /><span className="font-bold text-sm">{error}</span><X size={16} className="ml-auto opacity-70" /></div>)}
      {loading && (<div className="absolute inset-0 bg-white/95 z-50 flex items-center justify-center backdrop-blur-sm cursor-wait"><div className="text-center p-8 bg-white rounded-3xl shadow-xl border-4 border-blue-100 max-w-sm mx-4"><Loader2 className="w-16 h-16 text-blue-600 animate-spin mx-auto mb-4" /><h3 className="text-xl font-bold text-gray-800 mb-2">Un attimo...</h3><p className="text-gray-500 text-sm">{statusMsg}</p></div></div>)}
      <div className={`transition-opacity duration-500 ${loading ? 'opacity-20 pointer-events-none' : 'opacity-100'}`}>
          <div className="text-center mb-8 relative">
            <h2 className="font-bold text-3xl md:text-4xl text-gray-800 mb-2 font-body">Crea il Tuo Biglietto</h2>
            <button type="button" onClick={handleQuickTest} className="absolute top-0 right-0 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 hover:bg-yellow-300 transition-colors shadow-sm"><Zap size={10} fill="currentColor"/> Test Rapido</button>
          </div>
          {/* ... (rest of the form remains mostly the same, ensuring all closing tags are correct) ... */}
          <div className="mb-6">
            <label className="block text-xs font-bold text-gray-400 mb-3 uppercase tracking-wider text-center">1. Destinatario & Evento</label>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-4">
              {THEMES.map((t) => (<button key={t.id} type="button" onClick={() => setTheme(t.id)} className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all ${theme === t.id ? `${t.color} text-white scale-105 shadow-lg` : 'bg-gray-100 hover:bg-gray-200'}`}><t.icon size={20} className="mb-1" /><span className="text-[10px] font-bold">{t.label}</span></button>))}
            </div>
            <div className="flex flex-wrap gap-2 md:gap-4 mb-4 items-center justify-center">
                 <div className="bg-gray-50 p-1 rounded-lg flex shadow-sm border border-gray-200 overflow-x-auto">
                     {CARD_FORMATS.map(f => (<button key={f.id} type="button" onClick={() => handleFormatChange(f.id)} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${format === f.id ? 'bg-white text-blue-600 shadow-sm border border-blue-100' : 'text-gray-500 hover:bg-gray-100'}`} title={f.desc}>{f.icon ? <f.icon size={14}/> : <BoxSelect size={14}/>} {f.label}</button>))}
                 </div>
                 <button type="button" onClick={() => setHasWatermark(!hasWatermark)} className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-xs font-bold transition-all ${hasWatermark ? 'bg-blue-100 text-blue-700 border-blue-300' : 'bg-gray-50 text-gray-500 border-gray-200'}`}><FileBadge size={14}/> {hasWatermark ? 'Filigrana: SI' : 'Filigrana: NO'}</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={isMassFormat ? 'opacity-70' : ''}>
                    <label className={`block text-xs font-bold mb-2 uppercase ${showNameError ? 'text-red-500' : 'text-gray-400'}`}>Per chi è? {isMassFormat ? '(Opzionale)' : '*'}</label>
                    <input ref={nameInputRef} required={!isMassFormat} type="text" placeholder={isMassFormat ? "Vuoto per generico" : "Nome"} className={`w-full p-3 border-2 rounded-xl font-bold outline-none ${showNameError ? 'border-red-500 bg-red-50' : 'border-gray-200 focus:border-blue-400'}`} value={recipientName} onChange={(e) => setRecipientName(e.target.value)} />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-400 mb-2 uppercase">Data Evento</label>
                    <input type="text" placeholder={DEFAULT_DATES[theme] || "Data"} className="w-full p-3 border-2 border-gray-200 rounded-xl font-bold focus:border-blue-400 outline-none" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
                </div>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-xs font-bold text-gray-400 mb-3 uppercase tracking-wider text-center">2. Personalizza Contenuto</label>
            <div className="bg-gray-100 p-1 rounded-xl flex mb-4 text-sm font-bold text-gray-600 shadow-inner">
                <button type="button" onClick={() => setCreationMode('guided')} className={`flex-1 py-3 rounded-lg flex items-center justify-center gap-2 ${creationMode === 'guided' ? 'bg-white text-blue-600 shadow-sm' : ''}`}><Wand2 size={16}/> Assistente</button>
                <button type="button" onClick={() => setCreationMode('freestyle')} className={`flex-1 py-3 rounded-lg flex items-center justify-center gap-2 ${creationMode === 'freestyle' ? 'bg-white text-purple-600 shadow-sm' : ''}`}><BrainCircuit size={16}/> Prompt AI</button>
                <button type="button" onClick={() => setCreationMode('manual')} className={`flex-1 py-3 rounded-lg flex items-center justify-center gap-2 ${creationMode === 'manual' ? 'bg-white text-orange-600 shadow-sm' : ''}`}><Edit size={16}/> Manuale</button>
            </div>
            <div className="mb-4"><label className="block text-xs font-bold text-gray-400 mb-2 uppercase ml-1">Tipo di Sorpresa:</label><ActivitySelector /></div>
            
            {creationMode === 'guided' && (
                <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">{AI_TONES.map((t) => (<button key={t.id} type="button" onClick={() => setTone(t.id as ToneType)} className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all h-20 ${tone === t.id ? 'bg-white border-blue-500 shadow-md text-blue-600' : 'bg-white/50 border-gray-200'}`}><t.icon size={20} className="mb-1" /><span className="text-xs font-bold">{t.label}</span></button>))}</div>
                    <div className="relative">
                        <textarea ref={topicInputRef} required={selectedActivity === 'crossword'} rows={3} className={`w-full p-3 border rounded-xl focus:ring-2 outline-none resize-none bg-white ${showTopicError ? 'border-red-500' : 'border-gray-200 focus:ring-blue-500'}`} placeholder={isMassFormat ? "Lascia vuoto per frasi a sorpresa..." : "Es: Auguri per i 50 anni..."} value={topic} onChange={(e) => setTopic(e.target.value)}/>
                        <button type="button" onClick={handleGenerateSuggestions} disabled={isGeneratingSuggestions} className="absolute right-2 bottom-2 text-xs bg-blue-100 text-blue-600 px-3 py-1.5 rounded-full font-bold flex items-center gap-1">{isGeneratingSuggestions ? <Loader2 size={12} className="animate-spin"/> : <Sparkles size={12}/>} Suggerimenti</button>
                    </div>
                    {suggestedPhrases.length > 0 && <div className="mt-3 grid gap-2">{suggestedPhrases.map((phrase, i) => (<button key={i} type="button" onClick={() => { setTopic(phrase); setSuggestedPhrases([]); }} className="text-left text-xs p-2 bg-white border border-gray-200 rounded-lg hover:border-blue-400">{phrase}</button>))}</div>}
                </div>
            )}
            {creationMode === 'freestyle' && (<div className="bg-purple-50/50 rounded-xl p-4 border border-purple-100"><textarea ref={topicInputRef} required={!isMassFormat} rows={5} className={`w-full p-4 border-2 bg-white rounded-xl outline-none resize-none ${showTopicError ? 'border-red-500' : 'border-purple-200'}`} placeholder="Prompt AI..." value={topic} onChange={(e) => setTopic(e.target.value)}/></div>)}
            {creationMode === 'manual' && (<div className="bg-orange-50/50 rounded-xl p-4 border border-orange-100">{selectedActivity === 'crossword' ? <div className="space-y-2">{manualWords.map((item, idx) => (<div key={idx} className="flex gap-2"><input value={item.word} onChange={(e) => handleManualChange(idx, 'word', e.target.value)} className="w-1/3 p-2 border rounded-lg uppercase" /><input value={item.clue} onChange={(e) => handleManualChange(idx, 'clue', e.target.value)} className="flex-1 p-2 border rounded-lg" /></div>))}<button type="button" onClick={addRow} className="text-orange-600 text-xs font-bold mt-2"><Plus size={14}/> Aggiungi</button></div> : <textarea ref={topicInputRef} required={!isMassFormat} rows={4} className="w-full p-3 border rounded-xl" placeholder="Scrivi il tuo messaggio..." value={topic} onChange={(e) => setTopic(e.target.value)}/>}</div>)}
          </div>

          <div className="mb-6">
            <label className="block text-xs font-bold text-gray-400 mb-3 uppercase tracking-wider text-center">3. Immagini e Foto</label>
            <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:bg-gray-50 cursor-pointer relative group overflow-hidden h-40 flex items-center justify-center bg-gray-50/50">
                        {!extraImage && <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'extra')} className="absolute inset-0 opacity-0 cursor-pointer z-10" />}
                        {processingImg === 'extra' ? <Loader2 className="animate-spin text-blue-500"/> : extraImage ? (
                            <div className="relative w-full h-full"><img src={extraImage} className="h-full w-full object-contain mx-auto" /><button type="button" onClick={(e) => { e.preventDefault(); removeImage('extra'); }} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"><Trash2 size={12}/></button></div>
                        ) : <div className="flex flex-col items-center"><ImageIcon className="text-blue-400 mb-2" size={24}/><span className="text-xs font-bold text-gray-600">COPERTINA</span></div>}
                </div>
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:bg-gray-50 cursor-pointer relative group overflow-hidden h-40 flex items-center justify-center bg-gray-50/50">
                        {photos.length === 0 && <input type="file" accept="image/*" multiple onChange={(e) => handleImageUpload(e, 'photo')} className="absolute inset-0 opacity-0 cursor-pointer z-10" />}
                        {processingImg === 'photo' ? <Loader2 className="animate-spin text-blue-500"/> : photos.length > 0 ? (
                            <div className="relative w-full h-full">{renderPhotoPreview()}<button type="button" onClick={(e) => { e.preventDefault(); removeImage('photo'); }} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"><Trash2 size={12}/></button></div>
                        ) : <div className="flex flex-col items-center"><Images className="text-purple-400 mb-2" size={24}/><span className="text-xs font-bold text-gray-600">FOTO COLLAGE</span></div>}
                </div>
            </div>
            
            <div className="flex justify-center">
                 <div className="w-full max-w-xs border-2 border-dashed border-gray-200 rounded-lg p-2 flex items-center gap-3 relative hover:bg-gray-50 transition-colors">
                     {!brandLogo && <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'brand')} className="absolute inset-0 opacity-0 cursor-pointer z-10" />}
                     <div className="bg-gray-100 p-2 rounded-full text-gray-500 shrink-0">{processingImg === 'brand' ? <Loader2 className="animate-spin" size={16}/> : <Stamp size={16}/>}</div>
                     <div className="flex-1 text-left"><span className="block text-xs font-bold text-gray-600 uppercase">Firma / Logo</span></div>
                     {brandLogo ? (<div className="relative w-10 h-10 border rounded bg-white"><img src={brandLogo} className="w-full h-full object-contain" /><button type="button" onClick={(e) => { e.preventDefault(); removeImage('brand'); }} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 z-20 hover:bg-red-600" title="Ripristina default"><RefreshCcw size={10}/></button></div>) : null}
                 </div>
            </div>
          </div>
          
          <div className="mb-6 bg-gray-50 p-3 rounded-xl border border-gray-100">
             <div className="flex justify-between items-center mb-2"><label className="text-xs font-bold text-gray-400 uppercase">Decorazioni</label><span className={`text-xs font-bold ${selectedStickers.length >= 5 ? 'text-red-500' : 'text-blue-500'}`}>{selectedStickers.length}/5</span></div>
             <div className="flex gap-2 overflow-x-auto pb-2 mb-2 custom-scrollbar">{Object.keys(STICKER_CATEGORIES).map(cat => <button key={cat} type="button" onClick={() => setActiveStickerTab(cat)} className={`text-xs px-2 py-1 rounded-full ${activeStickerTab === cat ? 'bg-blue-600 text-white' : 'bg-white text-gray-600'}`}>{cat}</button>)}</div>
             <div className="flex flex-wrap gap-2 justify-center max-h-32 overflow-y-auto p-1 custom-scrollbar bg-white rounded-lg border-inner shadow-inner">{STICKER_CATEGORIES[activeStickerTab].map(s => <button key={s} type="button" onClick={() => toggleSticker(s)} disabled={!selectedStickers.includes(s) && selectedStickers.length >= 5} className={`text-2xl p-2 rounded-full ${selectedStickers.includes(s) ? 'bg-blue-50 shadow-md ring-2 ring-blue-200' : 'opacity-60'}`}>{s}</button>)}</div>
          </div>

          <button type="submit" disabled={loading || !!processingImg} className={`w-full py-4 rounded-xl text-white font-bold text-lg shadow-xl flex items-center justify-center gap-2 transition-all active:scale-95 ${loading || !!processingImg ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'}`}><Wand2 /> {initialData ? "RIGENERA BIGLIETTO" : "GENERA BIGLIETTO"}</button>
      </div>
    </form>
  );
};
