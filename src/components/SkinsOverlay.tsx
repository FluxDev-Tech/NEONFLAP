import { motion } from 'motion/react';
import { X, Lock, Check, Zap } from 'lucide-react';
import { SKIN_PROTOCOLS, SkinProtocol } from '../game/SkinPresets';

interface SkinsOverlayProps {
  onClose: () => void;
  unlockedSkins: string[];
  selectedSkinId: string;
  onSelect: (id: string) => void;
  stats: {
    best: number;
    total: number;
  };
  key?: string | number;
}

export default function SkinsOverlay({ onClose, unlockedSkins, selectedSkinId, onSelect, stats }: SkinsOverlayProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#03030b]/90 backdrop-blur-3xl p-4 sm:p-6"
    >
      <div className="fixed inset-0" onClick={onClose} />

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
        className="w-full max-w-2xl bg-black/40 p-8 sm:p-12 rounded-[3.5rem] border border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.8)] relative"
      >
        <button
          onClick={onClose}
          className="absolute -top-4 -right-4 w-12 h-12 rounded-full bg-white text-black flex items-center justify-center shadow-xl hover:scale-110 active:scale-90 transition-all z-[110]"
        >
          <X size={20} strokeWidth={3} />
        </button>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-10 gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-[#ff0055] rounded-3xl flex items-center justify-center shadow-[0_0_40px_rgba(255,0,85,0.4)]">
              <Zap className="text-white fill-white" size={32} />
            </div>
            <div>
              <h2 className="text-4xl font-[1000] italic tracking-tighter text-white uppercase leading-none">Hangar</h2>
              <p className="text-[#ff0055] text-[10px] font-black tracking-[0.4em] uppercase mt-1">Skins Archive</p>
            </div>
          </div>

          <div className="flex gap-8 border-l border-white/10 pl-8">
            <div className="flex flex-col">
              <span className="text-[9px] font-black tracking-widest text-white/20 uppercase mb-1">Max Data</span>
              <span className="text-2xl font-mono font-[900] text-[#00f2ff]">{stats.best.toString().padStart(6, '0')}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[50vh] overflow-y-auto pr-4 custom-scrollbar scroll-smooth">
          {SKIN_PROTOCOLS.map((skin) => {
            const isUnlocked = unlockedSkins.includes(skin.id);
            const isSelected = selectedSkinId === skin.id;

            return (
              <motion.button
                key={skin.id}
                whileHover={isUnlocked ? { scale: 1.02, x: 5 } : {}}
                whileTap={isUnlocked ? { scale: 0.98 } : {}}
                onClick={() => isUnlocked && onSelect(skin.id)}
                className={`relative flex flex-col text-left p-6 rounded-3xl border transition-all ${
                  isUnlocked 
                    ? isSelected 
                      ? 'bg-white/10 border-white/30 shadow-[0_0_30px_rgba(255,255,255,0.1)]' 
                      : 'bg-white/5 border-white/10 hover:bg-white/[0.08]' 
                    : 'bg-black/40 border-white/5 opacity-60 grayscale'
                }`}
              >
                {!isUnlocked && (
                  <div className="absolute top-4 right-4 text-white/20">
                    <Lock size={16} />
                  </div>
                )}
                
                {isSelected && (
                  <div className="absolute top-4 right-4 text-[#00f2ff]">
                    <Check size={20} strokeWidth={3} />
                  </div>
                )}

                <div className="flex items-center gap-4 mb-4">
                  <div 
                    className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner"
                    style={{ backgroundColor: skin.colors.primary }}
                  >
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: skin.colors.glow, filter: 'blur(4px)' }}
                    />
                  </div>
                  <div>
                    <h3 className="font-black italic tracking-tighter text-white">{skin.name}</h3>
                    <p className={`text-[8px] font-bold tracking-widest uppercase ${isUnlocked ? 'text-white/40' : 'text-[#ff0055]'}`}>
                      {isUnlocked ? 'Protocol Verified' : `Lock: ${skin.requirement}`}
                    </p>
                  </div>
                </div>

                <p className="text-[10px] text-white/30 leading-relaxed font-medium uppercase tracking-wider">
                  {skin.description}
                </p>

                {isSelected && (
                  <motion.div 
                    layoutId="active-indicator"
                    className="absolute -left-1 top-6 bottom-6 w-1 bg-[#00f2ff] rounded-full shadow-[0_0_10px_#00f2ff]"
                  />
                )}
              </motion.button>
            );
          })}
        </div>

        <div className="mt-12 flex items-center justify-between opacity-20">
          <span className="text-[8px] font-black tracking-[0.5em] uppercase">Security Level 4</span>
          <div className="flex gap-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="w-1.5 h-1.5 bg-white/50 rounded-full" />
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
