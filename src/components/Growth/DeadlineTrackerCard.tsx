import type { DeadlineProgressItem } from '../../lib/progressAnalytics';
import { safeFormat } from '../../lib/safeData';
import { cn } from '../../lib/utils';

const statusStyles = {
  completed: 'bg-emerald-50 text-emerald-700',
  behind: 'bg-rose-50 text-rose-700',
  'at risk': 'bg-warning/10 text-warning',
  'on track': 'bg-accent/10 text-accent',
} as const;

export function DeadlineTrackerCard({ item, compact = false }: { item: DeadlineProgressItem; compact?: boolean }) {
  return (
    <article className={cn('rounded-[1.6rem] border border-card-border bg-app-container p-4', compact && 'bg-card shadow-sm')}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="line-clamp-1 text-sm font-black text-text-main">{item.vision.title}</h3>
          <p className="mt-1 text-[11px] font-semibold text-text-secondary">
            {safeFormat(item.vision.deadline, 'MMM d, yyyy')} / {item.daysRemaining >= 0 ? `${item.daysRemaining} days left` : `${Math.abs(item.daysRemaining)} days behind`}
          </p>
        </div>
        <span className={cn('rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-widest', statusStyles[item.status])}>{item.status}</span>
      </div>
      <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-surface-muted">
        <div className="h-full rounded-full bg-accent" style={{ width: `${item.progress}%` }} />
      </div>
      <p className="mt-3 text-xs font-semibold text-text-secondary">{item.tasksRemaining} tasks remaining / {item.progress}% complete</p>
    </article>
  );
}
