import type { HeatmapPoint } from '../../lib/progressAnalytics';
import { cn } from '../../lib/utils';

const intensityClass = (total: number) => {
  if (total <= 0) return 'bg-[#F3EEFF]';
  if (total <= 1) return 'bg-[#E5D8FF]';
  if (total <= 3) return 'bg-[#C4B5FD]';
  if (total <= 6) return 'bg-[#A78BFA]';
  return 'bg-[#7C3AED]';
};

export function ConsistencyHeatmap({ data }: { data: HeatmapPoint[] }) {
  return (
    <section className="rounded-[2rem] border border-[#E7DDFF] bg-white p-5 shadow-[0_18px_60px_rgba(37,22,61,0.07)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#7A6F91]">Consistency</p>
          <h2 className="mt-1 text-lg font-black text-[#25163D]">Last 30 days</h2>
        </div>
        <span className="rounded-full bg-[#F1ECFF] px-3 py-1 text-[10px] font-black text-[#8B5CF6]">Activity</span>
      </div>
      <div className="mt-5 overflow-x-auto pb-1">
        <div className="grid w-max grid-flow-col grid-rows-5 gap-2">
          {data.map(day => (
            <div
              key={day.key}
              title={`${day.label}: ${day.total} activities`}
              className={cn('h-7 w-7 rounded-[10px] border border-white/70 shadow-sm', intensityClass(day.total))}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
