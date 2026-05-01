import { motion, AnimatePresence } from 'motion/react';
import { X, Zap, Target, Clock, Rocket, Shield, Activity } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { cn } from '../../lib/utils';
import { useState } from 'react';

export default function DeepSprintPopup({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { startFocusSession } = useStore();
  const sprintOptions = [
    { label: 'Micro Sprint', duration: 10, intensity: 'Quick alignment', icon: WindIcon },
    { label: 'Standard Block', duration: 25, intensity: 'Steady rhythm', icon: Zap },
    { label: 'Deep Work', duration: 50, intensity: 'Singular focus', icon: Shield },
    { label: 'Extreme Flow', duration: 90, intensity: 'Outcome driven', icon: Rocket },
  ];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[110] bg-overlay backdrop-blur-sm flex items-center justify-center p-6"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="bg-card border border-card-border w-full max-w-lg rounded-[2rem] shadow-2xl relative overflow-hidden p-6 md:p-8 space-y-6 max-h-[90vh] overflow-y-auto scrollbar-hide"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Header */}
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 text-accent text-[8px] font-black uppercase tracking-widest leading-none">
              Ready to focus?
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center hover:bg-surface-muted rounded-full transition-colors text-text-secondary"
            >
              <X size={18} />
            </button>
          </div>

          <div className="space-y-2 text-center pb-2">
            <h2 className="text-2xl font-semibold tracking-tight text-text-main ">Start <span className="text-accent underline decoration-accent/20 underline-offset-4">Focus Session</span></h2>
            <p className="text-[10px] text-text-secondary font-medium opacity-60 max-w-xs mx-auto">
              Choose a session duration to begin.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {sprintOptions.map((opt) => (
              <button
                key={opt.label}
                onClick={() => {
                  startFocusSession(opt.duration, opt.label);
                  onClose();
                }}
                className="group flex flex-col p-5 rounded-2xl bg-bg-base border border-card-border hover:border-accent hover:bg-accent/[0.02] transition-all text-left space-y-4"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="w-10 h-10 rounded-xl bg-card border border-card-border flex items-center justify-center text-text-secondary group-hover:text-accent group-hover:border-accent/20 transition-all">
                    <opt.icon size={18} />
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black tabular-nums text-text-main">{opt.duration}m</p>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-text-main tracking-tight group-hover:text-accent transition-colors">{opt.label}</h4>
                  <p className="text-[9px] font-black uppercase tracking-widest text-text-secondary/40">{opt.intensity}</p>
                </div>
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-4">
            <button
              onClick={onClose}
              className="w-full py-3 text-[9px] font-black uppercase tracking-widest text-text-secondary/60 hover:text-text-main transition-colors"
            >
              Cancel
            </button>
            <div className="flex items-center gap-3 justify-center opacity-30">
               <Activity size={12} className="text-accent" />
               <span className="text-[8px] font-black uppercase tracking-[0.2em] text-text-secondary">System Ready</span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function WindIcon({ size, className }: { size?: number, className?: string }) {
  return (
    <svg
      width={size || 24}
      height={size || 24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2" />
      <path d="M9.6 4.6A2 2 0 1 1 11 8H2" />
      <path d="M12.6 19.4A2 2 0 1 0 14 16H2" />
    </svg>
  );
}
