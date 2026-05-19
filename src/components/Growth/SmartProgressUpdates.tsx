import { Sparkles } from 'lucide-react';

export function SmartProgressUpdates({ updates }: { updates: string[] }) {
  return (
    <section className="rounded-[2rem] border border-card-border bg-card p-5 shadow-[0_18px_60px_rgba(0,0,0,0.07)]">
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-text-secondary">Smart updates</p>
      <h2 className="mt-1 text-lg font-black text-text-main">Signals worth acting on</h2>
      <div className="mt-5 space-y-3">
        {updates.length ? updates.map(update => (
          <div key={update} className="flex gap-3 rounded-[1.4rem] bg-accent/10 p-4 text-sm font-bold leading-5 text-text-main">
            <Sparkles size={16} className="mt-0.5 shrink-0 text-accent" />
            <span>{update}</span>
          </div>
        )) : (
          <div className="rounded-[1.4rem] border border-dashed border-card-border bg-app-container p-5 text-sm font-semibold text-text-secondary">
            No urgent progress updates right now.
          </div>
        )}
      </div>
    </section>
  );
}
