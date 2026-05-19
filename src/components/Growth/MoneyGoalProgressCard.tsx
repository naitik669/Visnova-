import type { MoneyGoalProgressItem } from '../../lib/progressAnalytics';
import { formatCurrency } from '../../lib/currency';
import { safeFormat } from '../../lib/safeData';

export function MoneyGoalProgressCard({ goal }: { goal: MoneyGoalProgressItem }) {
  return (
    <article className="rounded-[1.6rem] border border-card-border bg-app-container p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="line-clamp-1 text-sm font-black text-text-main">{goal.title}</h3>
          <p className="mt-1 text-[11px] font-semibold text-text-secondary">{goal.linkedVision?.title || 'No Vision linked'}</p>
        </div>
        <span className="rounded-full bg-card px-3 py-1 text-[10px] font-black text-accent shadow-sm">{goal.progress}%</span>
      </div>
      <p className="mt-4 text-lg font-black text-text-main">
        {formatCurrency(goal.currentAmount, goal.currency)} <span className="text-text-secondary">/ {formatCurrency(goal.targetAmount, goal.currency)}</span>
      </p>
      <p className="mt-1 text-xs font-semibold text-text-secondary">You need {formatCurrency(goal.remaining, goal.currency)} more.</p>
      <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-surface-muted">
        <div className="h-full rounded-full bg-accent" style={{ width: `${goal.progress}%` }} />
      </div>
      {goal.deadline && <p className="mt-3 text-[10px] font-black uppercase tracking-widest text-text-secondary">Deadline {safeFormat(goal.deadline, 'MMM d')}</p>}
    </article>
  );
}
