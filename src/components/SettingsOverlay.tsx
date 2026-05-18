import { motion } from 'motion/react';
import { X, Volume2, VolumeX, Eye, EyeOff, Zap } from 'lucide-react';

interface SettingsOverlayProps {
  onClose: () => void;
  settings: {
    volume: number;
    soundEnabled: boolean;
    vFXEnabled: boolean;
  };
  onUpdate: (settings: any) => void;
  key?: string | number;
}

export default function SettingsOverlay({ onClose, settings, onUpdate }: SettingsOverlayProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-2xl p-6"
    >
      <div className="absolute top-8 right-8">
        <button
          onClick={onClose}
          className="p-4 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
        >
          <X size={24} />
        </button>
      </div>

      <div className="w-full max-w-md">
        <div className="flex items-center gap-4 mb-12">
          <div className="p-3 bg-[#00f2ff]/20 rounded-2xl">
            <Zap className="text-[#00f2ff]" size={32} />
          </div>
          <div>
            <h2 className="text-4xl font-black italic tracking-tighter text-white">SYSTEM CONFIG</h2>
            <p className="text-white/30 text-[10px] font-bold tracking-[0.4em] uppercase">Control Panel v2.6</p>
          </div>
        </div>

        <div className="space-y-8">
          {/* Audio Section */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {settings.soundEnabled ? <Volume2 className="text-[#00f2ff]" size={20} /> : <VolumeX className="text-white/20" size={20} />}
                <span className="text-xs font-black tracking-widest uppercase">Audio Systems</span>
              </div>
              <button
                onClick={() => onUpdate({ ...settings, soundEnabled: !settings.soundEnabled })}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  settings.soundEnabled ? 'bg-[#00f2ff] text-black shadow-[0_0_20px_rgba(0,242,255,0.4)]' : 'bg-white/5 text-white/30'
                }`}
              >
                {settings.soundEnabled ? 'Online' : 'Disabled'}
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between text-[10px] font-bold text-white/40 tracking-widest uppercase">
                <span>Output Level</span>
                <span>{Math.round(settings.volume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={settings.volume}
                onChange={(e) => onUpdate({ ...settings, volume: parseFloat(e.target.value) })}
                className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-[#00f2ff]"
              />
            </div>
          </div>

          <div className="h-px bg-white/5" />

          {/* Visuals Section */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {settings.vFXEnabled ? <Eye className="text-[#f0ff00]" size={20} /> : <EyeOff className="text-white/20" size={20} />}
                <span className="text-xs font-black tracking-widest uppercase">Visual FX</span>
              </div>
              <button
                onClick={() => onUpdate({ ...settings, vFXEnabled: !settings.vFXEnabled })}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  settings.vFXEnabled ? 'bg-[#f0ff00] text-black shadow-[0_0_20px_rgba(240,255,0,0.4)]' : 'bg-white/5 text-white/30'
                }`}
              >
                {settings.vFXEnabled ? 'Maximum' : 'Low Power'}
              </button>
            </div>
            <p className="text-[9px] text-white/20 font-bold tracking-[0.2em] leading-relaxed uppercase">
              Visual FX include particle systems, bloom gradients, and screen shake. Disable for maximum battery life.
            </p>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-white/5 flex flex-col items-center">
          <p className="text-[8px] font-black tracking-[0.5em] text-white/10 uppercase mb-4">NEON FLAP ENGINEERING</p>
          <div className="flex gap-4">
            <div className="w-1 h-1 bg-[#00f2ff] rounded-full animate-pulse" />
            <div className="w-1 h-1 bg-[#ff0055] rounded-full animate-pulse delay-75" />
            <div className="w-1 h-1 bg-[#f0ff00] rounded-full animate-pulse delay-150" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
