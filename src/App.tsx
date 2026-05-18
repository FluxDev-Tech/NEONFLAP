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
    if (currentScore >= 100 && !newUnlocks.includes('VOID')) {
      newUnlocks.push('VOID');
      changed = true;
    }
    if (currentScore >= 150 && !newUnlocks.includes('GOLD')) {
      newUnlocks.push('GOLD');
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
    <div className="fixed inset-0 bg-[#03030b] text-white font-sans overflow-hidden select-none">
      <AnimatePresence>
        {showInstallPopup && (
          <motion.div
            initial={{ y: 100, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 100, opacity: 0, scale: 0.9 }}
            className="fixed bottom-6 left-6 right-6 z-[100] sm:left-auto sm:right-6 sm:w-80"
          >
            <div className="bg-white p-6 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col gap-5 border border-white/20 backdrop-blur-xl">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-black/10">
                  <Zap className="text-[#00f2ff] fill-[#00f2ff]" size={20} />
                </div>
                <div>
                  <h3 className="text-black font-[900] text-sm tracking-tight leading-tight">INSTALL PROTOCOL</h3>
                  <p className="text-black/40 text-[9px] font-black uppercase tracking-widest mt-0.5">Optimized for Home</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setShowInstallPopup(false)}
                  className="flex-1 py-3.5 text-black/40 text-[10px] font-black uppercase tracking-widest hover:text-black transition-colors rounded-xl hover:bg-black/5"
                >
                  DISMISS
                </button>
                <button 
                  onClick={() => {
                    handleInstallClick();
                    setShowInstallPopup(false);
                  }}
                  className="flex-[2] py-3.5 bg-black text-white rounded-xl text-[10px] font-black uppercase tracking-best shadow-xl shadow-black/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
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
            <div className="p-4 sm:p-5 bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.3)]">
              <div className="flex flex-col">
                <div className={`text-4xl sm:text-6xl font-mono font-[900] tabular-nums tracking-tighter leading-none transition-all duration-300 ${isNewRecordReached ? 'text-[#f0ff00] drop-shadow-[0_0_20px_rgba(240,255,0,0.6)] animate-pulse' : 'text-white'}`}>
                  {score.toString().padStart(6, '0')}
                </div>

                <div className="flex flex-col mt-2 opacity-60">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Trophy size={10} className="text-[#00f2ff]" />
                    <span className="text-[8px] sm:text-[10px] uppercase font-black tracking-[0.2em] leading-none">BEST</span>
                  </div>
                  <span className="text-sm sm:text-lg font-mono font-black leading-none tabular-nums text-[#00f2ff]">
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

            <div className="relative z-10 flex flex-col items-center w-full max-w-xl py-12 px-2">
              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col items-center relative w-full mb-12"
              >
                {/* Boxed Title Container */}
                <div className="relative w-full p-6 sm:p-16 border border-[#00f2ff]/30 rounded-[3rem] bg-black/40 backdrop-blur-xl overflow-hidden group shadow-[0_0_80px_rgba(0,242,255,0.1)] mb-12">
                  {/* Tech Accents */}
                  <div className="absolute top-0 left-0 w-16 h-16 border-t-4 border-l-4 border-[#00f2ff] rounded-tl-[3rem]" />
                  <div className="absolute bottom-0 right-0 w-16 h-16 border-b-4 border-r-4 border-[#ff0055] rounded-br-[3rem]" />
                  
                  <div className="absolute top-6 left-6 flex flex-col">
                    <span className="text-[#00f2ff]/40 font-mono text-[9px] tracking-[0.3em] uppercase mb-1">System Best</span>
                    <div className="flex items-center gap-2">
                       <Trophy size={12} className="text-[#00f2ff]" />
                       <span className="text-[#00f2ff] font-mono text-lg sm:text-2xl font-[900] tracking-best">{highScore.toString().padStart(6, '0')}</span>
                    </div>
                  </div>
                  
                  <div className="absolute top-6 right-8">
                    <span className="text-white/20 font-mono text-[9px] tracking-[0.4em] font-black italic">V_2.7.0</span>
                  </div>
                  
                  <div className="relative z-10 flex flex-col items-center mt-8 sm:mt-12">
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.4 }}
                      className="mb-6 bg-[#ff0055] text-white text-[9px] sm:text-[11px] font-[900] px-5 py-2 rounded-full tracking-[0.4em] shadow-[0_0_30px_rgba(255,0,85,0.5)] border border-white/10 uppercase"
                    >
                      Integrated Protocol
                    </motion.div>
                    
                    <h1 className="text-5xl sm:text-9xl font-[1000] italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-[#00f2ff] to-[#0178ff] drop-shadow-[0_0_50px_rgba(0,242,255,0.4)] leading-[0.75] mb-10 text-center">
                      NEON<br />FLAP
                    </h1>
                    
                    <div className="flex items-center gap-4 w-full justify-center">
                      <div className="h-px flex-1 max-w-[60px] bg-gradient-to-r from-transparent to-white/20" />
                      <p className="text-white/50 text-[10px] sm:text-[12px] tracking-[0.6em] font-[900] uppercase whitespace-nowrap">
                        Void Protocol Active
                      </p>
                      <div className="h-px flex-1 max-w-[60px] bg-gradient-to-l from-transparent to-white/20" />
                    </div>
                  </div>

                  {/* Animated Inner Shine */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                </div>
              </motion.div>
              
              <div className="flex flex-col items-center w-full max-w-[280px] sm:max-w-sm space-y-4">
                <motion.button
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleStateChange(GameState.PLAYING)}
                  className="pointer-events-auto flex items-center justify-center gap-5 bg-white text-black w-full py-6 sm:py-8 rounded-[1.5rem] font-[1000] text-xl sm:text-2xl tracking-tighter shadow-[0_20px_60px_rgba(255,255,255,0.2)] transition-all hover:bg-neutral-100"
                >
                  <Play size={24} className="fill-current" />
                  START MISSION
                </motion.button>

                <div className="grid grid-cols-2 gap-3 w-full">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowSkins(true)}
                    className="pointer-events-auto flex flex-col items-center justify-center gap-2 bg-white/10 border border-white/20 text-white py-5 rounded-2xl font-black text-[10px] tracking-best backdrop-blur-md transition-all hover:bg-white/20"
                  >
                    <Shield size={20} className="text-[#ff0055]" />
                    HANGAR
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowSettingsInMenu(!showSettingsInMenu)}
                    className={`pointer-events-auto flex flex-col items-center justify-center gap-2 border py-5 rounded-2xl font-black text-[10px] tracking-best backdrop-blur-md transition-all ${showSettingsInMenu ? 'bg-[#00f2ff]/30 border-[#00f2ff]/60 text-[#00f2ff]' : 'bg-white/5 border-white/15 text-white hover:bg-white/15'}`}
                  >
                    <SettingsIcon size={20} className={showSettingsInMenu ? 'animate-spin-slow' : ''} />
                    CONFIG
                  </motion.button>
                </div>

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
            className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/70 backdrop-blur-3xl p-4 sm:p-8"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center w-full max-w-sm sm:max-w-md py-12"
            >
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/10 rounded-[2rem] flex items-center justify-center mb-6 border border-white/20 shadow-[0_0_40px_rgba(255,255,255,0.05)]">
                  <Pause size={32} className="text-white fill-white" />
              </div>

              <h2 className="text-5xl sm:text-7xl font-[1000] italic tracking-tighter text-white mb-2 leading-none text-center">SYSTEM<br />HALTED</h2>
              
              <div className="w-full h-px bg-white/10 my-8 sm:my-10" />

              <div className="flex flex-col items-center mb-10 sm:mb-14 text-center">
                <span className="text-[10px] sm:text-[12px] uppercase font-black tracking-[0.5em] text-white/30 mb-4">SYNC STATUS</span>
                <span className="text-5xl sm:text-8xl font-mono font-[900] text-[#00f2ff] tabular-nums tracking-tighter leading-none drop-shadow-[0_0_30px_rgba(0,242,255,0.4)]">
                  {score.toString().padStart(6, '0')}
                </span>
              </div>

              <div className="flex flex-col gap-4 w-full mb-12">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleStateChange(GameState.PLAYING)}
                  className="flex items-center justify-center gap-4 bg-[#00f2ff] text-black w-full py-6 sm:py-7 rounded-[1.5rem] font-[1000] tracking-tight text-xl shadow-[0_20px_50px_rgba(0,242,255,0.3)] transition-all"
                >
                  <PlayCircle size={28} fill="currentColor" />
                  RECONNECT
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    handleStateChange(GameState.START);
                    setTimeout(() => handleStateChange(GameState.PLAYING), 100);
                  }}
                  className="flex items-center justify-center gap-4 bg-white/5 border border-white/10 text-white w-full py-5 rounded-2xl font-black tracking-[0.4em] text-[10px] uppercase backdrop-blur-md transition-all hover:bg-white/10"
                >
                  <RefreshCw size={18} />
                  HARD REBOOT
                </motion.button>
              </div>

              <div className="w-full p-6 sm:p-8 bg-white/[0.03] rounded-[2.5rem] border border-white/10 space-y-6 mb-12">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-white/40">
                      {settings.soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
                      <span className="text-[10px] font-[900] tracking-best uppercase">Acoustics</span>
                    </div>
                    <button
                      onClick={() => setSettings(prev => ({ ...prev, soundEnabled: !prev.soundEnabled }))}
                      className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-best transition-all ${
                        settings.soundEnabled ? 'bg-[#00f2ff] text-black' : 'bg-white/10 text-white/40'
                      }`}
                    >
                      {settings.soundEnabled ? 'Live' : 'Mute'}
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between text-[8px] font-black text-white/20 tracking-best uppercase">
                        <span>Intensity</span>
                        <span>{Math.round(settings.volume * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={settings.volume}
                      onChange={(e) => setSettings(prev => ({ ...prev, volume: parseFloat(e.target.value) }))}
                      className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-[#00f2ff]"
                    />
                  </div>
              </div>
              
              <button 
                onClick={() => handleStateChange(GameState.START)}
                className="flex items-center gap-3 text-white/20 text-[11px] font-black uppercase tracking-[0.5em] hover:text-white transition-colors"
              >
                <Home size={16} />
                COMMAND CENTER
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
            className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/70 backdrop-blur-3xl p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              className="flex flex-col items-center w-full max-w-sm sm:max-w-md"
            >
              <div className="w-20 h-20 bg-[#ff0055]/10 border border-[#ff0055]/30 rounded-[2rem] flex items-center justify-center mb-6 shadow-[0_0_50px_rgba(255,0,85,0.2)]">
                  <RotateCcw size={32} className="text-[#ff0055]" />
              </div>

              <h2 className="text-5xl sm:text-8xl font-[1000] italic tracking-tighter text-[#ff0055] mb-2 leading-tight drop-shadow-[0_0_40px_rgba(255,0,85,0.4)] text-center">
                CONNECTION<br />VOIDED
              </h2>
              <p className="text-white/40 text-[10px] sm:text-xs tracking-[0.4em] uppercase font-black mb-12 text-center">
                System synchronization fatal
              </p>

              <div className="bg-white/[0.04] border border-white/10 rounded-[2.5rem] p-8 w-full mb-10 flex flex-col items-center relative overflow-hidden backdrop-blur-2xl shadow-2xl">
                {isNewRecordReached && (
                  <div className="absolute top-6 right-6 bg-[#f0ff00] text-black text-[8px] font-[1000] px-3 py-1 rounded-full uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(240,255,0,0.5)]">
                    NEW RECORD
                  </div>
                )}

                <div className="flex flex-col items-center mb-8 text-center">
                  <span className="text-[10px] font-black tracking-[0.5em] text-white/30 uppercase mb-4">SYNC LEVEL</span>
                  <span className="text-6xl sm:text-8xl font-mono font-[900] text-[#f0ff00] leading-none drop-shadow-[0_0_30px_rgba(240,255,0,0.5)] tracking-tighter">{score.toString().padStart(6, '0')}</span>
                </div>
                
                <div className="w-full h-px bg-white/10 mb-8" />
                
                <div className="flex justify-between w-full px-4">
                   <div className="flex flex-col">
                      <span className="text-[8px] font-black tracking-widest text-white/20 mb-1">BEST SYNC</span>
                      <span className="text-xl font-mono font-bold text-white/60">{highScore.toString().padStart(6, '0')}</span>
                   </div>
                   <div className="flex flex-col items-end">
                      <span className="text-[8px] font-black tracking-widest text-white/20 mb-1">MISSIONS</span>
                      <span className="text-xl font-mono font-bold text-white/60">{totalRuns.toString().padStart(3, '0')}</span>
                   </div>
                </div>
              </div>

              <div className="flex flex-col gap-4 w-full">
                <button
                  onClick={() => handleStateChange(GameState.PLAYING)}
                  className="flex items-center justify-center gap-4 bg-[#ff0055] text-white w-full py-6 rounded-2xl font-[1000] text-xl tracking-tight shadow-[0_20px_60px_rgba(255,0,85,0.4)] hover:scale-[1.03] active:scale-[0.97] transition-all"
                >
                  <RefreshCw size={24} className="animate-spin-once" />
                  REBOOT CORES
                </button>

                <button 
                  onClick={() => handleStateChange(GameState.START)}
                  className="flex items-center justify-center gap-3 text-white/30 text-[11px] font-black uppercase tracking-[0.5em] py-4 hover:text-white transition-colors"
                >
                  <Home size={16} />
                  EXIT PROTOCOL
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {gameState === GameState.WIN && (
          <motion.div 
            key="win"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/70 backdrop-blur-3xl p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              className="flex flex-col items-center w-full max-w-sm sm:max-w-md"
            >
              <div className="w-20 h-20 bg-[#00f2ff]/10 border border-[#00f2ff]/30 rounded-[2rem] flex items-center justify-center mb-6 shadow-[0_0_50px_rgba(0,242,255,0.2)]">
                  <Trophy size={40} className="text-[#00f2ff]" />
              </div>

              <h2 className="text-5xl sm:text-8xl font-[1000] italic tracking-tighter text-[#00f2ff] mb-2 leading-tight drop-shadow-[0_0_40px_rgba(0,242,255,0.4)] text-center">
                SYNC<br />OPTIMIZED
              </h2>
              <p className="text-white/40 text-[10px] sm:text-xs tracking-[0.4em] uppercase font-black mb-12 text-center">
                Protocol stability reached maximum
              </p>

              <div className="bg-white/[0.04] border border-white/10 rounded-[2.5rem] p-8 w-full mb-10 flex flex-col items-center relative overflow-hidden backdrop-blur-2xl shadow-2xl">
                <div className="flex flex-col items-center mb-8 text-center text-[#00f2ff]">
                  <span className="text-[10px] font-black tracking-[0.5em] uppercase mb-4 opacity-50">FINAL DATA</span>
                  <span className="text-6xl sm:text-8xl font-mono font-[900] leading-none drop-shadow-[0_0_30px_rgba(0,242,255,0.5)] tracking-tighter">{score.toString().padStart(6, '0')}</span>
                </div>
                
                <div className="w-full h-px bg-white/10 mb-8" />
                
                <div className="flex justify-between w-full px-4 text-white/60">
                   <div className="flex flex-col">
                      <span className="text-[8px] font-black tracking-widest text-white/20 mb-1 uppercase">Best Record</span>
                      <span className="text-xl font-mono font-bold">{highScore.toString().padStart(6, '0')}</span>
                   </div>
                   <div className="flex flex-col items-end">
                      <span className="text-[8px] font-black tracking-widest text-white/20 mb-1 uppercase">Missions</span>
                      <span className="text-xl font-mono font-bold">{totalRuns.toString().padStart(3, '0')}</span>
                   </div>
                </div>
              </div>

              <div className="flex flex-col gap-4 w-full">
                <button
                  onClick={() => handleStateChange(GameState.PLAYING)}
                  className="flex items-center justify-center gap-4 bg-white text-black w-full py-6 rounded-2xl font-[1000] text-xl tracking-tight shadow-[0_20px_60px_rgba(255,255,255,0.2)] hover:scale-[1.03] active:scale-[0.97] transition-all"
                >
                  <RotateCcw size={24} />
                  NEXT MISSION
                </button>

                <button 
                  onClick={() => handleStateChange(GameState.START)}
                  className="flex items-center justify-center gap-3 text-white/30 text-[11px] font-black uppercase tracking-[0.5em] py-4 hover:text-white transition-colors"
                >
                  <Home size={16} />
                  EXIT PROTOCOL
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

