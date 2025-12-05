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

const STICKER_DATA = [
    // NATALE
    { char: '🎅', tags: 'natale babbo christmas santa festa' },
    { char: '🎄', tags: 'natale albero tree christmas festa' },
    { char: '🎁', tags: 'regalo pacco dono gift natale compleanno festa' },
    { char: '❄️', tags: 'neve freddo inverno snow natale' },
    { char: '⛄', tags: 'pupazzo neve inverno natale' },
    { char: '🦌', tags: 'renna rudolph animale natale' },
    { char: '🕯️', tags: 'candela luce natale religione preghiera' },
    { char: '🌟', tags: 'stella star natale luce' },
    // COMPLEANNO
    { char: '🎂', tags: 'torta compleanno cibo dolce festa auguri' },
    { char: '🎈', tags: 'palloncino festa compleanno party' },
    { char: '🎉', tags: 'festa coriandoli party compleanno capodanno' },
    { char: '👑', tags: 'corona re regina principessa' },
    { char: '🥳', tags: 'festa faccina party felice' },
    // EVENTI
    { char: '🎓', tags: 'laurea tocco scuola università' },
    { char: '📜', tags: 'pergamena diploma laurea documento' },
    { char: '🏆', tags: 'coppa trofeo vittoria successo' },
    { char: '🕊️', tags: 'colomba pace pasqua cresima religione' },
    { char: '✝️', tags: 'croce religione gesù chiesa' },
    { char: '💍', tags: 'anello matrimonio fidanzamento gioiello' },
    { char: '❤️', tags: 'cuore amore love rosso' },
    { char: '🥂', tags: 'brindisi bicchieri cin cin festa' },
    { char: '🎃', tags: 'zucca halloween paura' },
    { char: '👻', tags: 'fantasma halloween paura spirito' },
    { char: '🐣', tags: 'pulcino pasqua animale uovo' },
    { char: '🥚', tags: 'uovo pasqua cibo' },
    // ACCESSORI
    { char: '🍕', tags: 'pizza cibo fame italia' },
    { char: '⚽', tags: 'calcio pallone sport' },
    { char: '🎮', tags: 'gioco videogiochi controller' },
    { char: '🐶', tags: 'cane animale cucciolo' },
    { char: '🐱', tags: 'gatto animale micio' },
    { char: '✈️', tags: 'aereo viaggio vacanza' },
    { char: '📷', tags: 'foto camera fotografia' },
    { char: '🍀', tags: 'fortuna quadrifoglio' }
];

export const Creator: React.FC<CreatorProps> = ({ onCreated, initialData }) => {
  const [contentType, setContentType] = useState<'crossword' | 'simple'>('crossword');
  const [mode, setMode] = useState<'ai' | 'manual'>('ai');
  const [theme, setTheme] = useState<ThemeType>('christmas');
  
  const [topic, setTopic] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [hiddenSolution, setHiddenSolution] = useState('');

  const [extraImage, setExtraImage] = useState<string | undefined>(undefined);
  const [photos, setPhotos] = useState<string[]>([]); 
  const [selectedStickers, setSelectedStickers] = useState<string[]>([]);
  const [stickerSearch, setStickerSearch] = useState('');

  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const [processingState, setProcessingState] = useState<{
      active: boolean;
      type: 'extra' | 'photo' | null;
      current: number;
      total: number;
  }>({ active: false, type: null, current: 0, total: 0 });

  const [manualWords, setManualWords] = useState<ManualInput[]>([
    { word: '', clue: '' },
    { word: '', clue: '' },
    { word: '', clue: '' }
  ]);

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

  const processImageFile = (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (event) => {
              const img = new Image();
              img.onload = () => {
                  const canvas = document.createElement('canvas');
                  let width = img.width;
                  let height = img.height;
                  const MAX_SIZE = 800;
                  if (width > MAX_SIZE || height > MAX_SIZE) {
                      if (width > height) { height *= MAX_SIZE / width; width = MAX_SIZE; }
                      else { width *= MAX_SIZE / height; height = MAX_SIZE; }
                  }
                  canvas.width = width;
                  canvas.height = height;
                  const ctx = canvas.getContext('2d');
                  if (!ctx) { reject("Canvas error"); return; }
                  ctx.fillStyle = "#FFFFFF";
                  ctx.fillRect(0, 0, width, height);
                  ctx.drawImage(img, 0, 0, width, height);
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
    setError(null);
    const fileArray = Array.from(files);
    let filesToProcess = fileArray;
    if (type === 'photo') {
        const remainingSlots = 9 - photos.length;
        if (remainingSlots <= 0) { setError("Hai già raggiunto il limite di 9 foto."); return; }
        filesToProcess = fileArray.slice(0, remainingSlots);
    } else {
        filesToProcess = [fileArray[0]];
    }

    setProcessingState({ active: true, type, current: 0, total: filesToProcess.length });
    const newPhotos: string[] = [];

    for (let i = 0; i < filesToProcess.length; i++) {
        setProcessingState(prev => ({ ...prev, current: i + 1 }));
        try {
            await new Promise(r => setTimeout(r, 100));
            const dataUrl = await processImageFile(filesToProcess[i]);
            if (type === 'extra') setExtraImage(dataUrl);
            else newPhotos.push(dataUrl);
        } catch (err) { console.error(err); }
    }

    if (type === 'photo' && newPhotos.length > 0) setPhotos(prev => [...prev, ...newPhotos].slice(0, 9));
    setProcessingState({ active: false, type: null, current: 0, total: 0 });
    e.target.value = '';
  };

  const toggleSticker = (sticker: string) => {
    if (selectedStickers.includes(sticker)) setSelectedStickers(selectedStickers.filter(s => s !== sticker));
    else if (selectedStickers.length < 5) setSelectedStickers([...selectedStickers, sticker]);
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
      if (contentType === 'crossword') {
          if (mode === 'manual') {
            const validWords = manualWords.filter(w => w.word.trim() && w.clue.trim());
            if (validWords.length < 2) throw new Error("Inserisci almeno 2 parole complete.");
            inputData = validWords;
          } else {
            if (!topic.trim()) throw new Error("Inserisci un argomento.");
          }
      }
      if (!recipientName.trim()) throw new Error("Inserisci il nome.");

      const data = await generateCrossword(
        mode, theme, inputData, hiddenSolution.trim().toUpperCase() || undefined,
        { recipientName, eventDate, images: { extraImage, photos }, stickers: selectedStickers, contentType },
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
    const count = photos.length;
    if (count === 0) return null;
    let gridClass = count === 1 ? 'grid-cols-1' : count <= 4 ? 'grid-cols-2' : 'grid-cols-3';
    return (
        <div className={`w-full h-full grid gap-0.5 overflow-hidden bg-gray-100 ${gridClass}`}>
            {photos.map((p, i) => (
                <div key={i} className="relative overflow-hidden w-full h-full"><img src={p} className="w-full h-full object-cover" /></div>
            ))}
        </div>
    );
  };

  const filteredStickers = stickerSearch.trim() === '' ? STICKER_DATA : STICKER_DATA.filter(s => s.tags.includes(stickerSearch.toLowerCase()) || s.char.includes(stickerSearch));

  return (
    <form onSubmit={handleGenerate} className={`max-w-2xl mx-auto bg-white/95 backdrop-blur p-6 rounded-3xl shadow-xl border-2 border-white/50 relative transition-all`}>
      
      {loading && (
        <div className="absolute inset-0 bg-white/95 z-50 flex items-center justify-center backdrop-blur-sm">
             <div className="text-center p-6 bg-white rounded-2xl shadow-xl border-4 border-blue-100 max-w-xs mx-4">
                 <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-2" />
                 <p className="text-gray-600 text-sm">{statusMsg}</p>
             </div>
        </div>
      )}

      <div className={`transition-opacity duration-300 ${loading ? 'opacity-20 pointer-events-none' : 'opacity-100'}`}>
          <div className="text-center mb-6">
            <h2 className="font-bold text-2xl text-gray-800 font-body">Crea il Tuo Biglietto</h2>
          </div>

          {/* 1. Content Type */}
          <div className="mb-4 flex gap-3">
              <button type="button" onClick={() => setContentType('crossword')} className={`flex-1 p-3 rounded-xl border flex flex-col items-center ${contentType === 'crossword' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200'}`}><Grid3X3 size={20}/><span className="text-xs font-bold mt-1">Cruciverba</span></button>
              <button type="button" onClick={() => setContentType('simple')} className={`flex-1 p-3 rounded-xl border flex flex-col items-center ${contentType === 'simple' ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200'}`}><MailOpen size={20}/><span className="text-xs font-bold mt-1">Solo Auguri</span></button>
          </div>

          {/* 2. Theme */}
          <div className="mb-4">
            <label className="block text-[10px] font-bold text-gray-400 mb-2 uppercase text-center">Evento</label>
            <div className="grid grid-cols-5 gap-2">
              {THEMES.map((t) => (
                <button key={t.id} type="button" onClick={() => setTheme(t.id)} className={`flex flex-col items-center justify-center p-1.5 rounded-lg ${theme === t.id ? `${t.color} text-white scale-105 shadow-md` : 'bg-gray-100'}`}>
                  <t.icon size={16} />
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <input required type="text" placeholder="Nome Festeggiato" className="w-full p-2 border-2 border-gray-200 rounded-lg font-bold focus:border-blue-400 outline-none text-sm" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} />
            <input type="text" placeholder="Data Evento" className="w-full p-2 border-2 border-gray-200 rounded-lg font-bold focus:border-blue-400 outline-none text-sm" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
          </div>

          {contentType === 'crossword' && (
              <div className="mb-4 bg-gray-50 p-3 rounded-lg border border-gray-100">
                <div className="flex bg-white rounded-md p-1 mb-2 border border-gray-200 shadow-sm">
                    <button type="button" onClick={() => setMode('ai')} className={`flex-1 py-1 rounded text-xs font-bold ${mode === 'ai' ? 'bg-blue-100 text-blue-700' : 'text-gray-400'}`}>✨ AI</button>
                    <button type="button" onClick={() => setMode('manual')} className={`flex-1 py-1 rounded text-xs font-bold ${mode === 'manual' ? 'bg-blue-100 text-blue-700' : 'text-gray-400'}`}>📝 Manuale</button>
                </div>
                {mode === 'ai' ? (
                    <textarea rows={2} className="w-full p-2 border border-gray-200 rounded-lg text-sm resize-none" placeholder="Argomento (es: Zio Carlo...)" value={topic} onChange={(e) => setTopic(e.target.value)} />
                ) : (
                    <div className="space-y-2">
                        {manualWords.map((item, idx) => (
                            <div key={idx} className="flex gap-2"><input placeholder="PAROLA" value={item.word} onChange={(e) => handleManualChange(idx, 'word', e.target.value)} className="w-1/3 p-1.5 border rounded text-xs font-bold uppercase" /><input placeholder="Indizio" value={item.clue} onChange={(e) => handleManualChange(idx, 'clue', e.target.value)} className="flex-1 p-1.5 border rounded text-xs" /></div>
                        ))}
                        <button type="button" onClick={addRow} className="text-blue-500 text-xs font-bold flex items-center gap-1"><Plus size={12}/> Riga</button>
                    </div>
                )}
              </div>
          )}

          {contentType === 'crossword' && (
              <div className="mb-4"><input type="text" placeholder="SOLUZIONE SEGRETA (Opzionale)" className="w-full p-2 border border-yellow-300 rounded text-sm uppercase font-bold text-center bg-yellow-50" value={hiddenSolution} onChange={(e) => setHiddenSolution(e.target.value)} maxLength={15} /></div>
          )}

          <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-2 h-24 flex items-center justify-center relative cursor-pointer hover:bg-gray-50">
                    <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'extra')} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                    {processingState.active && processingState.type === 'extra' ? <Loader2 className="animate-spin text-blue-500"/> : extraImage ? <div className="w-full h-full relative"><img src={extraImage} className="w-full h-full object-contain" /><button onClick={(e) => {e.preventDefault(); removeImage('extra')}} className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-0.5"><Trash2 size={10}/></button></div> : <div className="text-center"><Upload size={20} className="mx-auto text-gray-400"/><span className="text-[10px] font-bold text-gray-500 block">LOGO</span></div>}
              </div>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-2 h-24 flex items-center justify-center relative cursor-pointer hover:bg-gray-50">
                    <input type="file" accept="image/*" multiple onChange={(e) => handleImageUpload(e, 'photo')} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                    {processingState.active && processingState.type === 'photo' ? <div className="text-center"><Loader2 className="animate-spin text-blue-500 mx-auto"/><span className="text-[8px]">{processingState.current}/{processingState.total}</span></div> : photos.length > 0 ? <div className="w-full h-full relative">{renderPhotoPreview()}<button onClick={(e) => {e.preventDefault(); removeImage('photo')}} className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-0.5 z-20"><Trash2 size={10}/></button></div> : <div className="text-center"><Images size={20} className="mx-auto text-gray-400"/><span className="text-[10px] font-bold text-gray-500 block">FOTO (Max 9)</span></div>}
              </div>
          </div>

          <div className="mb-4 bg-gray-50 p-2 rounded-lg border border-gray-100">
             <div className="flex gap-2 mb-2">
                 <Search size={14} className="text-gray-400"/>
                 <input type="text" placeholder="Cerca stickers..." className="bg-transparent text-xs w-full outline-none" value={stickerSearch} onChange={(e) => setStickerSearch(e.target.value)}/>
                 <span className="text-[10px] font-bold text-blue-500 whitespace-nowrap">{selectedStickers.length}/5</span>
             </div>
             <div className="grid grid-cols-8 gap-1 h-32 overflow-y-auto custom-scrollbar">
                {filteredStickers.map((s, idx) => (
                    <button key={`${s.char}-${idx}`} type="button" onClick={() => toggleSticker(s.char)} className={`text-xl flex items-center justify-center rounded hover:bg-gray-200 ${selectedStickers.includes(s.char) ? 'bg-blue-100 ring-1 ring-blue-300' : ''}`} disabled={!selectedStickers.includes(s.char) && selectedStickers.length >= 5}>{s.char}</button>
                ))}
            </div>
          </div>

          {error && <div className="text-red-500 text-xs font-bold text-center mb-2">{error}</div>}

          <button type="submit" disabled={loading || processingState.active} className={`w-full py-3 rounded-xl text-white font-bold shadow-lg flex items-center justify-center gap-2 ${loading ? 'bg-gray-400' : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:scale-[1.02] transition-transform'}`}>
              <Wand2 size={18} /> {initialData ? "RIGENERA" : "CREA BIGLIETTO"}
          </button>
      </div>
    </form>
  );
};
