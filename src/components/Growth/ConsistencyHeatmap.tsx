import type { HeatmapPoint } from '../../lib/progressAnalytics';
import { cn } from '../../lib/utils';

const intensityClass = (total: number) => {
  if (total <= 0) return 'bg-surface-muted';
  if (total <= 1) return 'bg-accent/15';
  if (total <= 3) return 'bg-accent/35';
  if (total <= 6) return 'bg-accent/60';
  return 'bg-accent';
};

export function ConsistencyHeatmap({ data, compact = false }: { data: HeatmapPoint[]; compact?: boolean }) {
  return (
    <section className={cn('rounded-[2rem] border border-card-border bg-card p-5 shadow-[0_18px_60px_rgba(0,0,0,0.07)]', compact && 'rounded-[1.5rem] p-4 shadow-sm')}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-text-secondary">Consistency</p>
          <h2 className="mt-1 text-lg font-black text-text-main">Last 30 days</h2>
        </div>
        <span className="rounded-full bg-accent/10 px-3 py-1 text-[10px] font-black text-accent">Activity</span>
      </div>
      <div className="mt-5 overflow-x-auto pb-1">
        <div className="grid w-max grid-flow-col grid-rows-5 gap-2">
          {data.map(day => (
            <div
              key={day.key}
              title={`${day.label}: ${day.total} activities`}
              className={cn(compact ? 'h-6 w-6 rounded-lg' : 'h-7 w-7 rounded-[10px]', 'border border-white/70 shadow-sm', intensityClass(day.total))}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
