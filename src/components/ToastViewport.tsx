import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { useEffect } from 'react';
import { useStore } from '../store/useStore';

const icons = {
  success: CheckCircle2,
  error: AlertTriangle,
  info: Info,
};

export default function ToastViewport() {
  const { toasts, removeToast } = useStore();

  useEffect(() => {
    if (!toasts.length) return;
    const timers = toasts.map((toast) =>
      window.setTimeout(() => removeToast(toast.id), 4500)
    );
    return () => timers.forEach(window.clearTimeout);
  }, [toasts, removeToast]);

  return (
    <div className="fixed top-6 right-6 z-[300] flex w-[min(380px,calc(100vw-3rem))] flex-col gap-3 pointer-events-none">
      <AnimatePresence initial={false}>
        {toasts.map((toast) => {
          const Icon = icons[toast.type];
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.96 }}
              className="pointer-events-auto rounded-2xl border border-card-border bg-card/95 p-4 shadow-2xl backdrop-blur-xl"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-xl bg-accent/10 p-2 text-accent">
                  <Icon size={16} />
                </div>
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
                  className="rounded-lg p-1 text-text-secondary/60 transition-colors hover:bg-surface-muted hover:text-text-main"
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
