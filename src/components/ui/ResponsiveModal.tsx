import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'fullscreen';

interface ResponsiveModalProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  size?: ModalSize;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  contentClassName?: string;
  headerClassName?: string;
  disableCloseOnOverlayClick?: boolean;
  closeLabel?: string;
  zIndexClassName?: string;
}

const sizeClasses: Record<ModalSize, string> = {
  sm: 'sm:w-[min(calc(100vw-2rem),28rem)]',
  md: 'sm:w-[min(calc(100vw-2rem),42rem)]',
  lg: 'sm:w-[min(calc(100vw-2rem),56rem)]',
  xl: 'sm:w-[min(calc(100vw-2rem),72rem)]',
  fullscreen: 'sm:w-[calc(100vw-2rem)]'
};

export function ResponsiveModal({
  open,
  onClose,
  title,
  subtitle,
  size = 'md',
  children,
  footer,
  className,
  contentClassName,
  headerClassName,
  disableCloseOnOverlayClick = false,
  closeLabel = 'Close modal',
  zIndexClassName = 'z-[220]'
}: ResponsiveModalProps) {
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={cn(
            'fixed inset-0 flex items-end sm:items-center justify-center bg-overlay/80 backdrop-blur-md overflow-hidden',
            'p-0 sm:p-4',
            zIndexClassName
          )}
          role="presentation"
          onMouseDown={(event) => {
            if (disableCloseOnOverlayClick) return;
            if (event.target === event.currentTarget) onClose();
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className={cn(
              'relative w-screen h-[100dvh] sm:h-auto',
              sizeClasses[size],
              'max-h-[100dvh] sm:max-h-[calc(100dvh-2rem)]',
              'bg-app-container border border-card-border shadow-2xl overflow-hidden flex flex-col',
              'rounded-none sm:rounded-[2rem]',
              className
            )}
            role="dialog"
            aria-modal="true"
          >
            {(title || subtitle) && (
              <div className={cn('shrink-0 border-b border-card-border bg-app-container/95 px-4 py-4 sm:px-6 sm:py-5 flex items-start justify-between gap-4', headerClassName)}>
                <div className="min-w-0">
                  {title && <h2 className="text-lg sm:text-xl font-black text-text-main tracking-tight truncate">{title}</h2>}
                  {subtitle && <p className="mt-1 text-xs sm:text-sm font-medium text-text-secondary/70 line-clamp-2">{subtitle}</p>}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label={closeLabel}
                  className="w-10 h-10 rounded-xl bg-surface-muted text-text-secondary hover:text-text-main flex items-center justify-center shrink-0 focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <X size={18} />
                </button>
              </div>
            )}

            <div className={cn('flex-1 min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar', contentClassName)}>
              {children}
            </div>

            {footer && (
              <div className="shrink-0 border-t border-card-border bg-app-container/95 px-4 py-3 sm:px-6 sm:py-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3">
                  {footer}
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
