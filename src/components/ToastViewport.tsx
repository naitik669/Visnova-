import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useStore } from '../store/useStore';
import { VisNovaMotion, type MotionVariant } from './ui/VisNovaMotion';

const icons = {
  success: CheckCircle2,
  error: AlertTriangle,
  info: Info,
};

function getToastAnimationVariant(title: string, description?: string): MotionVariant | null {
  const normalizedTitle = title.toLowerCase();
  const normalizedDescription = description?.toLowerCase() || '';

  if (normalizedTitle.includes('post shared')) return 'postPublished';
  if (normalizedTitle.includes('progress logged') || normalizedTitle.includes('win logged') || normalizedTitle.includes('blocker logged')) return 'progressLogPosted';
  if (normalizedTitle.includes('encouragement sent')) return 'nudgeSent';
  if (normalizedTitle.includes('invite ready') || (normalizedTitle.includes('link copied') && normalizedDescription.includes('vision team'))) return 'visionTeamInvite';
  if (normalizedTitle.includes('vision created')) return 'visionCreated';
  if (normalizedTitle.includes('task completed')) return 'taskCompleted';
  if (normalizedTitle.includes('weekly sprint completed')) return 'weeklySprintCompleted';

  return null;
}

function useIsMobileToastViewport() {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 767px)').matches;
  });

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  return isMobile;
}

export default function ToastViewport() {
  const { toasts, removeToast } = useStore();
  const isMobile = useIsMobileToastViewport();
  const visibleToasts = useMemo(() => toasts.slice(isMobile ? -1 : -2), [isMobile, toasts]);

  useEffect(() => {
    if (!visibleToasts.length) return;
    const timers = visibleToasts.map((toast) =>
      window.setTimeout(() => removeToast(toast.id), toast.type === 'error' ? 5200 : 2600)
    );
    return () => timers.forEach(window.clearTimeout);
  }, [visibleToasts, removeToast]);

  return (
    <div className="pointer-events-none fixed inset-x-3 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-[300] flex w-auto flex-col gap-2 sm:inset-x-auto sm:bottom-auto sm:right-6 sm:top-6 sm:w-[min(340px,calc(100vw-2rem))]">
      <AnimatePresence initial={false}>
        {visibleToasts.map((toast) => {
          const Icon = icons[toast.type] || Info;
          const animationVariant = toast.type === 'success' ? getToastAnimationVariant(toast.title, toast.description) : null;
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: isMobile ? 16 : -12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: isMobile ? 16 : -12, scale: 0.96 }}
              className="pointer-events-auto rounded-2xl border border-card-border bg-card/95 p-3 shadow-xl shadow-overlay/5 backdrop-blur-xl"
            >
              <div className="flex items-start gap-3">
                {animationVariant ? (
                  <VisNovaMotion
                    variant={animationVariant}
                    size="sm"
                    decorative
                    className="mt-[-6px] h-12 w-12 shrink-0 max-w-none sm:mt-[-10px] sm:h-16 sm:w-16"
                  />
                ) : (
                  <div className="mt-0.5 rounded-xl bg-accent/10 p-2 text-accent">
                    <Icon size={16} />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-text-main">{toast.title}</p>
                  {toast.description && (
                    <p className="mt-1 text-xs font-medium leading-relaxed text-text-secondary">
                      {toast.description}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => removeToast(toast.id)}
                  className="flex min-h-9 min-w-9 items-center justify-center rounded-xl text-text-secondary/60 transition-colors hover:bg-surface-muted hover:text-text-main"
                  aria-label="Dismiss notification"
                >
                  <X size={14} />
                </button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
