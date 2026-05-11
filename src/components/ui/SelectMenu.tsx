import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

export type SelectMenuOption = {
  value: string;
  label: string;
  description?: string;
  icon?: ReactNode;
};

export function SelectMenu({
  value,
  onChange,
  options,
  placeholder = 'Select',
  icon,
  className,
  triggerClassName,
  menuClassName,
  disabled = false
}: {
  value: string;
  onChange: (value: string) => void;
  options: SelectMenuOption[];
  placeholder?: string;
  icon?: ReactNode;
  className?: string;
  triggerClassName?: string;
  menuClassName?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find(option => option.value === value);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cn('relative min-w-0', className)}>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(current => !current)}
        className={cn('visnova-select-trigger', triggerClassName)}
      >
        {icon && <span className="text-text-secondary/50 shrink-0">{icon}</span>}
        <span className={cn('truncate text-left', selected ? 'text-text-main' : 'text-text-secondary/60')}>
          {selected?.label || placeholder}
        </span>
        <ChevronDown size={15} className={cn('ml-auto shrink-0 text-text-secondary/45 transition-transform', open && 'rotate-180 text-accent')} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.14 }}
            role="listbox"
            onClick={(event) => event.stopPropagation()}
            onMouseDown={(event) => event.stopPropagation()}
            className={cn(
              'visnova-menu fixed inset-x-3 bottom-[calc(1rem+env(safe-area-inset-bottom))] max-h-[55dvh] overflow-y-auto p-1.5 sm:absolute sm:inset-x-0 sm:bottom-auto sm:top-full sm:mt-2 sm:max-h-72',
              menuClassName
            )}
          >
            {options.map(option => {
              const active = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={cn('visnova-menu-item', active && 'visnova-menu-item-active')}
                >
                  {option.icon && <span className="shrink-0 text-text-secondary/55">{option.icon}</span>}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{option.label}</span>
                    {option.description && <span className="mt-0.5 block truncate text-[10px] font-semibold normal-case tracking-normal text-text-secondary/55">{option.description}</span>}
                  </span>
                  {active && <Check size={14} className="shrink-0 text-accent" />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

