/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GameState } from './game/GameManager';
import GameCanvas from './components/GameCanvas';
import { soundManager } from './game/SoundManager';
import { Trophy, RotateCcw, Play, Zap, Pause, PlayCircle, Home, RefreshCw } from 'lucide-react';

export default function App() {
  const [gameState, setGameState] = useState<GameState>(GameState.START);
  const [score, setScore] = useState(0);
  const scoreRef = useRef(0);
  const [highScore, setHighScore] = useState<number>(() => {
    const saved = localStorage.getItem('neon-flap-highscore');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [isNewRecordReached, setIsNewRecordReached] = useState(false);
  const displayedBest = highScore;

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

  // Real-time record detection
  useEffect(() => {
    if (score > highScore && highScore > 0 && gameState === GameState.PLAYING) {
      if (!isNewRecordReached) {
        setIsNewRecordReached(true);
        soundManager.playLevelUp();
      }
    }
  }, [score, highScore, isNewRecordReached, gameState]);

  const handleScoreUpdate = useCallback((newScore: number) => {
    scoreRef.current = newScore;
    setScore(newScore);
    
    // Auto-update highscore in real-time
    if (newScore > highScore) {
      setHighScore(newScore);
      localStorage.setItem('neon-flap-highscore', newScore.toString());
    }
  }, [highScore]);

  const handleStateChange = useCallback((newState: GameState) => {
    setGameState(newState);
    if (newState === GameState.PLAYING) {
      if (gameState === GameState.START || gameState === GameState.GAME_OVER || gameState === GameState.WIN) {
          setScore(0);
          scoreRef.current = 0;
          setIsNewRecordReached(false);
      }
    }
  }, [gameState]);

  return (
    <div className="fixed inset-0 bg-[#0a0a0a] text-white font-sans overflow-hidden select-none">
      {/* Game View */}
      <div className="absolute inset-0">
        <GameCanvas 
          gameState={gameState}
          onScoreUpdate={handleScoreUpdate}
          onStateUpdate={handleStateChange}
        />
      </div>

      <div className="absolute top-8 left-8 z-10 pointer-events-none select-none">
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 text-[#00f2ff] opacity-40 mb-1">
            <Zap size={10} fill="currentColor" />
            <span className="text-[8px] font-black tracking-[0.3em] uppercase">2026 EDITION</span>
          </div>
          <div className="flex flex-col">
            <div className={`text-5xl font-mono font-bold tabular-nums tracking-tighter leading-none transition-all duration-300 ${isNewRecordReached ? 'text-[#f0ff00] drop-shadow-[0_0_20px_rgba(240,255,0,0.6)] animate-pulse' : 'text-white/90'}`}>
              {score.toString().padStart(6, '0')}
            </div>
            
            {isNewRecordReached && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="absolute -right-24 top-6 text-[8px] font-black uppercase text-[#f0ff00] bg-[#f0ff00]/10 px-2 py-0.5 rounded border border-[#f0ff00]/20 rotate-12"
              >
                RECORD SYNCED
              </motion.div>
            )}

            <div className="flex flex-col mt-2 ml-1 opacity-30">
              <span className="text-[7px] uppercase font-black tracking-[0.4em] leading-none mb-1">BEST</span>
              <span className="text-sm font-mono font-bold leading-none tabular-nums">
                {displayedBest.toString().padStart(6, '0')}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute top-8 right-8 z-10">
        {gameState === GameState.PLAYING && (
          <button 
            onClick={() => handleStateChange(GameState.PAUSED)}
            className="pointer-events-auto bg-white/5 hover:bg-white/10 p-4 rounded-full border border-white/10 transition-all backdrop-blur-md group active:scale-95"
          >
            <Pause size={20} className="text-white group-hover:scale-110 transition-transform" />
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
            className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6 }}
              className="flex flex-col items-center mb-16 relative"
            >
              <div className="relative">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="absolute -top-6 -right-12 bg-[#ff0055] text-white text-[10px] font-black px-3 py-1.5 rounded skew-x-[-12deg] tracking-widest shadow-[0_0_20px_rgba(255,0,85,0.6)] z-10 border border-white/20"
                >
                  2026 EDITION
                </motion.div>
                <h1 className="text-7xl md:text-9xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-[#00f2ff] to-[#0178ff] drop-shadow-[0_0_40px_rgba(0,242,255,0.5)]">
                  NEON FLAP
                </h1>
              </div>
              <p className="text-white/40 text-[10px] md:text-xs tracking-[0.6em] text-center mt-6 font-black uppercase">
                SURVIVE THE SURGE. MASTER THE GRID.
              </p>
            </motion.div>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleStateChange(GameState.PLAYING)}
              className="pointer-events-auto flex items-center gap-4 bg-white text-black px-12 py-6 rounded-full font-black text-xl tracking-tight shadow-[0_0_40px_rgba(255,255,255,0.4)] transition-all hover:bg-neutral-100"
            >
              <Play size={24} fill="currentColor" />
              INITIATE FLIGHT
            </motion.button>

            <p className="absolute bottom-20 text-white/20 text-[10px] tracking-[0.5em] font-black uppercase animate-pulse">
              CLICK OR PRESS SPACE TO FLY
            </p>
          </motion.div>
        )}

        {gameState === GameState.PAUSED && (
          <motion.div 
            key="paused"
            initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            animate={{ opacity: 1, backdropFilter: 'blur(12px)' }}
            exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/40"
          >
            <h2 className="text-7xl font-black italic tracking-tighter text-white mb-2 leading-none">PAUSED</h2>
            <div className="flex flex-col items-center mb-16">
              <span className="text-[10px] uppercase font-black tracking-[0.4em] text-white/40 mb-2">CURRENT SYNC</span>
              <span className="text-4xl font-mono font-bold text-[#00f2ff] tabular-nums tracking-widest leading-none drop-shadow-[0_0_20px_rgba(0,242,255,0.5)]">
                {score.toString().padStart(6, '0')}
              </span>
            </div>

            <div className="flex flex-col gap-5 w-full max-w-[280px]">
              <button
                onClick={() => handleStateChange(GameState.PLAYING)}
                className="flex items-center justify-center gap-3 bg-[#00f2ff] text-black w-full py-5 rounded-full font-black tracking-tight text-lg shadow-[0_0_30px_rgba(0,242,255,0.3)] hover:scale-105 active:scale-95 transition-all text-center"
              >
                <div className="w-3 h-3 rounded-full bg-black animate-pulse" />
                RESUME FLIGHT
              </button>
              <button
                onClick={() => {
                  handleStateChange(GameState.START);
                  setTimeout(() => handleStateChange(GameState.PLAYING), 50);
                }}
                className="flex items-center justify-center gap-3 bg-white/5 border border-white/10 text-white w-full py-5 rounded-full font-black tracking-tight text-lg hover:bg-white/10 active:scale-95 transition-all backdrop-blur-md"
              >
                <RefreshCw size={20} />
                RESTART
              </button>
            </div>
            
            <button 
              onClick={() => handleStateChange(GameState.START)}
              className="mt-10 flex items-center gap-3 text-white/30 text-[10px] font-black uppercase tracking-[0.4em] hover:text-white transition-colors"
            >
              <Home size={14} />
              RETURN TO MENU
            </button>
            
            <div className="mt-16 text-[8px] font-mono text-white/10 tracking-[0.6em] uppercase font-black">SYSTEM STABILIZED</div>
          </motion.div>
        )}

        {gameState === GameState.GAME_OVER && (
          <motion.div 
            key="game-over"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60 backdrop-blur-2xl"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="flex flex-col items-center w-full px-6"
            >
              <h2 className="text-6xl md:text-8xl font-black italic tracking-tighter text-[#ff0055] mb-2 leading-none drop-shadow-[0_0_30px_rgba(255,0,85,0.4)]">
                FLUX CRITICAL
              </h2>
              <p className="text-white/40 text-[10px] md:text-sm tracking-[0.2em] uppercase font-bold mb-14">
                System synchronization failed
              </p>

              <div className="bg-white/[0.03] border border-white/5 rounded-3xl p-8 w-full max-w-sm mb-10 flex flex-col items-center relative overflow-hidden backdrop-blur-md">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#ff0055]/50 to-transparent" />
                
                <div className="flex flex-col items-center mb-10">
                  <span className="text-[10px] font-black tracking-[0.4em] text-white/20 uppercase mb-3">FINAL SCORE</span>
                  <span className="text-7xl font-mono font-bold text-[#f0ff00] leading-none drop-shadow-[0_0_20px_rgba(240,255,0,0.4)]">{score}</span>
                </div>
                
                <div className="w-full h-px bg-white/5 mb-8" />
                
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-2 mb-2">
                    <Trophy size={14} className="text-white/20" />
                    <span className="text-[10px] font-black tracking-[0.4em] text-white/25 uppercase">GLOBAL BEST</span>
                  </div>
                  <span className="text-2xl font-mono font-bold text-white/40 leading-none tracking-widest">{highScore.toString().padStart(6, '0')}</span>
                </div>
              </div>

              <button
                onClick={() => handleStateChange(GameState.PLAYING)}
                className="flex items-center justify-center gap-4 bg-[#ff0055] text-white px-14 py-6 rounded-2xl font-black text-xl tracking-tight shadow-[0_0_50px_rgba(255,0,85,0.4)] hover:scale-105 active:scale-95 transition-all w-full max-w-[280px]"
              >
                <RefreshCw size={24} />
                REBOOT SYSTEM
              </button>

              <button 
                onClick={() => handleStateChange(GameState.START)}
                className="mt-10 flex items-center gap-3 text-white/20 text-[10px] font-black uppercase tracking-[0.4em] hover:text-white/40 transition-colors"
              >
                <Home size={14} />
                RETURN TO MENU
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
            className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/80 backdrop-blur-2xl"
          >
            <motion.div 
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="flex flex-col items-center px-6"
            >
              <Trophy size={80} className="text-[#00f2ff] drop-shadow-[0_0_30px_rgba(0,242,255,0.6)] mb-8" />
              <h2 className="text-7xl font-black italic tracking-tighter text-[#00f2ff] mb-2 drop-shadow-[0_0_40px_rgba(0,242,255,0.5)]">FLUX STABLE</h2>
              <p className="text-white/40 font-mono mb-16 tracking-[0.4em] uppercase text-center text-xs">Mission synchronization successful</p>
              
              <div className="flex flex-col gap-4 w-full max-w-[280px]">
                <button 
                  onClick={() => handleStateChange(GameState.PLAYING)}
                  className="flex items-center justify-center gap-4 bg-white text-black py-6 rounded-2xl font-black text-xl hover:scale-105 active:scale-95 transition-all"
                >
                  <RotateCcw size={20} />
                  RUN AGAIN
                </button>
                <button 
                  onClick={() => handleStateChange(GameState.START)}
                  className="flex items-center justify-center gap-3 bg-white/5 border border-white/10 text-white py-5 rounded-2xl font-bold hover:bg-white/10 active:scale-95 transition-all text-sm uppercase tracking-widest"
                >
                  <Home size={18} />
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

