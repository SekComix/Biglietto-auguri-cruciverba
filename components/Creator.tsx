import React, { useState, useEffect } from 'react';
import { generateCrossword } from '../services/geminiService';
import { CrosswordData, ManualInput, ThemeType } from '../types';
import { Loader2, Wand2, Plus, Trash2, Gift, PartyPopper, CalendarHeart, Crown, KeyRound, Image as ImageIcon, Upload, Calendar, AlertCircle } from 'lucide-react';

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

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return; 
    
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
      setError(err.message || "Errore sconosciuto. Riprova.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleGenerate} className={`max-w-3xl mx-auto bg-white/95 backdrop-blur p-6 md:p-8 rounded-3xl shadow-2xl border-2 border-white/50 relative overflow-hidden transition-all`}>
      
      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 bg-white/95 z-50 flex items-center justify-center backdrop-blur-sm cursor-wait">
             <div className="text-center p-8 bg-white rounded-3xl shadow-xl border-4 border-blue-100 max-w-sm mx-4">
                 <Loader2 className="w-16 h-16 text-blue-600 animate-spin mx-auto mb-4" />
                 <h3 className="text-xl font-bold text-gray-800 mb-2">Creazione in corso...</h3>
                 <p className="text-gray-500 text-sm">Se i server sono carichi, potrei metterci qualche secondo in più per riprovare automaticamente.</p>
             </div>
        </div>
      )}

      <div className={`transition-opacity duration-500 ${loading ? 'opacity-20 pointer-events-none' : 'opacity-100'}`}>
          <div className="text-center mb-8">
            <h2 className="font-bold text-3xl md:text-4xl text-gray-800 mb-2 font-body">Crea il Tuo Biglietto</h2>
            <p className="text-gray-500">Intelligenza Artificiale v2.5 (Veloce)</p>
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
                  className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all ${theme === t.id ? `${t.color} text-white scale-105 shadow-lg` : 'bg-gray-100 hover:bg-gray-200'}`}
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

          {/* Mode */}
          <div className="mb-6 bg-gray-50 p-4 rounded-xl border border-gray-100">
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

          {/* Solution */}
          <div className="mb-6 p-3 bg-yellow-50 rounded-xl border border-yellow-200">
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

          {/* Visuals */}
          <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:bg-gray-50 cursor-pointer relative transition-colors group">
                    <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'extra')} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                    {extraImage ? <img src={extraImage} className="h-16 mx-auto object-contain" /> : <div className="flex flex-col items-center group-hover:scale-105 transition-transform"><Upload className="text-gray-400 mb-1"/><span className="text-[10px] font-bold text-gray-500 uppercase">QR / Vignetta</span></div>}
              </div>
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:bg-gray-50 cursor-pointer relative transition-colors group">
                    <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'photo')} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                    {photo ? <img src={photo} className="h-16 mx-auto object-cover rounded shadow-sm" /> : <div className="flex flex-col items-center group-hover:scale-105 transition-transform"><ImageIcon className="text-gray-400 mb-1"/><span className="text-[10px] font-bold text-gray-500 uppercase">Foto Ricordo</span></div>}
              </div>
          </div>

          {/* Stickers */}
          <div className="mb-6 bg-gray-50 p-3 rounded-xl border border-gray-100">
             <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-bold text-gray-400 uppercase">Decorazioni</label>
                <span className={`text-xs font-bold ${selectedStickers.length >= 4 ? 'text-red-500' : 'text-blue-500'}`}>
                    {selectedStickers.length}/4
                </span>
             </div>
             <div className="flex flex-wrap gap-2 justify-center">
                {STICKERS.map(s => (
                    <button 
                        key={s} 
                        type="button" 
                        onClick={() => toggleSticker(s)} 
                        disabled={!selectedStickers.includes(s) && selectedStickers.length >= 4}
                        className={`text-2xl p-2 rounded-full transition-all duration-300 
                            ${selectedStickers.includes(s) ? 'bg-white shadow-md scale-110 ring-2 ring-blue-200' : 'opacity-50 hover:opacity-100'}
                            ${!selectedStickers.includes(s) && selectedStickers.length >= 4 ? 'opacity-20 cursor-not-allowed' : ''}
                        `}
                    >
                        {s}
                    </button>
                ))}
            </div>
            {selectedStickers.length >= 4 && <p className="text-[10px] text-red-500 text-center mt-2 font-bold">Hai raggiunto il massimo di 4 decorazioni.</p>}
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
