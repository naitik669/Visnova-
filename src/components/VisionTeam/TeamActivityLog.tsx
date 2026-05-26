import { Clock3 } from 'lucide-react';
import type { VisionTeamActivity } from '../../types';

export function TeamActivityLog({ activity }: { activity: VisionTeamActivity[] }) {
  return (
    <div className="space-y-3">
      {activity.map(item => (
        <div key={item.id} className="rounded-2xl border border-card-border bg-bg-base p-4">
          <div className="flex items-start gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent">
              <Clock3 size={15} />
            </div>
            <div>
              <p className="text-sm font-bold text-text-main">{item.summary}</p>
              <p className="mt-1 text-[9px] font-black uppercase tracking-widest text-text-secondary/40">
                {new Date(item.createdAt).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      ))}
      {activity.length === 0 && (
        <div className="rounded-2xl border border-dashed border-card-border p-8 text-center text-sm font-bold text-text-secondary">
          Team activity will appear here.
        </div>
      )}
    </div>
  );
}
