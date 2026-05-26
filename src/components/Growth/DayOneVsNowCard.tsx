import type { ProgressPulseData } from '../../lib/progressAnalytics';
import { cn } from '../../lib/utils';

export function DayOneVsNowCard({ pulse, activeVisionCount, compact = false }: { pulse: ProgressPulseData; activeVisionCount: number; compact?: boolean }) {
  return (
    <section className={cn('overflow-hidden rounded-[2rem] border border-card-border bg-gradient-to-br from-card via-app-container to-accent/10 p-5 shadow-[0_18px_60px_rgba(0,0,0,0.07)]', compact && 'rounded-[1.5rem] p-4 shadow-sm')}>
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-text-secondary">Look what changed.</p>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-[1.5rem] bg-card/75 p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary">Day 1</p>
          <p className="mt-3 text-2xl font-black text-text-main">{pulse.firstVision ? '1' : '0'}</p>
          <p className="text-xs font-semibold text-text-secondary">Vision started</p>
          <p className="mt-3 line-clamp-2 text-xs font-bold text-text-main">{pulse.firstVision?.title || 'First Vision pending'}</p>
        </div>
        <div className="rounded-[1.5rem] bg-accent p-4 text-accent-contrast">
          <p className="text-[10px] font-black uppercase tracking-widest text-accent-contrast/70">Now</p>
          <p className="mt-3 text-2xl font-black">{pulse.totalLogs}</p>
          <p className="text-xs font-semibold text-accent-contrast/75">proof logs</p>
          <p className="mt-3 text-xs font-bold text-accent-contrast/90">{pulse.completedTasks} tasks - {activeVisionCount} active Visions - {pulse.currentStreak} day streak</p>
        </div>
      </div>
    </section>
  );
}
