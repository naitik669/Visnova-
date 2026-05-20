import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Loader2, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/utils';

type ConfirmTone = 'danger' | 'warning' | 'info';

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
};

const toneClasses: Record<ConfirmTone, string> = {
  danger: 'bg-danger/10 text-danger border-danger/20',
  warning: 'bg-warning/10 text-warning border-warning/20',
  info: 'bg-accent/10 text-accent border-accent/20'
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'danger',
  isLoading = false,
  onConfirm,
  onCancel
}: ConfirmDialogProps) {
  const dialog = (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[320] flex items-end justify-center p-0 sm:items-center sm:p-4">
          <motion.button
            type="button"
            aria-label="Cancel confirmation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 bg-overlay/80 backdrop-blur-md"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.96 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="relative w-full max-w-md rounded-t-[2rem] border border-card-border bg-card p-5 shadow-2xl sm:rounded-[2rem] sm:p-6"
          >
            <div className="flex items-start gap-4">
              <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border', toneClasses[tone])}>
                <AlertTriangle size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <h2 id="confirm-dialog-title" className="text-lg font-black uppercase tracking-tight text-text-main">
                  {title}
                </h2>
                <p className="mt-2 text-sm font-semibold leading-relaxed text-text-secondary">
                  {description}
                </p>
              </div>
              <button
                type="button"
                onClick={onCancel}
                disabled={isLoading}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-muted text-text-secondary/60 transition-colors hover:text-text-main disabled:opacity-50"
                aria-label="Close confirmation"
              >
                <X size={17} />
              </button>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={onCancel}
                disabled={isLoading}
                className="h-12 rounded-2xl border border-card-border bg-surface-muted text-[10px] font-black uppercase tracking-widest text-text-secondary transition-colors hover:text-text-main disabled:opacity-50"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={isLoading}
                className={cn(
                  'flex h-12 items-center justify-center gap-2 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-60',
                  tone === 'danger' ? 'bg-danger shadow-danger/20' : tone === 'warning' ? 'bg-warning shadow-warning/20' : 'bg-accent text-accent-contrast shadow-accent/20'
                )}
              >
                {isLoading && <Loader2 size={14} className="animate-spin" />}
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  if (typeof document === 'undefined') return dialog;
  return createPortal(dialog, document.body);
}
