import React, { useState } from 'react';
import { generateCrossword } from '../services/geminiService';
import { CrosswordData, ManualInput, ThemeType } from '../types';
import { Loader2, Wand2, Plus, Trash2, Gift, PartyPopper, CalendarHeart, Crown, KeyRound } from 'lucide-react';

interface CreatorProps {
  onCreated: (data: CrosswordData) => void;
}

const THEMES: { id: ThemeType; label: string; icon: any; color: string }[] = [
  { id: 'christmas', label: 'Natale', icon: Gift, color: 'bg-red-600' },
  { id: 'birthday', label: 'Compleanno', icon: PartyPopper, color: 'bg-pink-500' },
  { id: 'easter', label: 'Pasqua', icon: CalendarHeart, color: 'bg-green-400' },
  { id: 'elegant', label: 'Elegante (18°/50°)', icon: Crown, color: 'bg-gray-800' },
];

const Creator: React.FC<CreatorProps> = ({ onCreated }) => {
  const [mode, setMode] = useState<'ai' | 'manual'>('ai');
  const [theme, setTheme] = useState<ThemeType>('christmas');
  
  // AI State
  const [topic, setTopic] = useState('');
  
  // Hidden Solution
  const [hiddenSolution, setHiddenSolution] = useState('');

  // Manual State
  const [manualWords, setManualWords] = useState<ManualInput[]>([
    { word: '', clue: '' },
    { word: '', clue: '' },
    { word: '', clue: '' },
    { word: '', clue: '' }
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addRow = () => {
    setManualWords([...manualWords, { word: '', clue: '' }]);
  };

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
        // Filter empty
        const validWords = manualWords.filter(w => w.word.trim() && w.clue.trim());
        if (validWords.length < 2) {
          throw new Error("Inserisci almeno 2 parole complete.");
        }
        inputData = validWords;
      } else {
        if (!topic.trim()) throw new Error("Inserisci un argomento.");
      }

      const cleanSolution = hiddenSolution.trim().toUpperCase();
      const data = await generateCrossword(mode, theme, inputData, cleanSolution || undefined);
      onCreated(data);
    } catch (err: any) {
      setError(err.message || "Errore nella generazione.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white/95 backdrop-blur p-6 md:p-8 rounded-3xl shadow-2xl border-2 border-white/50">
      <div className="text-center mb-8">
        <h2 className="font-bold text-3xl md:text-4xl text-gray-800 mb-2 font-body">Crea il Biglietto</h2>
        <p className="text-gray-500">Scegli lo stile e il contenuto del tuo cruciverba.</p>
      </div>

      {/* Theme Selector */}
      <div className="mb-8">
        <label className="block text-sm font-bold text-gray-400 mb-3 uppercase tracking-wider text-center">Scegli Evento</label>
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

      {/* Mode Switcher */}
      <div className="flex p-1 bg-gray-100 rounded-xl mb-6">
        <button
          onClick={() => setMode('ai')}
          className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${mode === 'ai' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-400'}`}
        >
          ✨ Genera con AI
        </button>
        <button
          onClick={() => setMode('manual')}
          className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${mode === 'manual' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-400'}`}
        >
          📝 Inserisci Parole
        </button>
      </div>

      <form onSubmit={handleGenerate} className="space-y-6">
        
        {mode === 'ai' ? (
          <div className="animate-fade-in space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Argomento o Dedica</label>
              <textarea
                rows={3}
                className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-0 transition-colors text-lg"
                placeholder="Es: I 18 anni di Giulia, la passione per il calcio, ricordi di scuola..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>
        ) : (
          <div className="animate-fade-in space-y-3">
             <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-bold text-gray-700">Le tue parole e indizi</label>
                <span className="text-xs text-gray-400">L'IA le incrocerà per te</span>
             </div>
             <div className="max-h-[300px] overflow-y-auto pr-2 space-y-2 clue-scroll">
               {manualWords.map((item, idx) => (
                 <div key={idx} className="flex gap-2">
                   <input 
                      placeholder="Parola" 
                      className="w-1/3 p-2 border border-gray-200 rounded-lg text-sm font-bold uppercase"
                      value={item.word}
                      onChange={(e) => handleManualChange(idx, 'word', e.target.value)}
                   />
                   <input 
                      placeholder="Indizio (es: Il colore del mare)" 
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
             </div>
             <button 
               type="button" 
               onClick={addRow}
               className="w-full py-2 border-2 border-dashed border-gray-300 text-gray-500 rounded-lg hover:border-gray-400 hover:text-gray-600 flex items-center justify-center gap-2 text-sm font-bold"
             >
               <Plus size={16} /> Aggiungi riga
             </button>
          </div>
        )}

        {/* Hidden Solution Field (Shared across modes) */}
        <div className="animate-fade-in border-t border-gray-100 pt-4">
          <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
            <KeyRound size={16} className="text-yellow-500" />
            Parola Nascosta / Soluzione (Opzionale)
          </label>
          <p className="text-xs text-gray-400 mb-2">
            Inserisci una parola (es. "PALERMO") che apparirà nelle caselle speciali risolvendo il gioco.
          </p>
          <input
            type="text"
            className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-yellow-400 focus:ring-0 uppercase font-bold tracking-widest text-center"
            placeholder="SOLUZIONE"
            value={hiddenSolution}
            onChange={(e) => setHiddenSolution(e.target.value)}
            maxLength={15}
          />
        </div>

        {error && (
          <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
            {error}
          </div>
        )}

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
          {loading ? (
            <>
              <Loader2 className="animate-spin" />
              Elaborazione in corso...
            </>
          ) : (
            <>
              <Wand2 />
              Crea Biglietto
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default Creator;
