import type { DeadlineProgressItem } from '../../lib/progressAnalytics';
import { safeFormat } from '../../lib/safeData';
import { cn } from '../../lib/utils';

const statusStyles = {
  completed: 'bg-emerald-50 text-emerald-700',
  behind: 'bg-rose-50 text-rose-700',
  'at risk': 'bg-[#F1ECFF] text-[#6D3E8F]',
  'on track': 'bg-[#F1ECFF] text-[#8B5CF6]',
} as const;

export function DeadlineTrackerCard({ item }: { item: DeadlineProgressItem }) {
  return (
    <article className="rounded-[1.6rem] border border-[#E7DDFF] bg-[#FAF8FF] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="line-clamp-1 text-sm font-black text-[#25163D]">{item.vision.title}</h3>
          <p className="mt-1 text-[11px] font-semibold text-[#7A6F91]">
            {safeFormat(item.vision.deadline, 'MMM d, yyyy')} · {item.daysRemaining >= 0 ? `${item.daysRemaining} days left` : `${Math.abs(item.daysRemaining)} days behind`}
          </p>
        </div>
        <span className={cn('rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-widest', statusStyles[item.status])}>{item.status}</span>
      </div>
      <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-[#E7DDFF]">
        <div className="h-full rounded-full bg-[#8B5CF6]" style={{ width: `${item.progress}%` }} />
      </div>
      <p className="mt-3 text-xs font-semibold text-[#7A6F91]">{item.tasksRemaining} tasks remaining · {item.progress}% complete</p>
    </article>
  );
}
