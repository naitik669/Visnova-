import type { VisionProgressItem } from '../../lib/progressAnalytics';
import { safeFormat } from '../../lib/safeData';
import { cn } from '../../lib/utils';
import { VisNovaMotion } from '../ui/VisNovaMotion';

export function VisionProgressBreakdown({ items, compact = false }: { items: VisionProgressItem[]; compact?: boolean }) {
  return (
    <section className={cn('rounded-[2rem] border border-card-border bg-card p-5 shadow-[0_18px_60px_rgba(0,0,0,0.07)]', compact && 'rounded-[1.5rem] p-4 shadow-sm')}>
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-text-secondary">Vision progress</p>
      <h2 className="mt-1 text-lg font-black text-text-main">Active breakdown</h2>
      <div className="mt-5 space-y-3">
        {items.length ? items.map(item => (
          <div key={item.vision.id} className="rounded-[1.4rem] bg-app-container p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="line-clamp-1 text-sm font-black text-text-main">{item.vision.title}</p>
                <p className="mt-1 text-[11px] font-semibold text-text-secondary">
                  {item.logs} logs / {item.completed}/{item.totalTasks} tasks / last {safeFormat(item.lastActivity, 'MMM d')}
                </p>
              </div>
              <span className="text-sm font-black text-accent">{item.vision.progress || 0}%</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-muted">
              <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, item.vision.progress || 0)}%` }} />
            </div>
          </div>
        )) : (
          <div className="rounded-[1.4rem] border border-dashed border-card-border bg-app-container p-5 text-center">
            <VisNovaMotion variant="progressEmpty" className="max-w-xs" />
            <h3 className="mt-2 text-base font-black text-text-main">Your progress story starts here.</h3>
            <p className="mt-1 text-sm font-semibold text-text-secondary">Log your first proof.</p>
          </div>
        )}
      </div>
    </section>
  );
}
