import type { ProgressPulseData } from '../../lib/progressAnalytics';
import { WeeklyActivityChart } from './WeeklyActivityChart';

export function ProgressSummaryCard({ pulse }: { pulse: ProgressPulseData }) {
  return (
    <article className="rounded-[2rem] border border-[#E7DDFF] bg-white p-5 shadow-[0_18px_60px_rgba(37,22,61,0.08)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#7A6F91]">Summary</p>
          <h2 className="mt-1 text-xl font-black text-[#25163D]">Track your performance.</h2>
        </div>
        <span className="rounded-full bg-[#F1ECFF] px-3 py-1.5 text-[10px] font-black text-[#8B5CF6]">Weekly</span>
      </div>

      <div className="mt-5 rounded-[1.6rem] bg-[#FAF8FF] p-4">
        <div className="grid grid-cols-2 divide-x divide-[#E7DDFF]">
          <div className="pr-4">
            <p className="text-[10px] font-bold text-[#7A6F91]">Total proof</p>
            <p className="mt-1 text-2xl font-black text-[#25163D] tabular-nums">{pulse.totalLogs}</p>
          </div>
          <div className="pl-4">
            <p className="text-[10px] font-bold text-[#7A6F91]">Tasks done</p>
            <p className="mt-1 text-2xl font-black text-[#25163D] tabular-nums">{pulse.completedTasks}</p>
          </div>
        </div>
        <div className="mt-4">
          <WeeklyActivityChart data={pulse.activityChart} height={150} />
        </div>
      </div>
    </article>
  );
}
