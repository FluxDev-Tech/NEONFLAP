/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GameState } from './game/GameManager';
import GameCanvas from './components/GameCanvas';
import { Trophy, RotateCcw, Play, Zap, Pause, PlayCircle, Home } from 'lucide-react';

export default function App() {
  const [gameState, setGameState] = useState<GameState>(GameState.START);
  const [score, setScore] = useState(0);
  const [highScores, setHighScores] = useState<number[]>(() => {
    const saved = localStorage.getItem('neon-flap-highscores');
    if (saved) return JSON.parse(saved);
    const legacy = localStorage.getItem('neon-flap-highscore');
    return legacy ? [parseInt(legacy, 10)] : [0];
  });
  const [isNewRecordReached, setIsNewRecordReached] = useState(false);
  const highScore = highScores[0] || 0;

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyP' || e.code === 'Escape') {
        if (gameState === GameState.PLAYING) handleStateChange(GameState.PAUSED);
        else if (gameState === GameState.PAUSED) handleStateChange(GameState.PLAYING);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]);

  useEffect(() => {
    if (score > highScore && highScore > 0 && !isNewRecordReached && gameState === GameState.PLAYING) {
      setIsNewRecordReached(true);
    }
  }, [score, highScore, isNewRecordReached, gameState]);

  const handleStateChange = useCallback((newState: GameState) => {
    setGameState(newState);
    if (newState === GameState.PLAYING) {
      setIsNewRecordReached(false);
    }
    if (newState === GameState.GAME_OVER || newState === GameState.WIN) {
      setHighScores(prev => {
          if (score > 0) {
            const newScores = [...prev, score]
              .filter((s, i, self) => self.indexOf(s) === i) // Dedupe
              .sort((a, b) => b - a)
              .slice(0, 5);
            localStorage.setItem('neon-flap-highscores', JSON.stringify(newScores));
            return newScores;
          }
          return prev;
      });
    }
  }, [score]);

  return (
    <div className="fixed inset-0 bg-[#0a0a0a] text-white font-sans overflow-hidden select-none">
      {/* Game View */}
      <div className="absolute inset-0">
        <GameCanvas 
          gameState={gameState}
          onScoreUpdate={setScore}
          onStateUpdate={handleStateChange}
        />
      </div>

      {/* HUD */}
      <div className="absolute top-4 left-4 right-4 md:top-8 md:left-8 md:right-8 flex justify-between items-start z-10 pointer-events-none">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-[#00f2ff] opacity-80">
            <Zap size={14} fill="currentColor" />
            <span className="text-[10px] font-mono tracking-widest uppercase hidden sm:inline">Flux Engine Active</span>
            <span className="text-[8px] bg-[#00f2ff]/20 text-[#00f2ff] px-1.5 py-0.5 rounded border border-[#00f2ff]/30 font-black tracking-tighter">2026 EDITION</span>
          </div>
          <div className="flex items-baseline gap-3 md:gap-4 relative">
            <div className={`text-2xl sm:text-3xl md:text-4xl font-mono font-bold tabular-nums tracking-tighter transition-all duration-300 ${isNewRecordReached ? 'text-[#f0ff00] drop-shadow-[0_0_15px_rgba(240,255,0,0.6)] animate-pulse' : ''}`}>
              {score.toString().padStart(6, '0')}
              {isNewRecordReached && (
                <span className="absolute -top-4 left-0 text-[8px] font-black uppercase text-[#f0ff00] tracking-tighter">New Best</span>
              )}
            </div>
            <div className="text-[10px] sm:text-xs font-mono text-white/30 border-l border-white/10 pl-3 md:pl-4">
              <span className="block text-[8px] uppercase tracking-widest opacity-50">Best</span>
              <span className="tabular-nums">{highScore.toString().padStart(6, '0')}</span>
            </div>
          </div>
        </div>

        {gameState === GameState.PLAYING && (
          <button 
            onClick={() => handleStateChange(GameState.PAUSED)}
            className="pointer-events-auto bg-white/5 hover:bg-white/10 p-3 md:p-4 rounded-full border border-white/10 transition-colors backdrop-blur-sm group"
            title="Pause (P)"
          >
            <Pause size={20} className="text-white md:w-6 md:h-6 group-hover:scale-110 transition-transform" />
          </button>
        )}
      </div>

      {/* UI Overlays */}
      <AnimatePresence mode="wait">
        {gameState === GameState.START && (
          <motion.div 
            key="start"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/85"
          >
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center mb-12"
            >
              <div className="relative">
                <h1 
                  className="text-6xl sm:text-7xl md:text-9xl font-black italic tracking-tighter text-[#00f2ff] text-center px-4 leading-none"
                  style={{ textShadow: '0 0 40px rgba(0, 242, 255, 0.4)' }}
                >
                  NEON FLAP
                </h1>
                <div className="absolute -top-4 -right-4 bg-[#ff0055] text-white px-2 py-1 rounded text-[10px] font-black tracking-tighter rotate-12 shadow-[0_0_20px_rgba(255,0,85,0.5)] border border-white/20">
                  2026 EDITION
                </div>
              </div>
              <p className="text-[#888] font-mono mt-4 uppercase tracking-[0.3em] text-center text-[10px] sm:text-xs">
                Survive the surge. Master the grid.
              </p>
            </motion.div>
            
            <button 
              onClick={() => handleStateChange(GameState.PLAYING)}
              className="group relative flex items-center gap-4 bg-white text-black px-8 py-4 sm:px-12 sm:py-6 rounded-full font-bold text-lg sm:text-xl hover:scale-105 transition-transform cursor-pointer"
            >
              <Play fill="currentColor" />
              INITIATE FLIGHT
              <div className="absolute inset-0 rounded-full border-2 border-white scale-125 opacity-0 group-hover:opacity-20 group-hover:scale-110 transition-all" />
            </button>

            <div className="mt-8 flex flex-wrap justify-center gap-4">
              {deferredPrompt && (
                <button 
                  onClick={handleInstallClick}
                  className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-full font-mono text-xs tracking-widest uppercase transition-all border border-white/5"
                >
                  <Zap size={14} className="text-[#00f2ff]" />
                  Install App
                </button>
              )}
            </div>

            <p className="mt-8 text-neutral-500 text-sm animate-pulse uppercase tracking-widest text-center px-4">Click or press SPACE to fly</p>
          </motion.div>
        )}

        {gameState === GameState.PAUSED && (
          <motion.div 
            key="paused"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/70"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="flex flex-col items-center px-4"
            >
              <h2 className="text-5xl sm:text-7xl font-black text-white mb-8 tracking-tighter uppercase italic">Paused</h2>
              <button 
                onClick={() => handleStateChange(GameState.PLAYING)}
                className="group flex items-center gap-4 bg-[#00f2ff] text-black px-10 py-5 sm:px-12 sm:py-6 rounded-full font-bold text-lg sm:text-xl hover:scale-105 transition-transform cursor-pointer"
              >
                <PlayCircle fill="currentColor" size={28} />
                RESUME FLIGHT
              </button>
              <button 
                onClick={() => handleStateChange(GameState.START)}
                className="mt-4 flex items-center gap-2 text-white/40 hover:text-white transition-colors uppercase text-[10px] font-mono tracking-widest"
              >
                <Home size={14} />
                Return to Menu
              </button>
              <p className="mt-6 text-white/40 text-[10px] font-mono uppercase tracking-[0.2em]">P or Tap to resume</p>
            </motion.div>
          </motion.div>
        )}
        {gameState === GameState.GAME_OVER && (
          <motion.div 
            key="game-over"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#1a0007]/95"
          >
            <motion.div 
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="flex flex-col items-center w-full"
            >
              <h2 className="text-4xl sm:text-6xl font-black text-[#ff0055] mb-2 tracking-tighter uppercase italic">Flux Critical</h2>
              <p className="text-white/60 font-mono mb-8 text-center px-4 text-xs">System synchronization failed</p>
              
              <div className="bg-black/40 border border-white/10 p-6 sm:p-8 rounded-2xl mb-8 flex flex-col items-center relative w-[90%] max-w-sm">
                {score >= highScore && score > 0 && (
                  <div className="absolute -top-3 bg-[#f0ff00] text-black text-[10px] px-2 py-0.5 rounded font-black uppercase tracking-tighter">
                    New Record Achievement
                  </div>
                )}
                <span className="text-neutral-400 uppercase text-[10px] tracking-widest mb-1">Final Score</span>
                <span className="text-4xl sm:text-5xl font-mono font-bold text-[#f0ff00] mb-6">{score}</span>
                
                <div className="w-full border-t border-white/10 pt-4">
                  <div className="flex items-center gap-2 mb-4 text-[#888]">
                    <Trophy size={14} />
                    <span className="text-[10px] uppercase font-black tracking-widest">Hall of Fame</span>
                  </div>
                  <div className="space-y-2">
                    {highScores.map((s, i) => (
                      <div key={i} className={`flex justify-between items-center text-sm font-mono ${s === score ? 'text-[#f0ff00]' : 'text-white/40'}`}>
                        <span className="text-[10px] uppercase tracking-tighter opacity-50">Rank {i + 1}</span>
                        <span className="font-bold text-xs sm:text-sm">{s.toString().padStart(6, '0')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button 
                  onClick={() => handleStateChange(GameState.PLAYING)}
                  className="flex items-center gap-3 bg-[#ff0055] text-white px-8 py-4 rounded-xl font-bold hover:shadow-[0_0_30px_rgba(255,0,85,0.4)] transition-all cursor-pointer text-sm sm:text-base"
                >
                  <RotateCcw size={20} />
                  REBOOT SYSTEM
                </button>
              </div>

              <button 
                onClick={() => handleStateChange(GameState.START)}
                className="mt-6 flex items-center gap-2 text-white/20 hover:text-white/60 transition-colors uppercase text-[10px] font-mono tracking-widest"
              >
                <Home size={14} />
                Return to Menu
              </button>
            </motion.div>
          </motion.div>
        )}


        {gameState === GameState.WIN && (
          <motion.div 
            key="win"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#001a0a]/95"
          >
            <motion.div 
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="flex flex-col items-center px-4"
            >
              <Trophy size={60} className="text-[#00ff44] mb-8 animate-bounce sm:w-[80px] sm:h-[80px]" />
              <h2 className="text-4xl sm:text-6xl font-black text-[#00ff44] mb-2 tracking-tighter uppercase italic">Mission Complete</h2>
              <p className="text-white/60 font-mono mb-8 sm:mb-12 tracking-widest uppercase text-center text-xs">Grid traverse successful</p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <button 
                  onClick={() => handleStateChange(GameState.PLAYING)}
                  className="flex items-center gap-3 bg-white text-black px-6 py-3 sm:px-8 sm:py-4 rounded-xl font-bold hover:scale-105 transition-transform cursor-pointer text-sm sm:text-base"
                >
                  <RotateCcw size={20} />
                  RUN AGAIN
                </button>
                <button 
                  onClick={() => handleStateChange(GameState.START)}
                  className="flex items-center gap-3 bg-white/10 text-white px-6 py-3 sm:px-8 sm:py-4 rounded-xl font-bold hover:bg-white/20 transition-all cursor-pointer text-sm sm:text-base border border-white/10"
                >
                  <Home size={20} />
                  MENU
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

