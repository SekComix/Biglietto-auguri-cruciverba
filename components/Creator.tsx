import React, { useState, useEffect } from 'react';
import { generateCrossword, regenerateGreetingOptions } from '../services/geminiService';
import { CrosswordData, ManualInput, ThemeType, ToneType, Direction } from '../types';
import { Loader2, Wand2, Plus, Trash2, Gift, PartyPopper, CalendarHeart, Crown, KeyRound, Image as ImageIcon, Upload, Calendar, AlertCircle, Grid3X3, MailOpen, Images, Ghost, GraduationCap, ScrollText, HeartHandshake, BookOpen, Search, X, Smile, Heart, Music, Sparkles, Edit, PenTool, LayoutGrid, Zap, Check, MessageSquareDashed, Info, HelpCircle, Bot, BrainCircuit, Feather, Quote, Briefcase, GraduationCap as GradCap, Puzzle } from 'lucide-react';

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

// FUTURE-PROOFING: Activity Modules
const ACTIVITY_MODULES = [
    { id: 'crossword', label: 'Cruciverba', icon: Grid3X3, desc: 'Parole incrociate personalizzate' },
    { id: 'simple', label: 'Solo Dedica', icon: MailOpen, desc: 'Nessun gioco, solo testo' },
    // Future: { id: 'rebus', label: 'Rebus', icon: HelpCircle, desc: 'Coming soon...' }
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
  const [selectedActivity, setSelectedActivity] = useState<string>('crossword'); // 'crossword' | 'simple'
  
  const [tone, setTone] = useState<ToneType>('surprise');
  const [theme, setTheme] = useState<ThemeType>('christmas');
  
  const [topic, setTopic] = useState('');
  
  const [recipientName, setRecipientName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [hiddenSolution, setHiddenSolution] = useState('');

  const [extraImage, setExtraImage] = useState<string | undefined>(undefined);
  const [photos, setPhotos] = useState<string[]>([]); 
  const [selectedStickers, setSelectedStickers] = useState<string[]>([]);
  const [activeStickerTab, setActiveStickerTab] = useState('Natale');

  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const [suggestedPhrases, setSuggestedPhrases] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const [processingImg, setProcessingImg] = useState<'extra' | 'photo' | null>(null);

  const [manualWords, setManualWords] = useState<ManualInput[]>([
    { word: '', clue: '' },
    { word: '', clue: '' },
    { word: '', clue: '' }
  ]);

  useEffect(() => {
    if (initialData) {
        setSelectedActivity(initialData.type); // Maps 'crossword' or 'simple'
        setRecipientName(initialData.recipientName);
        setEventDate(initialData.eventDate);
        setTheme(initialData.theme);
        setExtraImage(initialData.images?.extraImage);
        setPhotos(initialData.images?.photos || []);
        setSelectedStickers(initialData.stickers || []);
        
        // Restore Logic based on stored Original Mode
        if (initialData.originalMode === 'manual') {
            setCreationMode('manual');
            if (Array.isArray(initialData.originalInput)) {
                setManualWords(initialData.originalInput as ManualInput[]);
            }
        } else {
            // It was AI
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
        setSelectedStickers([]);
        setManualWords([{ word: '', clue: '' }, { word: '', clue: '' }, { word: '', clue: '' }]);
        setCreationMode('guided');
        setSelectedActivity('crossword');
    }
  }, [initialData]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'extra' | 'photo') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setProcessingImg(type);
    const fileArray = Array.from(files);
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

  const handleGenerateSuggestions = async () => {
      if (!recipientName) { setError("Inserisci prima il nome del festeggiato"); return; }
      setIsGeneratingSuggestions(true);
      setSuggestedPhrases([]);
      try {
          const toneToUse = creationMode === 'freestyle' ? 'custom' : tone;
          const promptToUse = creationMode === 'freestyle' ? topic : undefined;
          
          const phrases = await regenerateGreetingOptions("placeholder", theme, recipientName, toneToUse, promptToUse);
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
    // Use selectedActivity directly as contentType if strictly 'crossword' or 'simple'
    const finalContentType = (selectedActivity === 'crossword' || selectedActivity === 'simple') ? selectedActivity : 'simple';
    
    setStatusMsg(finalContentType === 'crossword' ? "Costruisco la griglia..." : "Creo il biglietto...");
    setError(null);

    try {
      let inputData: string | ManualInput[] = topic;
      let finalTone: ToneType | undefined = tone;
      let finalCustomTone: string | undefined = undefined;
      let finalMode: 'ai' | 'manual' = 'ai';

      // CONFIGURATION BASED ON MODE
      if (creationMode === 'manual') {
          finalMode = 'manual';
          if (finalContentType === 'crossword') {
             const validWords = manualWords.filter(w => w.word.trim() && w.clue.trim());
             if (validWords.length < 2) throw new Error("Inserisci almeno 2 parole complete.");
             inputData = validWords;
          } else {
             if (!topic.trim()) throw new Error("Scrivi il messaggio di auguri.");
          }
      } else if (creationMode === 'freestyle') {
          if (!topic.trim()) throw new Error("Scrivi le istruzioni per l'IA.");
          finalTone = 'custom';
          finalCustomTone = topic; 
          inputData = topic; 
      } else {
          // Guided logic
          if (finalContentType === 'crossword' && !topic.trim()) throw new Error("Inserisci un argomento (es. Zio Mario).");
          if (finalContentType === 'simple' && !topic.trim()) throw new Error("Scrivi o seleziona un messaggio.");
      }

      if (!recipientName.trim()) throw new Error("Inserisci il nome del festeggiato.");

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
          images: { extraImage, photos },
          stickers: selectedStickers,
          contentType: finalContentType,
          tone: finalMode === 'ai' ? finalTone : undefined,
          customTone: finalCustomTone
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
        {ACTIVITY_MODULES.map(act => (
            <button
                key={act.id}
                type="button"
                onClick={() => setSelectedActivity(act.id)}
                className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${selectedActivity === act.id ? 'bg-white border-blue-500 shadow-md ring-2 ring-blue-100' : 'bg-white/40 border-gray-200 hover:bg-white'}`}
            >
                <div className={`p-2 rounded-full ${selectedActivity === act.id ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                    <act.icon size={18} />
                </div>
                <div className="text-left">
                    <div className={`text-sm font-bold ${selectedActivity === act.id ? 'text-gray-800' : 'text-gray-500'}`}>{act.label}</div>
                    <div className="text-[10px] text-gray-400 leading-tight">{act.desc}</div>
                </div>
            </button>
        ))}
    </div>
  );

  // --- RENDER ---
  return (
    <form onSubmit={handleGenerate} className={`max-w-3xl mx-auto bg-white/95 backdrop-blur p-6 md:p-8 rounded-3xl shadow-2xl border-2 border-white/50 relative overflow-hidden transition-all`}>
      
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
          <div className="text-center mb-8 relative">
            <h2 className="font-bold text-3xl md:text-4xl text-gray-800 mb-2 font-body">Crea il Tuo Biglietto</h2>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-gray-400 mb-2 uppercase">Per chi è?</label>
                    <input required type="text" placeholder="Nome" className="w-full p-3 border-2 border-gray-200 rounded-xl font-bold focus:border-blue-400 outline-none" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-400 mb-2 uppercase">Data Evento</label>
                    <input type="text" placeholder={DEFAULT_DATES[theme] || "es. 25 Dicembre"} className="w-full p-3 border-2 border-gray-200 rounded-xl font-bold focus:border-blue-400 outline-none" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
                </div>
            </div>
          </div>

          {/* STEP 2: CONTENT CONFIGURATION (TABS + ACTIVITY SELECTOR) */}
          <div className="mb-6">
            <label className="block text-xs font-bold text-gray-400 mb-3 uppercase tracking-wider text-center">2. Personalizza Contenuto</label>
            
            <div className="bg-gray-100 p-1 rounded-xl flex mb-4 text-sm font-bold text-gray-600 shadow-inner">
                <button 
                    type="button" 
                    onClick={() => setCreationMode('guided')}
                    className={`flex-1 py-3 rounded-lg flex items-center justify-center gap-2 transition-all ${creationMode === 'guided' ? 'bg-white text-blue-600 shadow-sm' : 'hover:bg-gray-200'}`}
                >
                    <Wand2 size={16}/> Assistente
                </button>
                <button 
                    type="button" 
                    onClick={() => setCreationMode('freestyle')}
                    className={`flex-1 py-3 rounded-lg flex items-center justify-center gap-2 transition-all ${creationMode === 'freestyle' ? 'bg-white text-purple-600 shadow-sm' : 'hover:bg-gray-200'}`}
                >
                    <BrainCircuit size={16}/> Prompt AI
                </button>
                <button 
                    type="button" 
                    onClick={() => setCreationMode('manual')}
                    className={`flex-1 py-3 rounded-lg flex items-center justify-center gap-2 transition-all ${creationMode === 'manual' ? 'bg-white text-orange-600 shadow-sm' : 'hover:bg-gray-200'}`}
                >
                    <Edit size={16}/> Manuale
                </button>
            </div>

            {/* TAB CONTENT: GUIDED */}
            {creationMode === 'guided' && (
                <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100 animate-in fade-in">
                    <label className="block text-xs font-bold text-blue-400 mb-2 uppercase">Cosa vuoi inserire?</label>
                    <ActivitySelector />

                    {/* Tone Selection */}
                    <label className="block text-xs font-bold text-blue-400 mb-2 uppercase border-t border-blue-200 pt-3">Stile e Tono:</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                        {AI_TONES.map((t) => (
                            <button
                                key={t.id}
                                type="button"
                                onClick={() => setTone(t.id as ToneType)}
                                className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all h-20 ${tone === t.id ? 'bg-white border-blue-500 shadow-md text-blue-600 ring-2 ring-blue-100' : 'bg-white/50 border-gray-200 hover:border-blue-300 text-gray-600 hover:bg-white'}`}
                            >
                                <t.icon size={20} className="mb-1" />
                                <span className="text-xs font-bold">{t.label}</span>
                                <span className="text-[9px] opacity-70 leading-tight hidden md:block">{t.desc}</span>
                            </button>
                        ))}
                    </div>

                    <div className="relative">
                        <label className="block text-xs font-bold text-gray-400 mb-2 uppercase">
                            {selectedActivity === 'crossword' ? "Argomento del Cruciverba (es. Calcio, Cucina):" : "Messaggio o Istruzioni per la Dedica:"}
                        </label>
                        <textarea
                            rows={3}
                            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none bg-white"
                            placeholder={selectedActivity === 'crossword' ? "Es: Zio Mario, ama il calcio, la pizza e dormire..." : "Es: Auguri per i 50 anni, ringrazia per la festa..."}
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                        />
                        <button 
                            type="button" 
                            onClick={handleGenerateSuggestions}
                            disabled={isGeneratingSuggestions || !recipientName}
                            className={`absolute right-2 bottom-2 text-xs bg-blue-100 text-blue-600 hover:bg-blue-200 px-3 py-1.5 rounded-full font-bold flex items-center gap-1 transition-all ${isGeneratingSuggestions ? 'opacity-70 cursor-wait' : ''}`}
                            title="Genera idee"
                        >
                            {isGeneratingSuggestions ? <Loader2 size={12} className="animate-spin"/> : <Sparkles size={12}/>} 
                            Suggerimenti
                        </button>
                    </div>
                    {suggestedPhrases.length > 0 && (
                             <div className="mt-3 grid gap-2 animate-in slide-in-from-top-2">
                                 <p className="text-xs font-bold text-gray-400 uppercase">Idee per te:</p>
                                 {suggestedPhrases.map((phrase, i) => (
                                     <button 
                                        key={i}
                                        type="button"
                                        onClick={() => { setTopic(phrase); setSuggestedPhrases([]); }}
                                        className="text-left text-xs p-2 bg-white border border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors flex gap-2 group"
                                     >
                                        <span className="mt-0.5 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"><Check size={12}/></span>
                                        {phrase}
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
                    <p className="text-xs text-purple-700 mb-3">
                        Scrivi qui esattamente cosa vuoi che faccia l'IA. Definisci sia lo <b>stile</b> che il <b>contenuto</b>.
                    </p>
                    <textarea
                        rows={5}
                        className="w-full p-4 border-2 border-purple-200 bg-white rounded-xl focus:ring-2 focus:ring-purple-400 outline-none resize-none text-purple-900 placeholder-purple-300 font-medium"
                        placeholder="Es: Crea un cruciverba per Mario. Usa un tono sarcastico sui suoi 40 anni. Le parole devono riguardare il tennis e la cucina romana..."
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                    />
                </div>
            )}

            {/* TAB CONTENT: MANUAL */}
            {creationMode === 'manual' && (
                <div className="bg-orange-50/50 rounded-xl p-4 border border-orange-100 animate-in fade-in">
                    <label className="block text-xs font-bold text-orange-400 mb-2 uppercase">Cosa vuoi inserire?</label>
                    <ActivitySelector />
                    
                    <div className="border-t border-orange-200 pt-3">
                    {selectedActivity === 'crossword' ? (
                        <>
                             <div className="bg-orange-100 p-3 rounded-lg mb-4 flex gap-3 items-start">
                                <div className="bg-white p-1 rounded-full text-orange-500 mt-0.5"><Edit size={14} /></div>
                                <div>
                                    <h4 className="text-xs font-bold text-orange-900 mb-1">Inserimento Parole</h4>
                                    <p className="text-[10px] text-orange-800 leading-relaxed">
                                        Tu scegli le parole e gli indizi, noi calcoliamo solo l'incastro.
                                    </p>
                                </div>
                            </div>
                            <div className="space-y-2">
                                {manualWords.map((item, idx) => (
                                    <div key={idx} className="flex gap-2 relative">
                                        <div className="relative w-1/3">
                                            <input placeholder="PAROLA" value={item.word} onChange={(e) => handleManualChange(idx, 'word', e.target.value)} className="w-full p-2 border border-orange-200 bg-white rounded-lg font-bold uppercase focus:border-orange-400 outline-none text-sm" />
                                        </div>
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
                            <textarea
                                rows={4}
                                className="w-full p-3 border border-orange-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none resize-none bg-white"
                                placeholder="Scrivi qui i tuoi auguri..."
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                            />
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
            <div className="grid grid-cols-2 gap-4 mb-6">
                
                {/* BOX 1: COPERTINA */}
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:bg-gray-50 cursor-pointer relative transition-colors group overflow-hidden h-40 flex items-center justify-center bg-gray-50/50">
                        <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'extra')} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                        {processingImg === 'extra' ? (
                        <div className="flex flex-col items-center text-blue-500"><Loader2 className="animate-spin mb-1"/><span className="text-[10px] font-bold">Elaborazione...</span></div>
                        ) : extraImage ? (
                            <div className="relative w-full h-full group-hover:scale-95 transition-transform">
                                <img src={extraImage} className="h-full w-full object-contain mx-auto" />
                                <div className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-[10px] py-1 font-bold">COPERTINA</div>
                                <button type="button" onClick={(e) => { e.preventDefault(); removeImage('extra'); }} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 z-20 hover:bg-red-600"><Trash2 size={12}/></button>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center group-hover:scale-105 transition-transform px-2">
                                <div className="bg-white p-2 rounded-full shadow-sm mb-2"><ImageIcon className="text-blue-400" size={24}/></div>
                                <span className="text-xs font-bold text-gray-600 uppercase">Immagine di Copertina</span>
                                <span className="text-[9px] text-gray-400">(Logo, Disegno, etc.)</span>
                            </div>
                        )}
                </div>

                {/* BOX 2: FOTO INTERNO */}
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-0 text-center hover:bg-gray-50 cursor-pointer relative transition-colors group overflow-hidden h-40 flex items-center justify-center bg-gray-50/50">
                        <input type="file" accept="image/*" multiple onChange={(e) => handleImageUpload(e, 'photo')} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                        {processingImg === 'photo' ? (
                        <div className="flex flex-col items-center text-blue-500"><Loader2 className="animate-spin mb-1"/><span className="text-[10px] font-bold">Collage...</span></div>
                        ) : photos.length > 0 ? (
                            <div className="relative w-full h-full">
                                {renderPhotoPreview()} 
                                <div className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-[10px] py-1 font-bold">INTERNO</div>
                                <button type="button" onClick={(e) => { e.preventDefault(); removeImage('photo'); }} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 z-30 hover:bg-red-600"><Trash2 size={12}/></button>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center group-hover:scale-105 transition-transform px-2">
                                <div className="bg-white p-2 rounded-full shadow-sm mb-2"><Images className="text-purple-400" size={24}/></div>
                                <span className="text-xs font-bold text-gray-600 uppercase">Foto Ricordo</span>
                                <span className="text-[9px] text-gray-400">(Per collage interno)</span>
                            </div>
                        )}
                </div>
            </div>
          </div>

          <div className="mb-6 bg-gray-50 p-3 rounded-xl border border-gray-100">
             <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-bold text-gray-400 uppercase">Decorazioni</label>
                <span className={`text-xs font-bold ${selectedStickers.length >= 5 ? 'text-red-500' : 'text-blue-500'}`}>{selectedStickers.length}/5</span>
             </div>
             {selectedStickers.length > 0 && (
                <div className="flex gap-2 mb-3 bg-white p-2 rounded-lg border border-dashed border-gray-200 overflow-x-auto custom-scrollbar">
                    <span className="text-[10px] text-gray-400 font-bold uppercase shrink-0 py-1">I tuoi sticker:</span>
                    {selectedStickers.map((s, idx) => (
                        <button key={idx} type="button" onClick={() => toggleSticker(s)} className="text-lg hover:bg-red-100 rounded-full px-1" title="Clicca per rimuovere">{s}</button>
                    ))}
                </div>
             )}
             <div className="flex gap-2 overflow-x-auto pb-2 mb-2 custom-scrollbar">
                {Object.keys(STICKER_CATEGORIES).map(cat => (
                    <button key={cat} type="button" onClick={() => setActiveStickerTab(cat)} className={`text-xs px-2 py-1 rounded-full whitespace-nowrap transition-colors ${activeStickerTab === cat ? 'bg-blue-600 text-white font-bold' : 'bg-white text-gray-600 hover:bg-gray-100 border'}`}>{cat}</button>
                ))}
             </div>
             <div className="flex flex-wrap gap-2 justify-center max-h-32 overflow-y-auto p-1 custom-scrollbar bg-white rounded-lg border-inner shadow-inner">
                {STICKER_CATEGORIES[activeStickerTab].map(s => (
                    <button key={s} type="button" onClick={() => toggleSticker(s)} disabled={!selectedStickers.includes(s) && selectedStickers.length >= 5} className={`text-2xl p-2 rounded-full transition-all duration-300 ${selectedStickers.includes(s) ? 'bg-blue-50 shadow-md scale-110 ring-2 ring-blue-200' : 'opacity-60 hover:opacity-100 hover:scale-105'} ${!selectedStickers.includes(s) && selectedStickers.length >= 5 ? 'opacity-20 cursor-not-allowed' : ''}`}>{s}</button>
                ))}
            </div>
          </div>

          {error && <div className="p-4 bg-red-50 text-red-700 rounded-xl text-sm mb-4 flex items-center gap-3 border border-red-200 font-bold"><AlertCircle size={24} className="shrink-0" />{error}</div>}

          <button type="submit" disabled={loading || !!processingImg} className={`w-full py-4 rounded-xl text-white font-bold text-lg shadow-xl flex items-center justify-center gap-2 transition-all active:scale-95 ${loading || !!processingImg ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'}`}>
              <Wand2 /> {initialData ? "RIGENERA BIGLIETTO" : "GENERA BIGLIETTO"}
          </button>
      </div>
    </form>
  );
};
