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
      className="absolute inset-0 z-[100] flex items-center justify-center bg-[#03030b]/95 backdrop-blur-2xl p-6"
    >
      <div className="absolute top-8 right-8">
        <button
          onClick={onClose}
          className="p-4 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
        >
          <X size={24} />
        </button>
      </div>

      <div className="w-full max-w-2xl">
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[#ff0055]/20 rounded-2xl">
              <Zap className="text-[#ff0055]" size={32} />
            </div>
            <div>
              <h2 className="text-4xl font-black italic tracking-tighter text-white uppercase">Hangar Bay</h2>
              <p className="text-white/30 text-[10px] font-bold tracking-[0.4em] uppercase">Protocol Management v1.4</p>
            </div>
          </div>

          <div className="hidden sm:flex gap-8">
            <div className="flex flex-col items-end">
              <span className="text-[8px] font-black tracking-widest text-white/20 uppercase">Max Flux</span>
              <span className="text-xl font-mono font-bold text-[#00f2ff]">{stats.best.toString().padStart(6, '0')}</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[8px] font-black tracking-widest text-white/20 uppercase">Missions</span>
              <span className="text-xl font-mono font-bold text-[#ff0055]">{stats.total}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
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
      </div>
    </motion.div>
  );
}
