import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../../store/useStore';
import { Clock, Play, Pause, X, Maximize2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useEffect, useRef, useState } from 'react';

const PIP_MARGIN = 16;

const defaultPipPosition = () => {
  if (typeof window === 'undefined') return { x: 24, y: 24 };
  return {
    x: Math.max(PIP_MARGIN, window.innerWidth - 280),
    y: Math.max(PIP_MARGIN, window.innerHeight - 180)
  };
};

export default function FloatingTimer() {
  const { focusSession, updateFocusTime, toggleFocusMode, endFocusSession, user, toggleGrinding, toggleFocusSession, isFocusMode } = useStore();
  const pipRef = useRef<HTMLDivElement>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const [pipPosition, setPipPosition] = useState(defaultPipPosition);
  const [isDragging, setIsDragging] = useState(false);

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

  const clampPosition = (x: number, y: number) => {
    const rect = pipRef.current?.getBoundingClientRect();
    const width = rect?.width || 260;
    const height = rect?.height || 96;
    const maxX = Math.max(PIP_MARGIN, window.innerWidth - width - PIP_MARGIN);
    const maxY = Math.max(PIP_MARGIN, window.innerHeight - height - PIP_MARGIN);
    return {
      x: Math.min(Math.max(PIP_MARGIN, x), maxX),
      y: Math.min(Math.max(PIP_MARGIN, y), maxY)
    };
  };

  useEffect(() => {
    const handleResize = () => {
      setPipPosition(position => clampPosition(position.x, position.y));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handlePointerMove = (event: PointerEvent) => {
      setPipPosition(clampPosition(
        event.clientX - dragOffsetRef.current.x,
        event.clientY - dragOffsetRef.current.y
      ));
    };

    const handlePointerUp = () => setIsDragging(false);

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [isDragging]);

  if (!focusSession.isActive || isFocusMode) return null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = ((focusSession.totalTime - focusSession.timeLeft) / focusSession.totalTime) * 100;

  const beginDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest('button')) return;
    const rect = pipRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragOffsetRef.current = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
    setIsDragging(true);
  };

  return (
    <AnimatePresence>
      <motion.div
        ref={pipRef}
        initial={{ opacity: 0, scale: 0.88 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        style={{ left: pipPosition.x, top: pipPosition.y }}
        onPointerDown={beginDrag}
        className={cn(
          "fixed z-[150] group max-w-[calc(100vw-2rem)] select-none touch-none",
          isDragging ? "cursor-grabbing" : "cursor-grab"
        )}
      >
        <div className="relative">
           {/* Glow Effect */}
           <div className={cn(
             "absolute inset-0 bg-accent/20 blur-xl rounded-full transition-opacity duration-700",
             focusSession.isRunning ? "opacity-100" : "opacity-0"
           )} />

           <div className="relative bg-card-elevated/95 backdrop-blur-xl border border-accent/20 rounded-2xl p-3 sm:p-4 shadow-2xl flex items-center gap-3 sm:gap-4 min-w-[220px] max-w-[calc(100vw-2rem)] ring-1 ring-white/5">
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
                 <p className="text-[8px] font-black uppercase tracking-widest text-accent mb-1">PiP Sprint</p>
                 <p className="text-xl font-bold tabular-nums text-text-main leading-none tracking-tight">
                    {formatTime(focusSession.timeLeft)}
                 </p>
                 <p className="mt-1 max-w-28 truncate text-[8px] font-bold uppercase tracking-widest text-text-secondary/50">
                   {focusSession.label}
                 </p>
              </div>

              <div
                className="flex flex-col gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                onPointerDown={(event) => event.stopPropagation()}
              >
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
                onPointerDown={(event) => event.stopPropagation()}
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
