import React, { useState, useEffect } from 'react';
import { generateCrossword } from '../services/geminiService';
import { CrosswordData, ManualInput, ThemeType } from '../types';
import { Loader2, Wand2, Plus, Trash2, Gift, PartyPopper, CalendarHeart, Crown, KeyRound, Image as ImageIcon, Smile, Upload, Calendar } from 'lucide-react';

interface CreatorProps {
  onCreated: (data: CrosswordData) => void;
}

const THEMES: { id: ThemeType; label: string; icon: any; color: string }[] = [
  { id: 'christmas', label: 'Natale', icon: Gift, color: 'bg-red-600' },
  { id: 'birthday', label: 'Compleanno', icon: PartyPopper, color: 'bg-pink-500' },
  { id: 'easter', label: 'Pasqua', icon: CalendarHeart, color: 'bg-green-400' },
  { id: 'elegant', label: 'Elegante', icon: Crown, color: 'bg-gray-800' },
];

const STICKERS = ['🎅', '🎄', '🎁', '🎂', '🎈', '🎉', '🐣', '🌸', '🥂', '❤️', '⭐', '🕯️'];

const Creator: React.FC<CreatorProps> = ({ onCreated }) => {
  const [mode, setMode] = useState<'ai' | 'manual'>('ai');
  const [theme, setTheme] = useState<ThemeType>('christmas');
  
  // Basic Data
  const [topic, setTopic] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [hiddenSolution, setHiddenSolution] = useState('');

  // Visual Assets
  const [extraImage, setExtraImage] = useState<string | undefined>(undefined);
  const [photo, setPhoto] = useState<string | undefined>(undefined);
  const [selectedStickers, setSelectedStickers] = useState<string[]>([]);

  // Manual Words
  const [manualWords, setManualWords] = useState<ManualInput[]>([
    { word: '', clue: '' },
    { word: '', clue: '' },
    { word: '', clue: '' }
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // File Handlers
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'extra' | 'photo') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (type === 'extra') setExtraImage(reader.result as string);
        else setPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleSticker = (sticker: string) => {
    if (selectedStickers.includes(sticker)) {
      setSelectedStickers(selectedStickers.filter(s => s !== sticker));
    } else {
      if (selectedStickers.length < 4) {
        setSelectedStickers([...selectedStickers, sticker]);
      }
    }
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

  // Timeout logic - Aumentato a 90 secondi
  useEffect(() => {
    let timer: any;
    if (loading) {
        timer = setTimeout(() => {
            setLoading(false);
            setError("L'IA sta impiegando più del previsto. Potrebbe esserci molto traffico. Riprova tra un istante.");
        }, 90000); // 90s timeout
    }
    return () => clearTimeout(timer);
  }, [loading]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return; // Prevent double clicks
    
    setLoading(true);
    setError(null);

    try {
      let inputData: string | ManualInput[] = topic;
      
      if (mode === 'manual') {
        const validWords = manualWords.filter(w => w.word.trim() && w.clue.trim());
        if (validWords.length < 2) throw new Error("Inserisci almeno 2 parole complete.");
        inputData = validWords;
      } else {
        if (!topic.trim()) throw new Error("Inserisci un argomento.");
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
          images: { extraImage, photo },
          stickers: selectedStickers
        }
      );
      
      onCreated(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Errore sconosciuto nella generazione.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleGenerate} className={`max-w-3xl mx-auto bg-white/95 backdrop-blur p-6 md:p-8 rounded-3xl shadow-2xl border-2 border-white/50 relative overflow-hidden transition-all ${loading ? 'pointer-events-none' : ''}`}>
      
      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 bg-white/60 z-50 flex items-center justify-center backdrop-blur-sm">
             <div className="text-center p-6 bg-white rounded-2xl shadow-xl border border-gray-100 animate-pulse">
                 <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-2" />
                 <p className="font-bold text-gray-700">L'IA sta creando il tuo biglietto...</p>
                 <p className="text-xs text-gray-500">Non chiudere la pagina</p>
             </div>
        </div>
      )}

      <div className={`transition-opacity ${loading ? 'opacity-40' : 'opacity-100'}`}>
          <div className="text-center mb-8">
            <h2 className="font-bold text-3xl md:text-4xl text-gray-800 mb-2 font-body">Crea il Tuo Biglietto</h2>
            <p className="text-gray-500">Personalizza, Stampa e Regala</p>
          </div>

          {/* Theme */}
          <div className="mb-6">
            <label className="block text-xs font-bold text-gray-400 mb-3 uppercase tracking-wider text-center">1. Evento</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTheme(t.id)}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all ${theme === t.id ? `${t.color} text-white scale-105` : 'bg-gray-100'}`}
                >
                  <t.icon size={24} className="mb-2" />
                  <span className="text-xs font-bold">{t.label}</span>
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
                  className="w-full p-3 border-2 border-gray-200 rounded-xl font-bold"
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
                    className="w-full p-3 pl-10 border-2 border-gray-200 rounded-xl font-bold"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Mode */}
          <div className="mb-6 bg-gray-50 p-4 rounded-xl">
            <div className="flex bg-white rounded-lg p-1 mb-4 border border-gray-200">
                <button type="button" onClick={() => setMode('ai')} className={`flex-1 py-2 rounded-md font-bold text-sm ${mode === 'ai' ? 'bg-blue-100 text-blue-700' : 'text-gray-400'}`}>✨ AI Magic</button>
                <button type="button" onClick={() => setMode('manual')} className={`flex-1 py-2 rounded-md font-bold text-sm ${mode === 'manual' ? 'bg-blue-100 text-blue-700' : 'text-gray-400'}`}>📝 Manuale</button>
            </div>

            {mode === 'ai' ? (
                <textarea
                    rows={2}
                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                    placeholder="Argomento (es: Zio Carlo, ama la pesca e il vino...)"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                />
            ) : (
                <div className="space-y-2">
                    {manualWords.map((item, idx) => (
                        <div key={idx} className="flex gap-2">
                            <input placeholder="PAROLA" value={item.word} onChange={(e) => handleManualChange(idx, 'word', e.target.value)} className="w-1/3 p-2 border rounded font-bold uppercase" />
                            <input placeholder="Indizio" value={item.clue} onChange={(e) => handleManualChange(idx, 'clue', e.target.value)} className="flex-1 p-2 border rounded" />
                            {manualWords.length > 2 && <button type="button" onClick={() => removeRow(idx)}><Trash2 size={18} className="text-gray-400" /></button>}
                        </div>
                    ))}
                    <button type="button" onClick={addRow} className="text-blue-500 text-sm font-bold flex items-center gap-1 mt-2"><Plus size={16}/> Aggiungi riga</button>
                </div>
            )}
          </div>

          {/* Solution */}
          <div className="mb-6 p-3 bg-yellow-50 rounded-xl border border-yellow-200">
              <label className="flex items-center gap-2 text-sm font-bold text-yellow-800 mb-2"><KeyRound size={16}/> Parola Nascosta (Opzionale)</label>
              <input 
                type="text" 
                placeholder="SOLUZIONE SEGRETA" 
                className="w-full p-2 border border-yellow-300 rounded uppercase font-bold text-center tracking-widest"
                value={hiddenSolution}
                onChange={(e) => setHiddenSolution(e.target.value)}
                maxLength={15}
              />
          </div>

          {/* Visuals */}
          <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:bg-gray-50 cursor-pointer relative">
                    <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'extra')} className="absolute inset-0 opacity-0 cursor-pointer" />
                    {extraImage ? <img src={extraImage} className="h-12 mx-auto object-contain" /> : <div className="flex flex-col items-center"><Upload className="text-gray-400 mb-1"/><span className="text-[10px] font-bold text-gray-500 uppercase">Extra / QR / Vignetta</span></div>}
              </div>
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:bg-gray-50 cursor-pointer relative">
                    <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'photo')} className="absolute inset-0 opacity-0 cursor-pointer" />
                    {photo ? <img src={photo} className="h-12 mx-auto object-cover rounded" /> : <div className="flex flex-col items-center"><ImageIcon className="text-gray-400 mb-1"/><span className="text-[10px] font-bold text-gray-500 uppercase">Foto Ricordo</span></div>}
              </div>
          </div>

          {/* Stickers */}
          <div className="mb-6 flex flex-wrap gap-2 justify-center bg-gray-50 p-2 rounded-xl">
            {STICKERS.map(s => (
                <button key={s} type="button" onClick={() => toggleSticker(s)} className={`text-xl p-2 rounded-full transition-all ${selectedStickers.includes(s) ? 'bg-white shadow scale-125' : 'opacity-60'}`}>{s}</button>
            ))}
          </div>

          {error && <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm mb-4 text-center font-bold">{error}</div>}

          <button
              type="submit"
              disabled={loading}
              className={`w-full py-4 rounded-xl text-white font-bold text-lg shadow-xl flex items-center justify-center gap-2 transition-all active:scale-95 ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'}`}
            >
              <Wand2 /> GENERA BIGLIETTO
          </button>
      </div>
    </form>
  );
};

export default Creator;
