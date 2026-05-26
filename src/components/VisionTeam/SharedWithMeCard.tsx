import { Users, ArrowRight } from 'lucide-react';
import type { Vision } from '../../types';

export function SharedWithMeCard({ visions, onOpen }: { visions: Vision[]; onOpen: (vision: Vision) => void }) {
  if (!visions.length) return null;
  return (
    <section className="rounded-[2rem] border border-card-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-accent/10 text-accent">
          <Users size={19} />
        </div>
        <div>
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-accent/70">Shared with me</h2>
          <p className="text-sm font-bold text-text-secondary">Vision Teams you joined.</p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {visions.slice(0, 4).map(vision => (
          <button
            key={vision.id}
            type="button"
            onClick={() => onOpen(vision)}
            className="flex items-center justify-between gap-3 rounded-2xl border border-card-border bg-bg-base p-4 text-left hover:border-accent/40"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-text-main">{vision.title}</p>
              <p className="mt-1 text-[9px] font-black uppercase tracking-widest text-text-secondary/45">{vision.teamRole} access</p>
            </div>
            <ArrowRight size={16} className="text-accent" />
          </button>
        ))}
      </div>
    </section>
  );
}
