import type { ProgressPulseData } from '../../lib/progressAnalytics';
import { WeeklyActivityChart } from './WeeklyActivityChart';

export function ProgressSummaryCard({ pulse }: { pulse: ProgressPulseData }) {
  return (
    <article className="rounded-[2rem] border border-card-border bg-card p-5 shadow-[0_18px_60px_rgba(0,0,0,0.08)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-text-secondary">Summary</p>
          <h2 className="mt-1 text-xl font-black text-text-main">Track your performance.</h2>
        </div>
        <span className="rounded-full bg-accent/10 px-3 py-1.5 text-[10px] font-black text-accent">Weekly</span>
      </div>

      <div className="mt-5 rounded-[1.6rem] bg-app-container p-4">
        <div className="grid grid-cols-2 divide-x divide-card-border">
          <div className="pr-4">
            <p className="text-[10px] font-bold text-text-secondary">Total proof</p>
            <p className="mt-1 text-2xl font-black text-text-main tabular-nums">{pulse.totalLogs}</p>
          </div>
          <div className="pl-4">
            <p className="text-[10px] font-bold text-text-secondary">Tasks done</p>
            <p className="mt-1 text-2xl font-black text-text-main tabular-nums">{pulse.completedTasks}</p>
          </div>
        </div>
        <div className="mt-4">
          <WeeklyActivityChart data={pulse.activityChart} height={150} />
        </div>
      </div>
    </article>
  );
}
