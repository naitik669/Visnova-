import type { ProgressPulseData } from '../../lib/progressAnalytics';

export function DayOneVsNowCard({ pulse, activeVisionCount }: { pulse: ProgressPulseData; activeVisionCount: number }) {
  return (
    <section className="overflow-hidden rounded-[2rem] border border-[#E7DDFF] bg-gradient-to-br from-white via-[#FAF8FF] to-[#F1ECFF] p-5 shadow-[0_18px_60px_rgba(37,22,61,0.07)]">
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#7A6F91]">Look what changed.</p>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-[1.5rem] bg-white/75 p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-[#7A6F91]">Day 1</p>
          <p className="mt-3 text-2xl font-black text-[#25163D]">{pulse.firstVision ? '1' : '0'}</p>
          <p className="text-xs font-semibold text-[#7A6F91]">Vision started</p>
          <p className="mt-3 line-clamp-2 text-xs font-bold text-[#25163D]">{pulse.firstVision?.title || 'First Vision pending'}</p>
        </div>
        <div className="rounded-[1.5rem] bg-[#8B5CF6] p-4 text-white">
          <p className="text-[10px] font-black uppercase tracking-widest text-white/70">Now</p>
          <p className="mt-3 text-2xl font-black">{pulse.totalLogs}</p>
          <p className="text-xs font-semibold text-white/75">proof logs</p>
          <p className="mt-3 text-xs font-bold text-white/90">{pulse.completedTasks} tasks · {activeVisionCount} active Visions · {pulse.currentStreak} day streak</p>
        </div>
      </div>
    </section>
  );
}
