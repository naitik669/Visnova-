import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isAfter, isBefore, isSameDay, isSameMonth, startOfMonth, startOfWeek, subMonths } from 'date-fns';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

type DatePickerProps = {
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  min?: string;
  max?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  ariaLabel?: string;
};

const parseDate = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(`${value}T12:00:00`);
  return Number.isFinite(date.getTime()) ? date : null;
};

const toDateKey = (date: Date) => format(date, 'yyyy-MM-dd');

export function DatePicker({
  name,
  value,
  defaultValue = '',
  onChange,
  min,
  max,
  placeholder = 'Select date',
  disabled = false,
  className,
  triggerClassName,
  ariaLabel = 'Select date'
}: DatePickerProps) {
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue);
  const selectedValue = isControlled ? value || '' : internalValue;
  const selectedDate = parseDate(selectedValue);
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState<Date>(selectedDate || new Date());
  const [menuRect, setMenuRect] = useState<{ left: number; top: number; width: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const minDate = parseDate(min);
  const maxDate = parseDate(max);

  useEffect(() => {
    if (selectedDate) setVisibleMonth(selectedDate);
  }, [selectedValue]);

  useEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      const rect = rootRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.max(320, Math.min(380, window.innerWidth - 24));
      setMenuRect({
        left: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)),
        top: Math.min(rect.bottom + 8, window.innerHeight - 380),
        width
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open]);

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

  const days = useMemo(() => eachDayOfInterval({
    start: startOfWeek(startOfMonth(visibleMonth), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(visibleMonth), { weekStartsOn: 1 })
  }), [visibleMonth]);

  const setDate = (nextValue: string) => {
    if (!isControlled) setInternalValue(nextValue);
    onChange?.(nextValue);
    setOpen(false);
  };

  const isDisabledDate = (date: Date) =>
    Boolean((minDate && isBefore(date, minDate)) || (maxDate && isAfter(date, maxDate)));

  return (
    <div ref={rootRef} className={cn('relative min-w-0', className)}>
      {name && <input type="hidden" name={name} value={selectedValue} />}
      <button
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(current => !current)}
        className={cn(
          'flex h-11 w-full items-center gap-2 rounded-2xl border border-card-border bg-card px-3 text-left text-xs font-black uppercase tracking-widest text-text-main outline-none transition-all hover:border-accent/40 focus:border-accent/60 focus:ring-4 focus:ring-accent/10 disabled:cursor-not-allowed disabled:opacity-50',
          triggerClassName
        )}
      >
        <CalendarDays size={15} className="shrink-0 text-accent" />
        <span className={cn('min-w-0 flex-1 truncate', !selectedValue && 'text-text-secondary/50')}>
          {selectedDate ? format(selectedDate, 'MMM d, yyyy') : placeholder}
        </span>
      </button>

      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {open && menuRect && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.14 }}
              role="dialog"
              aria-label={ariaLabel}
              onClick={event => event.stopPropagation()}
              onMouseDown={event => event.stopPropagation()}
              className="fixed z-[540] overflow-hidden rounded-[1.7rem] border border-card-border bg-card p-4 shadow-2xl"
              style={{ left: menuRect.left, top: menuRect.top, width: menuRect.width, maxWidth: 'calc(100vw - 24px)' }}
            >
              <div className="flex items-center justify-between gap-3">
                <button type="button" onClick={() => setVisibleMonth(month => subMonths(month, 1))} className="flex h-10 w-10 items-center justify-center rounded-2xl bg-app-container text-text-secondary hover:text-accent">
                  <ChevronLeft size={18} />
                </button>
                <div className="flex items-center gap-2">
                  <span className="rounded-2xl bg-app-container px-4 py-2 text-sm font-black text-text-main">{format(visibleMonth, 'MMM')}</span>
                  <span className="rounded-2xl bg-app-container px-4 py-2 text-sm font-black text-text-main">{format(visibleMonth, 'yyyy')}</span>
                </div>
                <button type="button" onClick={() => setVisibleMonth(month => addMonths(month, 1))} className="flex h-10 w-10 items-center justify-center rounded-2xl bg-app-container text-text-secondary hover:text-accent">
                  <ChevronRight size={18} />
                </button>
              </div>

              <div className="mt-4 grid grid-cols-7 gap-1 text-center">
                {['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'].map(day => (
                  <span key={day} className="py-2 text-[9px] font-black text-text-secondary/45">{day}</span>
                ))}
                {days.map(day => {
                  const dayKey = toDateKey(day);
                  const selected = selectedDate ? isSameDay(day, selectedDate) : false;
                  const muted = !isSameMonth(day, visibleMonth);
                  const unavailable = isDisabledDate(day);
                  return (
                    <button
                      key={dayKey}
                      type="button"
                      disabled={unavailable}
                      onClick={() => setDate(dayKey)}
                      className={cn(
                        'relative flex aspect-square items-center justify-center rounded-xl text-sm font-black transition-all',
                        selected ? 'bg-accent text-accent-contrast shadow-sm' : 'bg-app-container text-text-main hover:bg-accent/10 hover:text-accent',
                        muted && !selected && 'text-text-secondary/35',
                        unavailable && 'cursor-not-allowed opacity-25 hover:bg-app-container hover:text-text-secondary/35'
                      )}
                    >
                      {format(day, 'd')}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 flex items-center justify-between gap-3 border-t border-card-border pt-3">
                <button type="button" onClick={() => setDate(toDateKey(new Date()))} disabled={isDisabledDate(new Date())} className="h-10 rounded-2xl bg-accent px-5 text-[10px] font-black uppercase tracking-widest text-accent-contrast disabled:opacity-40">
                  Today
                </button>
                <button type="button" onClick={() => setOpen(false)} className="h-10 rounded-2xl border border-card-border bg-card px-5 text-[10px] font-black uppercase tracking-widest text-text-secondary">
                  Cancel
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}

export default DatePicker;
