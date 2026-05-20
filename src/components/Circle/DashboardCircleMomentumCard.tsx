import { ChevronRight, ShieldCheck, Sparkles, Users, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCircleMomentum } from '../../hooks/useCircleMomentum';
import { cn } from '../../lib/utils';

function Avatar({ src, name, rank }: { src?: string; name: string; rank: number }) {
  return (
    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-2xl border border-card-border bg-accent/10">
      {src ? (
        <img src={src} alt={name} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-xs font-black text-accent">
          {name.slice(0, 1).toUpperCase()}
        </div>
      )}
      <span className="absolute -bottom-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-card bg-accent px-1 text-[8px] font-black text-accent-contrast">
        {rank}
      </span>
    </div>
  );
}

export function DashboardCircleMomentumCard() {
  const navigate = useNavigate();
  const { topEntries, currentUserEntry, isLoading, isHidden } = useCircleMomentum('week');
  const nonZero = topEntries.some(entry => entry.momentumScore > 0);
  const topThree = topEntries.slice(0, 3);
  const nextEntry = currentUserEntry
    ? topEntries.find(entry => entry.rank < currentUserEntry.rank && entry.momentumScore > currentUserEntry.momentumScore)
    : null;
  const proofLogsNeeded = nextEntry && currentUserEntry
    ? Math.max(1, Math.ceil((nextEntry.momentumScore - currentUserEntry.momentumScore + 1) / 25))
    : 1;

  if (isHidden) {
    return (
      <button
        onClick={() => navigate('/settings')}
        className="group flex min-h-[250px] flex-col justify-between rounded-[2rem] border border-card-border bg-card p-6 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-md"
      >
        <div>
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent">
            <ShieldCheck size={20} />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-text-secondary/50">Circle Momentum</p>
          <h3 className="mt-2 text-xl font-black text-text-main">You are hidden from the board.</h3>
          <p className="mt-2 text-sm font-semibold leading-relaxed text-text-secondary/70">
            Private logs stay yours only. You can rejoin Circle Momentum from privacy settings anytime.
          </p>
        </div>
        <span className="mt-5 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-accent">
          Manage privacy <ChevronRight size={14} />
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={() => navigate('/circle/momentum')}
      className="group relative flex min-h-[250px] flex-col overflow-hidden rounded-[2rem] border border-card-border bg-card p-6 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-accent">Circle Momentum</p>
          <h3 className="mt-2 text-2xl font-black text-text-main">Weekly proof board</h3>
          <p className="mt-1 text-xs font-bold text-text-secondary/65">Your circle's progress this week.</p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent">
          <Zap size={20} />
        </div>
      </div>

      <div className="mt-5 flex-1 space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-12 animate-pulse rounded-2xl bg-surface-muted" />
          ))
        ) : topThree.length > 0 && nonZero ? (
          topThree.map(entry => (
            <div key={entry.userId} className="flex items-center gap-3 rounded-2xl border border-card-border/70 bg-app-container/60 p-3">
              <Avatar src={entry.avatarUrl} name={entry.displayName} rank={entry.rank} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-sm font-black text-text-main">{entry.isCurrentUser ? 'You' : entry.displayName}</p>
                  <span className="rounded-full bg-accent/10 px-2.5 py-1 text-[10px] font-black text-accent">{entry.momentumScore}</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-muted">
                  <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${entry.momentumScore}%` }} />
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-card-border bg-app-container/50 px-5 py-8 text-center">
            <Users size={24} className="text-accent/60" />
            <h4 className="mt-3 text-sm font-black text-text-main">Build your Circle Momentum.</h4>
            <p className="mt-1 text-xs font-semibold leading-relaxed text-text-secondary/65">
              Add accountability partners to see weekly progress together.
            </p>
          </div>
        )}
      </div>

      <div className="mt-5 flex flex-col gap-3 border-t border-card-border pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className={cn('text-xs font-bold leading-relaxed text-text-secondary/70', !currentUserEntry && 'hidden')}>
          {nextEntry
            ? `${proofLogsNeeded} proof ${proofLogsNeeded === 1 ? 'log' : 'logs'} can move you closer this week.`
            : 'Your next proof log keeps the momentum moving.'}
        </p>
        <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-accent px-4 py-2 text-[10px] font-black uppercase tracking-widest text-accent-contrast">
          View Circle Board <ChevronRight size={13} />
        </span>
      </div>
      <div className="pointer-events-none absolute inset-x-8 top-4 h-20 rounded-full bg-accent/10 blur-3xl opacity-0 transition-opacity group-hover:opacity-70" />
    </button>
  );
}

export default DashboardCircleMomentumCard;
