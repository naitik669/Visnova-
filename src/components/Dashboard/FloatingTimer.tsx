import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../../store/useStore';
import { Clock, Play, Pause, X, Maximize2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useEffect, useState } from 'react';

export default function FloatingTimer() {
  const { focusSession, updateFocusTime, toggleFocusMode, endFocusSession, user, toggleGrinding, toggleFocusSession, isFocusMode } = useStore();

  useEffect(() => {
    let interval: any = null;
    if (focusSession.isActive && focusSession.isRunning && focusSession.timeLeft > 0) {
      interval = setInterval(() => {
        updateFocusTime(focusSession.timeLeft - 1);
      }, 1000);

      if (!user.isGrinding) toggleGrinding();
    } else if (focusSession.timeLeft === 0 && focusSession.isRunning) {
      // Session finished
      if (user.isGrinding) toggleGrinding();
    }
    return () => clearInterval(interval);
  }, [focusSession.isActive, focusSession.isRunning, focusSession.timeLeft, updateFocusTime, user.isGrinding, toggleGrinding]);

  if (!focusSession.isActive || isFocusMode) return null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = ((focusSession.totalTime - focusSession.timeLeft) / focusSession.totalTime) * 100;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 20, scale: 0.8 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        drag
        dragConstraints={{ left: -1000, right: 1000, top: -1000, bottom: 1000 }}
        className="fixed bottom-24 right-4 sm:right-8 z-[150] group cursor-move max-w-[calc(100vw-2rem)]"
      >
        <div className="relative">
           {/* Glow Effect */}
           <div className={cn(
             "absolute inset-0 bg-accent/20 blur-xl rounded-full transition-opacity duration-700",
             focusSession.isRunning ? "opacity-100" : "opacity-0"
           )} />

           <div className="relative bg-card-elevated border border-accent/20 rounded-2xl p-3 sm:p-4 shadow-2xl flex items-center gap-3 sm:gap-4 min-w-[160px] max-w-[calc(100vw-2rem)] ring-1 ring-white/5">
              <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
                 <svg className="absolute inset-0 w-full h-full -rotate-90">
                    <circle cx="24" cy="24" r="20" fill="none" stroke="var(--surface-strong)" strokeWidth="3" />
                    <motion.circle
                       cx="24"
                       cy="24"
                       r="20"
                       fill="none"
                       stroke="var(--accent)"
                       strokeWidth="3"
                       strokeDasharray="125.66"
                       animate={{ strokeDashoffset: 125.66 - (125.66 * progress) / 100 }}
                    />
                 </svg>
                 <Clock size={16} className="text-accent relative z-10" />
              </div>

              <div className="flex-1 pr-2">
                 <p className="text-[8px] font-black uppercase tracking-widest text-text-secondary/70 mb-1">{focusSession.label}</p>
                 <p className="text-xl font-bold tabular-nums text-text-main leading-none tracking-tight">
                    {formatTime(focusSession.timeLeft)}
                 </p>
              </div>

              <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                 <button
                    onClick={toggleFocusSession}
                    className="w-8 h-8 rounded-lg bg-surface-muted text-text-main border border-card-border flex items-center justify-center hover:bg-accent hover:text-accent-contrast transition-colors"
                 >
                    {focusSession.isRunning ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" className="ml-0.5" />}
                 </button>
                 <button
                    onClick={toggleFocusMode}
                    className="w-8 h-8 rounded-lg bg-surface-muted text-text-main border border-card-border flex items-center justify-center hover:bg-accent hover:text-accent-contrast transition-colors"
                 >
                    <Maximize2 size={14} />
                 </button>
              </div>

              <button
                onClick={endFocusSession}
                className="absolute -top-2 -right-2 w-6 h-6 bg-danger text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
              >
                <X size={12} />
              </button>
           </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
