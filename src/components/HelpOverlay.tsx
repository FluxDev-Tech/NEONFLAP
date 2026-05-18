import { motion } from 'motion/react';
import { X, Zap, MousePointer2, Smartphone, ShieldCheck, Target } from 'lucide-react';

interface HelpOverlayProps {
  onClose: () => void;
}

export default function HelpOverlay({ onClose }: HelpOverlayProps) {
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
            <div className="w-16 h-16 bg-[#00f2ff] rounded-3xl flex items-center justify-center shadow-[0_0_40px_rgba(0,242,255,0.4)]">
              <ShieldCheck className="text-black" size={32} />
            </div>
            <div>
              <h2 className="text-4xl font-[1000] italic tracking-tighter text-white uppercase leading-none">Briefing</h2>
              <p className="text-[#00f2ff] text-[10px] font-black tracking-[0.4em] uppercase mt-1">Mission Logistics</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 py-4">
           <div className="space-y-6">
              <div className="flex gap-4">
                 <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center shrink-0">
                    <MousePointer2 className="text-[#00f2ff]" size={20} />
                 </div>
                 <div>
                    <h4 className="text-white font-black text-xs tracking-widest uppercase mb-1">Desktop Control</h4>
                    <p className="text-white/40 text-[10px] uppercase leading-relaxed font-bold">Press <span className="text-white">SPACE</span> or <span className="text-white">CLICK</span> to engage pulse thrusters.</p>
                 </div>
              </div>

              <div className="flex gap-4">
                 <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center shrink-0">
                    <Smartphone className="text-[#ff0055]" size={20} />
                 </div>
                 <div>
                    <h4 className="text-white font-black text-xs tracking-widest uppercase mb-1">Mobile Interface</h4>
                    <p className="text-white/40 text-[10px] uppercase leading-relaxed font-bold"><span className="text-white">TAP</span> anywhere to ignite engines.</p>
                 </div>
              </div>
           </div>

           <div className="space-y-6">
              <div className="flex gap-4">
                 <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center shrink-0">
                    <Target className="text-[#f0ff00]" size={20} />
                 </div>
                 <div>
                    <h4 className="text-white font-black text-xs tracking-widest uppercase mb-1">Objective</h4>
                    <p className="text-white/40 text-[10px] uppercase leading-relaxed font-bold">Navigate through energy gates. Maintain flux stability.</p>
                 </div>
              </div>

              <div className="flex gap-4">
                 <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center shrink-0">
                    <Zap className="text-[#7c3aed]" size={20} />
                 </div>
                 <div>
                    <h4 className="text-white font-black text-xs tracking-widest uppercase mb-1">Offline Sync</h4>
                    <p className="text-white/40 text-[10px] uppercase leading-relaxed font-bold">Install as PWA for offline interstellar travel.</p>
                 </div>
              </div>
           </div>
        </div>

        <div className="mt-12 pt-8 border-t border-white/10">
           <button
             onClick={onClose}
             className="w-full py-5 bg-[#00f2ff] text-black rounded-2xl font-[1000] text-sm tracking-[0.3em] uppercase shadow-[0_15px_40px_rgba(0,242,255,0.2)] hover:scale-[1.02] active:scale-[0.98] transition-all"
           >
             Acknowledge & Sync
           </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
