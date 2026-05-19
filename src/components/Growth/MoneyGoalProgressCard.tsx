import type { MoneyGoalProgressItem } from '../../lib/progressAnalytics';
import { formatCurrency } from '../../lib/currency';
import { safeFormat } from '../../lib/safeData';

export function MoneyGoalProgressCard({ goal }: { goal: MoneyGoalProgressItem }) {
  return (
    <article className="rounded-[1.6rem] border border-[#E7DDFF] bg-[#FAF8FF] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="line-clamp-1 text-sm font-black text-[#25163D]">{goal.title}</h3>
          <p className="mt-1 text-[11px] font-semibold text-[#7A6F91]">{goal.linkedVision?.title || 'No Vision linked'}</p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black text-[#8B5CF6] shadow-sm">{goal.progress}%</span>
      </div>
      <p className="mt-4 text-lg font-black text-[#25163D]">
        {formatCurrency(goal.currentAmount, goal.currency)} <span className="text-[#7A6F91]">/ {formatCurrency(goal.targetAmount, goal.currency)}</span>
      </p>
      <p className="mt-1 text-xs font-semibold text-[#7A6F91]">You need {formatCurrency(goal.remaining, goal.currency)} more.</p>
      <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-[#E7DDFF]">
        <div className="h-full rounded-full bg-[#8B5CF6]" style={{ width: `${goal.progress}%` }} />
      </div>
      {goal.deadline && <p className="mt-3 text-[10px] font-black uppercase tracking-widest text-[#7A6F91]">Deadline {safeFormat(goal.deadline, 'MMM d')}</p>}
    </article>
  );
}
