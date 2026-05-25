import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, ChevronDown, Search } from 'lucide-react';
import { cn } from '../lib/utils';
import { PROFILE_ROLE_CATEGORIES } from '../lib/profileRoles';

export function ProfileRoleSelect({
  value,
  onChange,
  className
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

  const filteredCategories = useMemo(() => {
    const query = search.trim().toLowerCase();
    return PROFILE_ROLE_CATEGORIES
      .map(category => ({
        ...category,
        roles: query
          ? category.roles.filter(role => role.toLowerCase().includes(query))
          : category.roles
      }))
      .filter(category => category.roles.length > 0);
  }, [search]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(current => !current)}
        className="settings-input flex items-center gap-3 text-left"
      >
        <span className={cn('min-w-0 flex-1 truncate', value ? 'text-text-main' : 'text-text-secondary/45')}>
          {value || 'Select role'}
        </span>
        <ChevronDown size={16} className={cn('shrink-0 text-text-secondary/45 transition-transform', open && 'rotate-180 text-accent')} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.14 }}
            className="absolute left-0 right-0 top-full z-[540] mt-2 rounded-2xl border border-card-border bg-card p-3 shadow-2xl"
          >
            <label className="flex h-11 items-center gap-2 rounded-xl border border-card-border bg-surface-muted px-3 focus-within:border-accent">
              <Search size={15} className="shrink-0 text-text-secondary/45" />
              <input
                autoFocus
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Search roles..."
                className="min-w-0 flex-1 bg-transparent text-sm font-bold text-text-main outline-none placeholder:text-text-secondary/35"
              />
            </label>

            <div role="listbox" className="mt-3 max-h-72 space-y-4 overflow-y-auto pr-1">
              {filteredCategories.length > 0 ? filteredCategories.map(category => (
                <div key={category.name} className="space-y-2">
                  <p className="px-1 text-[9px] font-black uppercase tracking-[0.2em] text-text-secondary/45">{category.name}</p>
                  <div className="grid grid-cols-1 gap-1.5">
                    {category.roles.map(role => {
                      const selected = role === value;
                      return (
                        <button
                          key={role}
                          type="button"
                          role="option"
                          aria-selected={selected}
                          onClick={() => {
                            onChange(role);
                            setOpen(false);
                            setSearch('');
                          }}
                          className={cn(
                            'flex h-10 items-center gap-2 rounded-xl px-3 text-left text-xs font-black uppercase tracking-widest transition-colors',
                            selected ? 'bg-accent text-accent-contrast' : 'text-text-secondary hover:bg-surface-muted hover:text-text-main'
                          )}
                        >
                          <span className="min-w-0 flex-1 truncate">{role}</span>
                          {selected && <Check size={14} className="shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )) : (
                <div className="rounded-xl border border-dashed border-card-border p-4 text-center">
                  <p className="text-xs font-bold text-text-secondary/60">No matching onboarding role.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
