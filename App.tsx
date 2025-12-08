import React, { useState, useEffect } from 'react';
import { Creator } from './components/Creator';
import CrosswordGrid from './components/CrosswordGrid';
import { CrosswordData, ThemeType } from './types';
import { Edit3, Sparkles } from 'lucide-react';

// Background mappings
const BG_STYLES: Record<ThemeType, string> = {
  christmas: "bg-xmas-red bg-[url('https://www.transparenttextures.com/patterns/snow.png')]",
  birthday: "bg-yellow-400 bg-[url('https://www.transparenttextures.com/patterns/confetti-doodles.png')]",
  easter: "bg-blue-200 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]",
  halloween: "bg-purple-900 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]",
  graduation: "bg-red-800 bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')]",
  confirmation: "bg-indigo-100 bg-[url('https://www.transparenttextures.com/patterns/diamond-upholstery.png')]",
  communion: "bg-yellow-50 bg-[url('https://www.transparenttextures.com/patterns/white-diamond.png')]",
  wedding: "bg-rose-50 bg-[url('https://www.transparenttextures.com/patterns/hearts.png')]",
  elegant: "bg-neutral-900 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]",
  generic: "bg-gray-100"
};

const App: React.FC = () => {
  const [puzzleData, setPuzzleData] = useState<CrosswordData | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const activeTheme = puzzleData?.theme || 'christmas';
  const bgClass = BG_STYLES[activeTheme] || BG_STYLES.christmas;

  // Protezione contro la perdita accidentale dei dati
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (puzzleData && !isEditing) {
        const message = "Sei sicuro di voler uscire? Perderai il tuo cruciverba.";
        e.preventDefault();
        e.returnValue = message;
        return message;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [puzzleData, isEditing]);

  const handleNewPuzzle = () => {
      if (window.confirm("Sei sicuro di voler ricominciare da zero?")) {
          setPuzzleData(null);
          setIsEditing(false);
      }
  };

  const handleEdit = () => {
      setIsEditing(true);
  };

  const handleCreated = (data: CrosswordData) => {
      setPuzzleData(data);
      setIsEditing(false);
  };

  // Funzione per aggiornare i dati in tempo reale dal componente figlio (CrosswordGrid)
  const handleUpdatePuzzle = (updates: Partial<CrosswordData>) => {
      setPuzzleData(prev => {
          if (!prev) return null;
          return { ...prev, ...updates };
      });
  };

  return (
    <div className={`min-h-screen ${bgClass} p-4 pb-12 font-body transition-all duration-500`}>
      
      {/* Header */}
      <header className="max-w-5xl mx-auto flex items-center justify-between py-6 mb-8">
         <div className={`flex items-center gap-2 ${activeTheme === 'birthday' || activeTheme === 'communion' || activeTheme === 'wedding' || activeTheme === 'confirmation' ? 'text-indigo-900' : 'text-white'}`}>
            <Sparkles className="w-8 h-8" />
            <h1 className={`text-3xl md:text-5xl font-bold tracking-wide ${
              activeTheme === 'christmas' || activeTheme === 'halloween' ? 'font-christmas' : 
              activeTheme === 'birthday' ? 'font-fun' : 
              activeTheme === 'elegant' || activeTheme === 'graduation' ? 'font-elegant' : 'font-hand'
            }`}>
              Enigmistica Auguri
            </h1>
         </div>
         {puzzleData && !isEditing && (
            <button 
              onClick={handleNewPuzzle}
              className={`flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-sm transition-all text-sm font-bold shadow-sm border ${
                  activeTheme === 'birthday' || activeTheme === 'communion' || activeTheme === 'wedding' || activeTheme === 'confirmation' 
                  ? 'bg-indigo-900/10 hover:bg-indigo-900/20 text-indigo-900 border-indigo-900/20' 
                  : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
              }`}
            >
              <Edit3 size={16} />
              Nuovo
            </button>
         )}
      </header>

      <main className="container mx-auto">
        {!puzzleData || isEditing ? (
          <div className="flex flex-col items-center gap-8 animate-fade-in">
             <Creator 
                onCreated={handleCreated} 
                initialData={isEditing ? puzzleData : null}
             />
          </div>
        ) : (
          <div className="animate-fade-in">
             <div className={`text-center mb-8 ${activeTheme === 'birthday' || activeTheme === 'communion' || activeTheme === 'wedding' || activeTheme === 'confirmation' ? 'text-indigo-900' : 'text-white'}`}>
                <h2 className={`text-4xl mb-2 ${
                   activeTheme === 'christmas' || activeTheme === 'halloween' ? 'font-christmas' : 
                   activeTheme === 'birthday' ? 'font-fun' : 
                   activeTheme === 'elegant' || activeTheme === 'graduation' ? 'font-elegant' : 'font-hand'
                }`}>{puzzleData.title}</h2>
             </div>
             
             <CrosswordGrid 
                data={puzzleData} 
                onComplete={() => {}} 
                onEdit={handleEdit}
                onUpdate={handleUpdatePuzzle}
             />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 w-full p-2 text-center text-white/50 text-xs pointer-events-none">
        &copy; {new Date().getFullYear()} Generatore di Biglietti Enigmistici
      </footer>
    </div>
  );
};

export default App;
