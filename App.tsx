import React, { useState, useEffect } from 'react';
import Creator from './components/Creator';
import CrosswordGrid from './components/CrosswordGrid';
import { CrosswordData, ThemeType } from './types';
import { Edit3, Sparkles } from 'lucide-react';

// Background mappings
const BG_STYLES: Record<ThemeType, string> = {
  christmas: "bg-xmas-red bg-[url('https://www.transparenttextures.com/patterns/snow.png')]",
  birthday: "bg-yellow-400 bg-[url('https://www.transparenttextures.com/patterns/confetti-doodles.png')]",
  easter: "bg-blue-200 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]",
  elegant: "bg-neutral-900 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]",
  generic: "bg-gray-100"
};

const App: React.FC = () => {
  const [puzzleData, setPuzzleData] = useState<CrosswordData | null>(null);

  const activeTheme = puzzleData?.theme || 'christmas';
  const bgClass = BG_STYLES[activeTheme] || BG_STYLES.christmas;

  // Protezione contro la perdita accidentale dei dati
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (puzzleData) {
        const message = "Sei sicuro di voler uscire? Perderai il tuo cruciverba.";
        e.preventDefault();
        e.returnValue = message;
        return message;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [puzzleData]);

  const handleNewPuzzle = () => {
      if (window.confirm("Sei sicuro di voler ricominciare? Il cruciverba attuale andrà perso.")) {
          setPuzzleData(null);
      }
  };

  return (
    <div className={`min-h-screen ${bgClass} p-4 pb-12 font-body transition-all duration-500`}>
      
      {/* Header */}
      <header className="max-w-5xl mx-auto flex items-center justify-between py-6 mb-8">
         <div className={`flex items-center gap-2 ${activeTheme === 'birthday' ? 'text-indigo-900' : 'text-white'}`}>
            <Sparkles className="w-8 h-8" />
            <h1 className={`text-3xl md:text-5xl font-bold tracking-wide ${
              activeTheme === 'christmas' ? 'font-christmas' : 
              activeTheme === 'birthday' ? 'font-fun' : 
              activeTheme === 'elegant' ? 'font-elegant' : 'font-hand'
            }`}>
              Enigmistica Auguri
            </h1>
         </div>
         {puzzleData && (
            <button 
              onClick={handleNewPuzzle}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-full backdrop-blur-sm transition-all text-sm font-bold shadow-sm border border-white/20"
            >
              <Edit3 size={16} />
              Nuovo
            </button>
         )}
      </header>

      <main className="container mx-auto">
        {!puzzleData ? (
          <div className="flex flex-col items-center gap-8 animate-fade-in">
             <Creator onCreated={setPuzzleData} />
          </div>
        ) : (
          <div className="animate-fade-in">
             <div className={`text-center mb-8 ${activeTheme === 'birthday' ? 'text-indigo-900' : 'text-white'}`}>
                <h2 className={`text-4xl mb-2 ${
                   activeTheme === 'christmas' ? 'font-christmas' : 
                   activeTheme === 'birthday' ? 'font-fun' : 
                   activeTheme === 'elegant' ? 'font-elegant' : 'font-hand'
                }`}>{puzzleData.title}</h2>
             </div>
             
             <CrosswordGrid 
                data={puzzleData} 
                onComplete={() => {}} 
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
