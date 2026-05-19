import { Sparkles } from 'lucide-react';

export function SmartProgressUpdates({ updates }: { updates: string[] }) {
  return (
    <section className="rounded-[2rem] border border-[#E7DDFF] bg-white p-5 shadow-[0_18px_60px_rgba(37,22,61,0.07)]">
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#7A6F91]">Smart updates</p>
      <h2 className="mt-1 text-lg font-black text-[#25163D]">Signals worth acting on</h2>
      <div className="mt-5 space-y-3">
        {updates.length ? updates.map(update => (
          <div key={update} className="flex gap-3 rounded-[1.4rem] bg-[#F1ECFF] p-4 text-sm font-bold leading-5 text-[#25163D]">
            <Sparkles size={16} className="mt-0.5 shrink-0 text-[#8B5CF6]" />
            <span>{update}</span>
          </div>
        )) : (
          <div className="rounded-[1.4rem] border border-dashed border-[#E7DDFF] bg-[#FAF8FF] p-5 text-sm font-semibold text-[#7A6F91]">
            No urgent progress updates right now.
          </div>
        )}
      </div>
    </section>
  );
}
