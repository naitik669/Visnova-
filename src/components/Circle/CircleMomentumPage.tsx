import { Award, CalendarDays, ChevronRight, Flame, MessageCircle, ShieldCheck, Sparkles, Target, Trophy, Users, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCircleMomentum } from '../../hooks/useCircleMomentum';
import type { CircleMomentumEntry, CircleMomentumRange } from '../../lib/circleMomentum';
import { cn } from '../../lib/utils';

const ranges: { value: CircleMomentumRange; label: string }[] = [
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
  { value: 'all', label: 'All time' }
];

const badgeIcons: Record<string, typeof Award> = {
  'Most proof logged': Trophy,
  'Task crusher': Target,
  'Vision builder': Sparkles,
  'Most consistent': Flame,
  'Comeback energy': Zap,
  'Building momentum': Award
};

function EntryAvatar({ entry }: { entry: CircleMomentumEntry }) {
  return (
    <div className="relative h-12 w-12 overflow-hidden rounded-2xl border border-card-border bg-accent/10">
      {entry.avatarUrl ? (
        <img src={entry.avatarUrl} alt={entry.displayName} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-sm font-black text-accent">
          {entry.displayName.slice(0, 1).toUpperCase()}
        </div>
      )}
      <span className="absolute -bottom-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-card bg-accent px-1 text-[8px] font-black text-accent-contrast">
        {entry.rank}
      </span>
    </div>
  );
}

function LeaderboardRow({ entry, showCounts }: { entry: CircleMomentumEntry; showCounts: boolean }) {
  const navigate = useNavigate();
  const hasActivityCounts = entry.progressLogsCount + entry.completedTasksCount + entry.proofUploadsCount > 0;
  return (
    <div className="rounded-[2rem] border border-card-border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start gap-4">
        <EntryAvatar entry={entry} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="truncate text-base font-black text-text-main">{entry.isCurrentUser ? 'You' : entry.displayName}</h3>
              <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary/50">
                {entry.username ? `@${entry.username}` : entry.topBadge}
              </p>
            </div>
            <div className="rounded-2xl bg-accent px-4 py-2 text-sm font-black text-accent-contrast">{entry.momentumScore}</div>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-muted">
            <div className="h-full rounded-full bg-accent" style={{ width: `${entry.momentumScore}%` }} />
          </div>
          {showCounts && (
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl bg-app-container px-3 py-2">
              <p className="text-sm font-black text-text-main">{entry.progressLogsCount}</p>
              <p className="text-[8px] font-black uppercase tracking-widest text-text-secondary/50">Logs</p>
            </div>
            <div className="rounded-2xl bg-app-container px-3 py-2">
              <p className="text-sm font-black text-text-main">{entry.completedTasksCount}</p>
              <p className="text-[8px] font-black uppercase tracking-widest text-text-secondary/50">Tasks</p>
            </div>
            <div className="rounded-2xl bg-app-container px-3 py-2">
              <p className="text-sm font-black text-text-main">{entry.currentStreak}d</p>
              <p className="text-[8px] font-black uppercase tracking-widest text-text-secondary/50">Streak</p>
            </div>
          </div>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => navigate(entry.isCurrentUser ? '/' : `/profile/${entry.userId}`)}
              className="inline-flex h-10 items-center gap-2 rounded-2xl border border-card-border bg-card px-4 text-[10px] font-black uppercase tracking-widest text-text-main"
            >
              View proof <ChevronRight size={13} />
            </button>
            {!entry.isCurrentUser && (
              <button
                onClick={() => navigate(`/circle?tab=messages&user=${entry.userId}`)}
                className="inline-flex h-10 items-center gap-2 rounded-2xl bg-accent/10 px-4 text-[10px] font-black uppercase tracking-widest text-accent"
              >
                Send encouragement <MessageCircle size={13} />
              </button>
            )}
          </div>
          {!hasActivityCounts && (
            <p className="mt-3 text-xs font-semibold text-text-secondary/60">Their next shared proof will start this week's momentum.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function BadgeCard({ title, entry }: { title: string; entry?: CircleMomentumEntry }) {
  const Icon = badgeIcons[title] || Award;
  return (
    <div className="rounded-[2rem] border border-card-border bg-card p-5 shadow-sm">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/10 text-accent">
        <Icon size={18} />
      </div>
      <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-text-secondary/50">{title}</p>
      <h3 className="mt-1 text-lg font-black text-text-main">{entry ? (entry.isCurrentUser ? 'You' : entry.displayName) : 'Open this week'}</h3>
      <p className="mt-1 text-xs font-semibold text-text-secondary/60">
        {entry ? `${entry.momentumScore} momentum points` : 'Log proof to claim this badge.'}
      </p>
    </div>
  );
}

export default function CircleMomentumPage() {
  const navigate = useNavigate();
  const { entries, currentUserEntry, range, setRange, isLoading, error, isHidden, detailMode } = useCircleMomentum('week');
  const activeEntries = entries.filter(entry => entry.momentumScore > 0);
  const topMover = entries.filter(entry => entry.changeFromLastWeek > 0).sort((a, b) => b.changeFromLastWeek - a.changeFromLastWeek)[0];
  const proofLeader = [...entries].sort((a, b) => b.progressLogsCount - a.progressLogsCount)[0];
  const taskLeader = [...entries].sort((a, b) => b.completedTasksCount - a.completedTasksCount)[0];
  const consistentLeader = [...entries].sort((a, b) => b.currentStreak - a.currentStreak)[0];
  const visionLeader = [...entries].sort((a, b) => b.activeVisionsCount - a.activeVisionsCount)[0];
  const nextEntry = currentUserEntry
    ? entries.find(entry => entry.rank < currentUserEntry.rank && entry.momentumScore > currentUserEntry.momentumScore)
    : null;

  if (isHidden) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-accent/10 text-accent">
          <ShieldCheck size={28} />
        </div>
        <h1 className="mt-5 text-3xl font-black text-text-main">You are hidden from Circle Momentum.</h1>
        <p className="mt-3 max-w-xl text-sm font-semibold leading-relaxed text-text-secondary/70">
          Circle Momentum only uses progress you choose to share with your Circle. Private logs stay yours only.
        </p>
        <button onClick={() => navigate('/settings')} className="mt-6 rounded-2xl bg-accent px-6 py-3 text-[10px] font-black uppercase tracking-widest text-accent-contrast">
          Manage privacy
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <header className="rounded-[2rem] border border-card-border bg-card p-6 shadow-sm md:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-accent">Weekly Momentum</p>
            <h1 className="mt-2 text-3xl font-black text-text-main md:text-5xl">Circle Momentum</h1>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-relaxed text-text-secondary/70">
              Friendly progress across your accountability circle. Scores use visible progress only, never private logs or messages.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {ranges.map(item => (
              <button
                key={item.value}
                onClick={() => setRange(item.value)}
                className={cn(
                  'h-11 rounded-2xl px-4 text-[10px] font-black uppercase tracking-widest transition-all',
                  range === item.value ? 'bg-accent text-accent-contrast shadow-sm' : 'border border-card-border bg-app-container text-text-secondary'
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {error && (
        <div className="rounded-2xl border border-warning/20 bg-warning/10 px-4 py-3 text-xs font-bold text-text-main">
          {error} Showing whatever progress is available.
        </div>
      )}

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="space-y-6">
          <div className="rounded-[2rem] border border-card-border bg-card p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary/50">Your position</p>
                <h2 className="mt-2 text-3xl font-black text-text-main">
                  {currentUserEntry ? `#${currentUserEntry.rank}` : 'Join the board'}
                </h2>
              </div>
              <div className="rounded-2xl bg-accent px-4 py-2 text-lg font-black text-accent-contrast">
                {currentUserEntry?.momentumScore || 0}
              </div>
            </div>
            <p className="mt-4 text-sm font-semibold leading-relaxed text-text-secondary/70">
              {nextEntry
                ? `Your next proof log can move you closer to ${nextEntry.displayName}.`
                : 'Your next proof log keeps the circle moving.'}
            </p>
            <button onClick={() => navigate('/')} className="mt-5 flex h-11 items-center gap-2 rounded-2xl bg-accent/10 px-5 text-[10px] font-black uppercase tracking-widest text-accent">
              Log proof today <Zap size={14} />
            </button>
          </div>

          <div className="rounded-[2rem] border border-card-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <CalendarDays size={18} className="text-accent" />
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary/50">Top movers</p>
                <h3 className="text-xl font-black text-text-main">{topMover ? topMover.displayName : 'Open this week'}</h3>
              </div>
            </div>
            <p className="mt-3 text-sm font-semibold text-text-secondary/70">
              {topMover ? `+${topMover.changeFromLastWeek} points from the last window.` : 'Shared proof will light this up.'}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <BadgeCard title="Most proof logged" entry={proofLeader?.progressLogsCount ? proofLeader : undefined} />
            <BadgeCard title="Task crusher" entry={taskLeader?.completedTasksCount ? taskLeader : undefined} />
            <BadgeCard title="Most consistent" entry={consistentLeader?.currentStreak ? consistentLeader : undefined} />
            <BadgeCard title="Vision builder" entry={visionLeader?.activeVisionsCount ? visionLeader : undefined} />
          </div>
        </div>

        <div className="rounded-[2rem] border border-card-border bg-app-container p-4 shadow-sm md:p-5">
          <div className="mb-4 flex items-center justify-between gap-4 px-2">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary/50">Proof Board</p>
              <h2 className="text-2xl font-black text-text-main">Friendly weekly momentum</h2>
            </div>
            <Users size={22} className="text-accent" />
          </div>
          <div className="space-y-4">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="h-36 animate-pulse rounded-[2rem] bg-card" />
              ))
            ) : entries.length > 0 && activeEntries.length > 0 ? (
              entries.map(entry => <LeaderboardRow key={entry.userId} entry={entry} showCounts={detailMode === 'counts'} />)
            ) : (
              <div className="flex min-h-[340px] flex-col items-center justify-center rounded-[2rem] border border-dashed border-card-border bg-card p-8 text-center">
                <Users size={30} className="text-accent/70" />
                <h3 className="mt-4 text-2xl font-black text-text-main">Build your Circle Momentum.</h3>
                <p className="mt-2 max-w-md text-sm font-semibold leading-relaxed text-text-secondary/70">
                  Add accountability partners or log your first visible proof to start the weekly board.
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-3">
                  <button onClick={() => navigate('/circle?tab=connections')} className="rounded-2xl bg-accent px-5 py-3 text-[10px] font-black uppercase tracking-widest text-accent-contrast">
                    Add connections
                  </button>
                  <button onClick={() => navigate('/')} className="rounded-2xl border border-card-border bg-app-container px-5 py-3 text-[10px] font-black uppercase tracking-widest text-text-main">
                    Log your proof
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
