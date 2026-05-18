/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GameState } from './game/GameManager';
import GameCanvas from './components/GameCanvas';
import { soundManager } from './game/SoundManager';
import { Trophy, RotateCcw, Play, Zap, Pause, PlayCircle, Home, RefreshCw, Settings as SettingsIcon, Shield, Volume2, VolumeX, Eye, EyeOff } from 'lucide-react';
import SkinsOverlay from './components/SkinsOverlay';
import { SKIN_PROTOCOLS } from './game/SkinPresets';

export default function App() {
  const [gameState, setGameState] = useState<GameState>(GameState.START);
  const [score, setScore] = useState(0);
  const [showSkins, setShowSkins] = useState(false);

  const [showSettingsInMenu, setShowSettingsInMenu] = useState(false);
  const [showInstallPopup, setShowInstallPopup] = useState(false);

  const [totalRuns, setTotalRuns] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('neon-flap-total-runs');
      return saved ? parseInt(saved, 10) : 0;
    } catch (e) {
      console.warn('Failed to load total runs:', e);
      return 0;
    }
  });

  const [selectedSkin, setSelectedSkin] = useState<string>(() => {
    try {
      return localStorage.getItem('neon-flap-selected-skin') || 'DEFAULT';
    } catch (e) {
      return 'DEFAULT';
    }
  });

  const [unlockedSkins, setUnlockedSkins] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('neon-flap-unlocked-skins');
      return saved ? JSON.parse(saved) : ['DEFAULT'];
    } catch (e) {
      console.warn('Failed to load unlocked skins:', e);
      return ['DEFAULT'];
    }
  });

  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('neon-flap-settings');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to load settings:', e);
    }
    return {
      volume: 0.5,
      soundEnabled: true,
      vFXEnabled: true,
    };
  });
  const scoreRef = useRef(0);
  const [highScore, setHighScore] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('neon-flap-highscore');
      return saved ? parseInt(saved, 10) : 0;
    } catch (e) {
      return 0;
    }
  });
  const [isNewRecordReached, setIsNewRecordReached] = useState(false);
  const displayedBest = highScore;

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    if (deferredPrompt && gameState === GameState.START) {
      const timer = setTimeout(() => setShowInstallPopup(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [deferredPrompt, gameState]);

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
    soundManager.setVolume(settings.volume);
    soundManager.setEnabled(settings.soundEnabled);
    localStorage.setItem('neon-flap-settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('neon-flap-total-runs', totalRuns.toString());
  }, [totalRuns]);

  useEffect(() => {
    localStorage.setItem('neon-flap-unlocked-skins', JSON.stringify(unlockedSkins));
  }, [unlockedSkins]);

  useEffect(() => {
    localStorage.setItem('neon-flap-selected-skin', selectedSkin);
  }, [selectedSkin]);

  const checkUnlocks = useCallback((currentScore: number, runs: number) => {
    const newUnlocks = [...unlockedSkins];
    let changed = false;

    if (currentScore >= 20 && !newUnlocks.includes('PHASE')) {
      newUnlocks.push('PHASE');
      changed = true;
    }
    if (currentScore >= 50 && !newUnlocks.includes('CRIMSON')) {
      newUnlocks.push('CRIMSON');
      changed = true;
    }
    if (currentScore >= 100 && !newUnlocks.includes('SILVER')) {
      newUnlocks.push('SILVER');
      changed = true;
    }
    if (runs >= 25 && !newUnlocks.includes('VOID')) {
      newUnlocks.push('VOID');
      changed = true;
    }

    if (changed) {
      setUnlockedSkins(newUnlocks);
      // Optional: play an unlock sound if we had one
    }
  }, [unlockedSkins]);

  // Real-time record detection removed from here and moved into handleScoreUpdate for atomic sync
  
  const handleScoreUpdate = useCallback((newScore: number) => {
    scoreRef.current = newScore;
    setScore(newScore);
    
    // Check for score-based unlocks
    checkUnlocks(newScore, totalRuns);

    // Atomic update for "ONE BEST SCORE" logic
    if (newScore > highScore) {
      // Trigger new record state if we just surpassed the old high score
      if (!isNewRecordReached && highScore > 0) {
        setIsNewRecordReached(true);
        soundManager.playLevelUp();
      }
      setHighScore(newScore);
      localStorage.setItem('neon-flap-highscore', newScore.toString());
    }
  }, [highScore, isNewRecordReached]);

  const handleStateChange = useCallback((newState: GameState) => {
    // Resume audio context on first interaction
    if (newState === GameState.PLAYING) {
      soundManager.playFlip(); // This will trigger .init() and resume context
    }

    // Handling restarts from game-over or manual restart in pause
    if (newState === GameState.PLAYING && (gameState === GameState.GAME_OVER || gameState === GameState.WIN || gameState === GameState.START)) {
      if (gameState !== GameState.START) {
        setTotalRuns(prev => {
          const next = prev + 1;
          checkUnlocks(highScore, next);
          return next;
        });
      }
      setScore(0);
      scoreRef.current = 0;
      setIsNewRecordReached(false);
    }
    setGameState(newState);
  }, [gameState, highScore, checkUnlocks]);

  return (
    <div className="fixed inset-0 bg-[#0a0a0a] text-white font-sans overflow-hidden select-none">
      <AnimatePresence>
        {showInstallPopup && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 left-6 right-6 z-[60] sm:left-auto sm:right-6 sm:w-80"
          >
            <div className="bg-white p-6 rounded-3xl shadow-2xl flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center shrink-0">
                  <Play className="text-white fill-current translate-x-0.5" size={20} />
                </div>
                <div>
                  <h3 className="text-black font-black text-sm tracking-tight">INSTALL PROTOCOL</h3>
                  <p className="text-black/50 text-[10px] font-bold uppercase tracking-widest">RUNS BEST ON HOMESCREEN</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setShowInstallPopup(false)}
                  className="flex-1 py-3 text-black/40 text-[10px] font-black uppercase tracking-widest hover:text-black transition-colors"
                >
                  DISMISS
                </button>
                <button 
                  onClick={() => {
                    handleInstallClick();
                    setShowInstallPopup(false);
                  }}
                  className="flex-[2] py-3 bg-[#00f2ff] text-black rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-cyan-500/20"
                >
                  INSTALL NOW
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game View */}
      <div className="absolute inset-0">
        <GameCanvas 
          gameState={gameState}
          onScoreUpdate={handleScoreUpdate}
          onStateUpdate={handleStateChange}
          vFXEnabled={settings.vFXEnabled}
          selectedSkinId={selectedSkin}
        />
      </div>

      <AnimatePresence>
        {gameState !== GameState.START && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-4 left-4 sm:top-8 sm:left-8 z-40 pointer-events-none select-none"
          >
            <div className="p-4 sm:p-5 bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl flex flex-col shadow-[0_0_30px_rgba(0,242,255,0.05)]">
              <div className="flex flex-col">
                <div className={`text-3xl sm:text-5xl font-mono font-bold tabular-nums tracking-tighter leading-none transition-all duration-300 ${isNewRecordReached ? 'text-[#f0ff00] drop-shadow-[0_0_20px_rgba(240,255,0,0.6)] animate-pulse' : 'text-white/95'}`}>
                  {score.toString().padStart(6, '0')}
                </div>

                <div className="flex flex-col mt-2 opacity-50">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Trophy size={10} className="text-[#00f2ff]" />
                    <span className="text-[7px] sm:text-[9px] uppercase font-black tracking-[0.3em] leading-none">SYSTEM BEST</span>
                  </div>
                  <span className="text-xs sm:text-sm font-mono font-bold leading-none tabular-nums text-[#00f2ff]">
                    {displayedBest.toString().padStart(6, '0')}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute top-4 right-4 sm:top-8 sm:right-8 z-40 flex gap-3">
        {gameState === GameState.PLAYING && (
          <button 
            onClick={() => handleStateChange(GameState.PAUSED)}
            className="pointer-events-auto bg-black/40 hover:bg-white/10 p-3 sm:p-4 rounded-full border border-white/10 transition-all backdrop-blur-md group active:scale-90"
          >
            <Pause size={18} className="text-white group-hover:scale-110 sm:w-5 sm:h-5 transition-transform" />
          </button>
        )}
      </div>

      {/* UI Overlays */}
      <AnimatePresence mode="wait">
        {showSkins && (
          <SkinsOverlay
            key="skins"
            unlockedSkins={unlockedSkins}
            selectedSkinId={selectedSkin}
            onSelect={(id) => {
              setSelectedSkin(id);
              setShowSkins(false);
            }}
            onClose={() => setShowSkins(false)}
            stats={{ best: highScore, total: totalRuns }}
          />
        )}
      {gameState === GameState.START && (
          <motion.div 
            key="start"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#03030b] p-4 sm:p-6 overflow-y-auto"
          >
            {/* Background Atmosphere */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#00f2ff]/5 rounded-full blur-[120px]" />
              <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-[#00f2ff]/5 to-transparent" />
            </div>

            <div className="relative z-10 flex flex-col items-center w-full min-h-full py-12">
              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col items-center relative w-full max-w-[320px] sm:max-w-xl mb-12"
              >
                {/* Boxed Title Container */}
                <div className="relative w-full p-8 sm:p-16 border border-[#00f2ff]/30 rounded-[40px] bg-black/40 backdrop-blur-xl overflow-hidden group shadow-[0_0_50px_rgba(0,242,255,0.1)] mb-12">
                  {/* Tech Accents */}
                  <div className="absolute top-0 left-0 w-12 h-12 border-t-2 border-l-2 border-[#00f2ff] rounded-tl-[40px]" />
                  <div className="absolute bottom-0 right-0 w-12 h-12 border-b-2 border-r-2 border-[#ff0055] rounded-br-[40px]" />
                  
                  <div className="absolute top-6 left-6 flex flex-col gap-1">
                    <span className="text-[#00f2ff]/20 font-mono text-[8px] tracking-[0.3em]">VERSION_2.6.0</span>
                    <div className="flex items-center gap-2">
                       <Trophy size={8} className="text-[#00f2ff]/40" />
                       <span className="text-[#00f2ff]/40 font-mono text-[10px] font-bold">{highScore.toString().padStart(6, '0')}</span>
                    </div>
                  </div>
                  
                  <div className="relative z-10 flex flex-col items-center">
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.4 }}
                      className="mb-2 bg-[#ff0055] text-white text-[8px] sm:text-[10px] font-black px-4 py-1 rounded-full tracking-widest shadow-[0_0_20px_rgba(255,0,85,0.4)] border border-white/10 uppercase"
                    >
                      Legacy Edition
                    </motion.div>
                    
                    <h1 className="text-6xl sm:text-8xl lg:text-9xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-[#00f2ff] to-[#0178ff] drop-shadow-[0_0_35px_rgba(0,242,255,0.3)] leading-[0.8] mb-4 text-center">
                      NEON<br />FLAP
                    </h1>
                    
                    <div className="mt-8 flex items-center gap-3">
                      <div className="h-px w-8 bg-white/10" />
                      <p className="text-white/40 text-[9px] sm:text-[11px] tracking-[0.5em] font-black uppercase whitespace-nowrap">
                        Void Protocol Active
                      </p>
                      <div className="h-px w-8 bg-white/10" />
                    </div>
                  </div>

                  {/* Animated Inner Shine */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                </div>
              </motion.div>
              
              <div className="flex flex-col items-center w-full max-w-[280px] sm:max-w-xs space-y-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleStateChange(GameState.PLAYING)}
                  className="pointer-events-auto flex items-center justify-center gap-4 bg-white text-black w-full py-5 sm:py-7 rounded-2xl font-black text-lg sm:text-xl tracking-tight shadow-[0_0_50px_rgba(255,255,255,0.3)] transition-all hover:bg-neutral-100"
                >
                  <Play size={20} className="fill-current" />
                  START CORE
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowSkins(true)}
                  className="pointer-events-auto flex items-center justify-center gap-4 bg-white/10 border border-white/20 text-white w-full py-4 rounded-xl font-black text-sm tracking-[0.2em] backdrop-blur-md transition-all hover:bg-white/20"
                >
                  <Shield size={18} className="text-[#ff0055]" />
                  PROTOCOLS HANGAR
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowSettingsInMenu(!showSettingsInMenu)}
                  className={`pointer-events-auto flex items-center justify-center gap-4 border w-full py-4 rounded-xl font-black text-sm tracking-[0.2em] backdrop-blur-md transition-all ${showSettingsInMenu ? 'bg-[#00f2ff]/20 border-[#00f2ff]/50 text-[#00f2ff]' : 'bg-white/5 border-white/10 text-white hover:bg-white/10'}`}
                >
                  <SettingsIcon size={18} className={showSettingsInMenu ? 'animate-spin-slow' : ''} />
                  {showSettingsInMenu ? 'CLOSE SETTINGS' : 'SYSTEM CONFIG'}
                </motion.button>

                <AnimatePresence>
                  {showSettingsInMenu && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="w-full overflow-hidden"
                    >
                      <div className="pt-4 space-y-6">
                        <div className="p-5 bg-white/5 rounded-2xl border border-white/10 space-y-4">
                          {/* Sound Toggle */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {settings.soundEnabled ? <Volume2 size={16} className="text-[#00f2ff]" /> : <VolumeX size={16} className="text-white/20" />}
                              <span className="text-[10px] font-black tracking-widest uppercase">Audio</span>
                            </div>
                            <button
                              onClick={() => setSettings(prev => ({ ...prev, soundEnabled: !prev.soundEnabled }))}
                              className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                                settings.soundEnabled ? 'bg-[#00f2ff] text-black shadow-[0_0_15px_rgba(0,242,255,0.4)]' : 'bg-white/10 text-white/40'
                              }`}
                            >
                              {settings.soundEnabled ? 'On' : 'Off'}
                            </button>
                          </div>

                          {/* Volume Slider */}
                          <div className="space-y-2">
                            <div className="flex justify-between text-[9px] font-bold text-white/30 tracking-widest uppercase">
                              <span>Output Volume</span>
                              <span>{Math.round(settings.volume * 100)}%</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="1"
                              step="0.01"
                              value={settings.volume}
                              onChange={(e) => setSettings(prev => ({ ...prev, volume: parseFloat(e.target.value) }))}
                              className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-[#00f2ff]"
                            />
                          </div>

                          <div className="h-px bg-white/5" />

                          {/* VFX Toggle */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {settings.vFXEnabled ? <Eye size={16} className="text-[#f0ff00]" /> : <EyeOff size={16} className="text-white/20" />}
                              <span className="text-[10px] font-black tracking-widest uppercase">Visual FX</span>
                            </div>
                            <button
                              onClick={() => setSettings(prev => ({ ...prev, vFXEnabled: !prev.vFXEnabled }))}
                              className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                                settings.vFXEnabled ? 'bg-[#f0ff00] text-black shadow-[0_0_15px_rgba(240,255,0,0.4)]' : 'bg-white/10 text-white/40'
                              }`}
                            >
                              {settings.vFXEnabled ? 'Max' : 'Min'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {deferredPrompt && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleInstallClick}
                    className="w-full flex items-center justify-center gap-2 bg-white/5 border border-white/10 py-4 rounded-xl backdrop-blur-md transition-all hover:bg-white/10"
                  >
                    <Zap size={14} className="text-[#f0ff00]" />
                    <span className="text-[10px] font-black tracking-widest uppercase">Direct Access</span>
                  </motion.button>
                )}
              </div>

              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="mt-12 flex flex-col items-center gap-3 opacity-30"
              >
                <div className="flex items-center gap-2">
                  <div className="w-1 h-1 bg-white rounded-full animate-ping" />
                  <span className="text-[9px] font-black tracking-[0.5em] uppercase">Ready for Sync</span>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}

        {gameState === GameState.PAUSED && (
          <motion.div 
            key="paused"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-xl p-8 overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center w-full max-w-sm py-12"
            >
              <h2 className="text-4xl sm:text-7xl font-black italic tracking-tighter text-white mb-2 leading-none text-center">SYSTEM PAUSED</h2>
              
              <div className="w-full h-px bg-white/10 my-6 sm:my-10" />

              <div className="flex flex-col items-center mb-8 sm:mb-16 text-center">
                <span className="text-[10px] uppercase font-black tracking-[0.4em] text-white/30 mb-2">LIVE DATA SYNC</span>
                <span className="text-3xl sm:text-6xl font-mono font-bold text-[#00f2ff] tabular-nums tracking-widest leading-none drop-shadow-[0_0_30px_rgba(0,242,255,0.4)]">
                  {score.toString().padStart(6, '0')}
                </span>
              </div>

              <div className="flex flex-col gap-3 sm:gap-4 w-full mb-8">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleStateChange(GameState.PLAYING)}
                  className="flex items-center justify-center gap-3 bg-[#00f2ff] text-black w-full py-4 sm:py-6 rounded-2xl sm:rounded-3xl font-black tracking-tight text-base sm:text-xl shadow-[0_0_30px_rgba(0,242,255,0.3)] transition-all"
                >
                  <PlayCircle size={22} fill="currentColor" />
                  RESUME MISSION
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    handleStateChange(GameState.START);
                    setTimeout(() => handleStateChange(GameState.PLAYING), 100);
                  }}
                  className="flex items-center justify-center gap-3 bg-white/5 border border-white/10 text-white w-full py-4 sm:py-5 rounded-2xl sm:rounded-3xl font-black tracking-tight text-base sm:text-lg backdrop-blur-md transition-all hover:bg-white/10"
                >
                  <RefreshCw size={20} />
                  RESTART CORE
                </motion.button>
              </div>

              <div className="w-full p-5 bg-white/5 rounded-2xl border border-white/10 space-y-4 mb-8">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {settings.soundEnabled ? <Volume2 size={16} className="text-[#00f2ff]" /> : <VolumeX size={16} className="text-white/20" />}
                      <span className="text-[10px] font-black tracking-widest uppercase">Audio</span>
                    </div>
                    <button
                      onClick={() => setSettings(prev => ({ ...prev, soundEnabled: !prev.soundEnabled }))}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                        settings.soundEnabled ? 'bg-[#00f2ff] text-black shadow-[0_0_15px_rgba(0,242,255,0.4)]' : 'bg-white/10 text-white/40'
                      }`}
                    >
                      {settings.soundEnabled ? 'On' : 'Off'}
                    </button>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={settings.volume}
                    onChange={(e) => setSettings(prev => ({ ...prev, volume: parseFloat(e.target.value) }))}
                    className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-[#00f2ff]"
                  />
                  <div className="h-px bg-white/5" />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {settings.vFXEnabled ? <Eye size={16} className="text-[#f0ff00]" /> : <EyeOff size={16} className="text-white/20" />}
                      <span className="text-[10px] font-black tracking-widest uppercase">Visual FX</span>
                    </div>
                    <button
                      onClick={() => setSettings(prev => ({ ...prev, vFXEnabled: !prev.vFXEnabled }))}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                        settings.vFXEnabled ? 'bg-[#f0ff00] text-black shadow-[0_0_15px_rgba(240,255,0,0.4)]' : 'bg-white/10 text-white/40'
                      }`}
                    >
                      {settings.vFXEnabled ? 'Max' : 'Min'}
                    </button>
                  </div>
              </div>
              
              <button 
                onClick={() => handleStateChange(GameState.START)}
                className="flex items-center gap-3 text-white/30 text-[10px] font-black uppercase tracking-[0.4em] hover:text-white transition-colors"
              >
                <Home size={16} />
                EXIT TO MENU
              </button>
            </motion.div>
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
              className="flex flex-col items-center w-full px-6 max-w-sm"
            >
              <h2 className="text-5xl sm:text-8xl font-black italic tracking-tighter text-[#ff0055] mb-2 leading-none drop-shadow-[0_0_30px_rgba(255,0,85,0.4)] text-center">
                FLUX CRITICAL
              </h2>
              <p className="text-white/40 text-[9px] sm:text-sm tracking-[0.2em] uppercase font-bold mb-10 sm:mb-14 text-center">
                System synchronization failed
              </p>

              <div className="bg-white/[0.03] border border-white/5 rounded-3xl p-6 sm:p-8 w-full mb-10 flex flex-col items-center relative overflow-hidden backdrop-blur-md">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#ff0055]/50 to-transparent" />
                
                {isNewRecordReached && (
                  <div className="absolute top-4 right-4 bg-[#f0ff00] text-black text-[7px] font-black px-2 py-0.5 rounded uppercase tracking-[0.2em] shadow-[0_0_15px_rgba(240,255,0,0.4)]">
                    NEW RECORD
                  </div>
                )}

                <div className="flex flex-col items-center mb-8 sm:mb-10 text-center">
                  <span className="text-[9px] sm:text-[10px] font-black tracking-[0.4em] text-white/20 uppercase mb-3">FINAL SCORE</span>
                  <span className="text-5xl sm:text-7xl font-mono font-bold text-[#f0ff00] leading-none drop-shadow-[0_0_20px_rgba(240,255,0,0.4)]">{score.toString().padStart(6, '0')}</span>
                </div>
                
                <div className="w-full h-px bg-white/5 mb-6 sm:mb-8" />
                
                <div className="flex flex-col items-center text-center">
                  <div className="flex items-center gap-2 mb-2">
                    <Trophy size={14} className="text-white/20" />
                    <span className="text-[9px] sm:text-[10px] font-black tracking-[0.4em] text-white/25 uppercase">GLOBAL BEST</span>
                  </div>
                  <span className="text-xl sm:text-2xl font-mono font-bold text-white/40 leading-none tracking-widest">{highScore.toString().padStart(6, '0')}</span>
                </div>
              </div>

              <button
                onClick={() => handleStateChange(GameState.PLAYING)}
                className="flex items-center justify-center gap-4 bg-[#ff0055] text-white w-full py-5 sm:py-6 rounded-2xl font-black text-lg sm:text-xl tracking-tight shadow-[0_0_50px_rgba(255,0,85,0.4)] hover:scale-105 active:scale-95 transition-all"
              >
                <RefreshCw size={22} className="sm:w-6 sm:h-6" />
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

