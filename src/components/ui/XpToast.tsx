import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Zap } from 'lucide-react';
import { getLevelProgress } from '../../lib/progression';

type XpEventDetail = {
  amount: number;
  newTotal: number;
  leveledUp: boolean;
  newLevel: number;
};

export function XpToast() {
  const [event, setEvent] = useState<XpEventDetail | null>(null);
  const [levelUp, setLevelUp] = useState<XpEventDetail | null>(null);

  useEffect(() => {
    const handleXp = (xpEvent: Event) => {
      const detail = (xpEvent as CustomEvent<XpEventDetail>).detail;
      if (!detail?.amount) return;
      setEvent(detail);
      if (detail.leveledUp) setLevelUp(detail);
      window.setTimeout(() => setEvent(current => current === detail ? null : current), 2600);
    };

    window.addEventListener('visnova-xp-gained', handleXp);
    return () => window.removeEventListener('visnova-xp-gained', handleXp);
  }, []);

  const progress = event ? getLevelProgress(event.newTotal) : null;

  return (
    <>
      <AnimatePresence>
        {event && (
          <motion.div
            key={`${event.newTotal}-${event.amount}`}
            initial={{ opacity: 0, y: 24, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="fixed inset-x-3 bottom-[calc(6.25rem+env(safe-area-inset-bottom))] z-[300] rounded-2xl border border-accent/30 bg-accent p-4 text-accent-contrast shadow-2xl shadow-accent/25 sm:inset-x-auto sm:right-4 sm:w-[min(20rem,calc(100vw-2rem))] lg:bottom-8"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xl font-black tracking-tight">+{event.amount} XP</p>
                <p className="text-[9px] font-black uppercase tracking-widest opacity-75">Level {progress?.level || event.newLevel}</p>
              </div>
              <Zap size={24} className="fill-current" />
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-accent-contrast/25">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress?.progress || 0}%` }}
                className="h-full rounded-full bg-accent-contrast"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {levelUp && (
          <motion.button
            type="button"
            onClick={() => setLevelUp(null)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[320] flex min-h-[100dvh] items-center justify-center bg-overlay/70 p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-[calc(1.25rem+env(safe-area-inset-top))] backdrop-blur-md"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              className="w-full max-w-sm rounded-[2rem] border border-accent/30 bg-card p-8 text-center shadow-2xl"
            >
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-accent text-accent-contrast">
                <Zap size={30} className="fill-current" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-accent">Level Up</p>
              <h2 className="mt-2 text-2xl font-black uppercase tracking-tight text-text-main">Level {levelUp.newLevel} Reached</h2>
              <p className="mt-3 text-sm font-semibold text-text-secondary">Visionary Level {levelUp.newLevel}. Tap anywhere to continue.</p>
              <div className="mt-6 h-2 rounded-full bg-surface-muted">
                <div className="h-full w-0 rounded-full bg-accent" />
              </div>
            </motion.div>
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
}
