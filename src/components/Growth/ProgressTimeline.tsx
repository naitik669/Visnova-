import type { GrowthTimelineEvent, ProgressLog } from '../../types';
import { safeFormat } from '../../lib/safeData';

export function ProgressTimeline({
  progressLogs,
  growthTimelineEvents,
}: {
  progressLogs: ProgressLog[];
  growthTimelineEvents: GrowthTimelineEvent[];
}) {
  const items = [
    ...progressLogs.slice(0, 5).map(log => ({
      id: `log-${log.id}`,
      title: log.content || 'Progress logged',
      meta: safeFormat(log.createdAt, 'MMM d, h:mm a'),
    })),
    ...growthTimelineEvents.slice(0, 3).map(event => ({
      id: `event-${event.id}`,
      title: event.title,
      meta: safeFormat(event.createdAt, 'MMM d, h:mm a'),
    })),
  ].slice(0, 6);

  return (
    <section className="rounded-[2rem] border border-[#E7DDFF] bg-white p-5 shadow-[0_18px_60px_rgba(37,22,61,0.07)]">
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#7A6F91]">Recent proof</p>
      <h2 className="mt-1 text-lg font-black text-[#25163D]">Timeline</h2>
      <div className="mt-5 space-y-3">
        {items.length ? items.map(item => (
          <div key={item.id} className="flex gap-3 rounded-[1.35rem] bg-[#FAF8FF] p-3">
            <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-[#8B5CF6]" />
            <div className="min-w-0">
              <p className="line-clamp-2 text-sm font-bold text-[#25163D]">{item.title}</p>
              <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-[#7A6F91]/70">{item.meta}</p>
            </div>
          </div>
        )) : (
          <div className="rounded-[1.4rem] border border-dashed border-[#E7DDFF] bg-[#FAF8FF] p-5 text-sm font-semibold text-[#7A6F91]">
            No proof timeline yet.
          </div>
        )}
      </div>
    </section>
  );
}
