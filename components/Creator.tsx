import React, { useState } from 'react';
import { generateCrossword } from '../services/geminiService';
import { CrosswordData, ManualInput, ThemeType } from '../types';
import { Loader2, Wand2, Plus, Trash2, Gift, PartyPopper, CalendarHeart, Crown, KeyRound, Image as ImageIcon, Smile, Upload } from 'lucide-react';

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
  const [hiddenSolution, setHiddenSolution] = useState('');

  // Visual Assets
  const [logo, setLogo] = useState<string | undefined>(undefined);
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
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'photo') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (type === 'logo') setLogo(reader.result as string);
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
          images: { logo, photo },
          stickers: selectedStickers
        }
      );
      
      onCreated(data);
    } catch (err: any) {
      setError(err.message || "Errore nella generazione.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleGenerate} className="max-w-3xl mx-auto bg-white/95 backdrop-blur p-6 md:p-8 rounded-3xl shadow-2xl border-2 border-white/50">
      <div className="text-center mb-8">
        <h2 className="font-bold text-3xl md:text-4xl text-gray-800 mb-2 font-body">Crea il Tuo Biglietto</h2>
        <p className="text-gray-500">Personalizza ogni dettaglio per un regalo unico.</p>
      </div>

      {/* Theme Selector */}
      <div className="mb-8">
        <label className="block text-xs font-bold text-gray-400 mb-3 uppercase tracking-wider text-center">1. Scegli Evento</label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {THEMES.map((t) => {
            const Icon = t.icon;
            const isSelected = theme === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTheme(t.id)}
                className={`
                  flex flex-col items-center justify-center p-3 rounded-xl transition-all
                  ${isSelected ? `${t.color} text-white shadow-lg scale-105` : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}
                `}
              >
                <Icon size={24} className="mb-2" />
                <span className="text-xs font-bold">{t.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Recipient */}
      <div className="mb-6">
         <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">2. Per chi è?</label>
         <input 
            type="text" 
            placeholder="Nome del festeggiato (es. Marco)" 
            className="w-full p-3 border-2 border-gray-200 rounded-xl font-bold text-lg focus:border-blue-500 focus:ring-0"
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
         />
      </div>

      {/* Mode Switcher */}
      <div className="mb-6">
        <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">3. Contenuto</label>
        <div className="flex p-1 bg-gray-100 rounded-xl mb-4">
            <button
            type="button"
            onClick={() => setMode('ai')}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${mode === 'ai' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-400'}`}
            >
            ✨ Genera con AI
            </button>
            <button
            type="button"
            onClick={() => setMode('manual')}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${mode === 'manual' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-400'}`}
            >
            📝 Manuale
            </button>
        </div>

        {mode === 'ai' ? (
            <textarea
                rows={3}
                className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-0 text-lg"
                placeholder="Argomento (es: Appassionato di pesca, vino rosso e ama il mare...)"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
            />
        ) : (
            <div className="space-y-2">
                {manualWords.map((item, idx) => (
                    <div key={idx} className="flex gap-2">
                    <input 
                        placeholder="Parola" 
                        className="w-1/3 p-2 border border-gray-200 rounded-lg text-sm font-bold uppercase"
                        value={item.word}
                        onChange={(e) => handleManualChange(idx, 'word', e.target.value)}
                    />
                    <input 
                        placeholder="Indizio" 
                        className="flex-1 p-2 border border-gray-200 rounded-lg text-sm"
                        value={item.clue}
                        onChange={(e) => handleManualChange(idx, 'clue', e.target.value)}
                    />
                    {manualWords.length > 2 && (
                        <button type="button" onClick={() => removeRow(idx)} className="text-gray-400 hover:text-red-500">
                        <Trash2 size={18} />
                        </button>
                    )}
                    </div>
                ))}
                <button type="button" onClick={addRow} className="text-sm font-bold text-blue-500 flex items-center gap-1 mt-2">
                    <Plus size={16} /> Aggiungi riga
                </button>
            </div>
        )}
      </div>

      {/* Hidden Solution */}
      <div className="mb-6 p-4 bg-yellow-50 rounded-xl border border-yellow-100">
          <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
            <KeyRound size={16} className="text-yellow-500" />
            Parola Nascosta (Opzionale)
          </label>
          <input
            type="text"
            className="w-full p-2 border border-yellow-200 rounded-lg focus:border-yellow-400 focus:ring-0 uppercase font-bold tracking-widest text-center bg-white"
            placeholder="ES. TI VOGLIO BENE"
            value={hiddenSolution}
            onChange={(e) => setHiddenSolution(e.target.value)}
            maxLength={18}
          />
      </div>

      {/* Visual Customization (Collapsible or visible) */}
      <div className="mb-8 border-t border-gray-100 pt-6">
        <label className="block text-xs font-bold text-gray-400 mb-4 uppercase tracking-wider text-center">4. Personalizzazione Grafica</label>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
             {/* Logo Upload */}
             <div className="relative border-2 border-dashed border-gray-300 rounded-xl p-4 flex flex-col items-center justify-center hover:bg-gray-50 transition-colors cursor-pointer group">
                <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'logo')} className="absolute inset-0 opacity-0 cursor-pointer" />
                {logo ? (
                    <img src={logo} alt="Logo" className="h-16 object-contain mb-2" />
                ) : (
                    <Upload className="text-gray-400 mb-2 group-hover:text-blue-500" />
                )}
                <span className="text-xs font-bold text-gray-500">Carica il tuo Logo</span>
             </div>

             {/* Photo Upload */}
             <div className="relative border-2 border-dashed border-gray-300 rounded-xl p-4 flex flex-col items-center justify-center hover:bg-gray-50 transition-colors cursor-pointer group">
                <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'photo')} className="absolute inset-0 opacity-0 cursor-pointer" />
                {photo ? (
                    <img src={photo} alt="Foto" className="h-16 object-cover rounded mb-2" />
                ) : (
                    <ImageIcon className="text-gray-400 mb-2 group-hover:text-blue-500" />
                )}
                <span className="text-xs font-bold text-gray-500">Aggiungi Foto Ricordo</span>
             </div>
        </div>

        {/* Stickers */}
        <div>
            <div className="text-xs font-bold text-gray-500 mb-2 flex items-center gap-2"><Smile size={14}/> Scegli max 4 Stickers</div>
            <div className="flex flex-wrap gap-2 justify-center">
                {STICKERS.map(s => (
                    <button
                        key={s}
                        type="button"
                        onClick={() => toggleSticker(s)}
                        className={`text-2xl w-10 h-10 rounded-full flex items-center justify-center transition-all ${selectedStickers.includes(s) ? 'bg-blue-100 ring-2 ring-blue-500 scale-110' : 'bg-gray-50 hover:bg-gray-100'}`}
                    >
                        {s}
                    </button>
                ))}
            </div>
        </div>
      </div>

      {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 mb-4">{error}</div>}

      <button
          type="submit"
          disabled={loading}
          className={`
            w-full py-4 px-6 rounded-xl text-white font-bold shadow-xl transition-all transform active:scale-95 flex items-center justify-center gap-2
            ${loading ? 'opacity-70 cursor-wait' : 'hover:-translate-y-1'}
            ${theme === 'christmas' ? 'bg-xmas-red hover:bg-red-700' : ''}
            ${theme === 'birthday' ? 'bg-bday-primary hover:bg-pink-600' : ''}
            ${theme === 'easter' ? 'bg-green-400 hover:bg-green-500' : ''}
            ${theme === 'elegant' ? 'bg-elegant-bg border border-elegant-gold text-elegant-gold' : ''}
          `}
        >
          {loading ? <><Loader2 className="animate-spin" /> Elaborazione...</> : <><Wand2 /> Crea Biglietto</>}
      </button>
    </form>
  );
};

export default Creator;
