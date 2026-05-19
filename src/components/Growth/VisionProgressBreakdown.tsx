import type { VisionProgressItem } from '../../lib/progressAnalytics';
import { safeFormat } from '../../lib/safeData';

export function VisionProgressBreakdown({ items }: { items: VisionProgressItem[] }) {
  return (
    <section className="rounded-[2rem] border border-[#E7DDFF] bg-white p-5 shadow-[0_18px_60px_rgba(37,22,61,0.07)]">
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#7A6F91]">Vision progress</p>
      <h2 className="mt-1 text-lg font-black text-[#25163D]">Active breakdown</h2>
      <div className="mt-5 space-y-3">
        {items.length ? items.map(item => (
          <div key={item.vision.id} className="rounded-[1.4rem] bg-[#FAF8FF] p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="line-clamp-1 text-sm font-black text-[#25163D]">{item.vision.title}</p>
                <p className="mt-1 text-[11px] font-semibold text-[#7A6F91]">
                  {item.logs} logs · {item.completed}/{item.totalTasks} tasks · last {safeFormat(item.lastActivity, 'MMM d')}
                </p>
              </div>
              <span className="text-sm font-black text-[#8B5CF6]">{item.vision.progress || 0}%</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#E7DDFF]">
              <div className="h-full rounded-full bg-[#8B5CF6]" style={{ width: `${Math.min(100, item.vision.progress || 0)}%` }} />
            </div>
          </div>
        )) : (
          <div className="rounded-[1.4rem] border border-dashed border-[#E7DDFF] bg-[#FAF8FF] p-5 text-center text-sm font-semibold text-[#7A6F91]">
            Your progress story starts here. Create a Vision and log your first proof.
          </div>
        )}
      </div>
    </section>
  );
}
