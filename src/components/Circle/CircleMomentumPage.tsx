import { Award, CalendarDays, ChevronRight, Flame, MessageCircle, ShieldCheck, Sparkles, Target, Trophy, Users, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCircleMomentum } from '../../hooks/useCircleMomentum';
import { useStore } from '../../store/useStore';
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

function StatTile({ label, value, icon: Icon, wide = false }: { label: string; value: string | number; icon: typeof Award; wide?: boolean }) {
  return (
    <div className={cn(
      'rounded-[1.3rem] border border-card-border bg-card p-3 shadow-sm sm:rounded-[1.4rem] sm:p-4',
      wide && 'sm:col-span-2 lg:col-span-1'
    )}>
      <div className="flex items-start justify-between gap-3 sm:gap-4">
        <div>
          <p className="text-2xl font-black text-text-main sm:text-3xl">{value}</p>
          <p className="mt-2 text-[9px] font-black uppercase tracking-widest text-text-secondary/50 sm:mt-3 sm:text-[10px]">{label}</p>
        </div>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-accent/10 text-accent sm:h-10 sm:w-10">
          <Icon size={17} />
        </div>
      </div>
    </div>
  );
}

function FeaturedMomentumCard({ entry, featured = false }: { entry?: CircleMomentumEntry; featured?: boolean }) {
  if (!entry) {
    return (
      <div className="min-h-[180px] rounded-[1.6rem] border border-dashed border-card-border bg-card/80 p-5">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent">
          <Trophy size={18} />
        </div>
        <p className="mt-8 text-sm font-black text-text-main">Open spot</p>
        <p className="mt-1 text-xs font-semibold text-text-secondary/60">Shared proof can claim this position.</p>
      </div>
    );
  }

  return (
    <div className={cn(
      'relative min-h-[180px] overflow-hidden rounded-[1.6rem] border bg-card p-5 shadow-sm',
      featured ? 'border-accent/60 shadow-[0_18px_50px_rgba(var(--accent-rgb),0.16)]' : 'border-card-border'
    )}>
      <div className="absolute right-4 top-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-lg font-black text-accent">
        {entry.rank}
      </div>
      <div className="flex items-center gap-3">
        <EntryAvatar entry={entry} />
        <div className="min-w-0">
          <h3 className="truncate text-base font-black text-text-main">{entry.isCurrentUser ? 'You' : entry.displayName}</h3>
          <p className="truncate text-[10px] font-black uppercase tracking-widest text-text-secondary/50">
            {entry.username ? `@${entry.username}` : entry.topBadge}
          </p>
        </div>
      </div>
      <div className="mt-8 grid grid-cols-3 gap-3">
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest text-text-secondary/45">Logs</p>
          <p className="mt-1 text-lg font-black text-text-main">{entry.progressLogsCount}</p>
        </div>
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest text-text-secondary/45">Tasks</p>
          <p className="mt-1 text-lg font-black text-text-main">{entry.completedTasksCount}</p>
        </div>
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest text-text-secondary/45">Score</p>
          <p className="mt-1 text-lg font-black text-text-main">{entry.momentumScore}</p>
        </div>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-muted">
        <div className="h-full rounded-full bg-accent" style={{ width: `${entry.momentumScore}%` }} />
      </div>
      <div className="pointer-events-none absolute -bottom-16 -right-12 h-32 w-32 rounded-full bg-accent/10 blur-2xl" />
    </div>
  );
}

function LeaderboardRow({ entry, showCounts }: { entry: CircleMomentumEntry; showCounts: boolean }) {
  const navigate = useNavigate();
  const sendNudge = useStore(state => state.sendNudge);
  const hasActivityCounts = entry.progressLogsCount + entry.completedTasksCount + entry.proofUploadsCount > 0;
  return (
    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-card-border/70 px-2 py-4 last:border-0 md:grid-cols-[72px_1.3fr_0.7fr_0.7fr_0.7fr_auto]">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-app-container text-xs font-black text-text-main">{entry.rank}</span>
      </div>
      <div className="flex min-w-0 items-center gap-3">
        <EntryAvatar entry={entry} />
        <div className="min-w-0">
          <h3 className="truncate text-sm font-black text-text-main">{entry.isCurrentUser ? 'You' : entry.displayName}</h3>
          <p className="truncate text-[10px] font-black uppercase tracking-widest text-text-secondary/50">
            {entry.username ? `@${entry.username}` : entry.topBadge}
          </p>
          {!hasActivityCounts && (
            <p className="mt-1 text-[11px] font-semibold text-text-secondary/60">Next shared proof starts momentum.</p>
          )}
        </div>
      </div>
      {showCounts && (
        <>
          <p className="hidden text-sm font-black text-text-main md:block">{entry.progressLogsCount}</p>
          <p className="hidden text-sm font-black text-text-main md:block">{entry.completedTasksCount}</p>
          <p className="hidden text-sm font-black text-text-main md:block">{entry.currentStreak}d</p>
        </>
      )}
      <div className="justify-self-end rounded-2xl bg-accent/10 px-3 py-1.5 text-sm font-black text-accent">{entry.momentumScore}</div>
      <div className="col-span-3 flex gap-2 md:col-span-1 md:justify-end">
        <button
          onClick={() => navigate(entry.isCurrentUser ? '/' : `/profile/${entry.userId}`)}
          className="inline-flex h-9 items-center gap-1 rounded-2xl border border-card-border bg-card px-3 text-[9px] font-black uppercase tracking-widest text-text-main"
        >
          Proof <ChevronRight size={12} />
        </button>
        {!entry.isCurrentUser && (
          <button
            onClick={() => sendNudge(entry.userId, hasActivityCounts ? 'celebrate_progress' : 'encouragement')}
            className="inline-flex h-9 items-center justify-center rounded-2xl bg-accent/10 px-3 text-accent"
            title="Send encouragement"
          >
            <MessageCircle size={13} />
          </button>
        )}
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
  const sprint = useStore(state => state.weeklyProofSprint);
  const createWeeklyProofSprint = useStore(state => state.createWeeklyProofSprint);
  const activeEntries = entries.filter(entry => entry.momentumScore > 0);
  const topMover = entries.filter(entry => entry.changeFromLastWeek > 0).sort((a, b) => b.changeFromLastWeek - a.changeFromLastWeek)[0];
  const proofLeader = [...entries].sort((a, b) => b.progressLogsCount - a.progressLogsCount)[0];
  const taskLeader = [...entries].sort((a, b) => b.completedTasksCount - a.completedTasksCount)[0];
  const consistentLeader = [...entries].sort((a, b) => b.currentStreak - a.currentStreak)[0];
  const visionLeader = [...entries].sort((a, b) => b.activeVisionsCount - a.activeVisionsCount)[0];
  const nextEntry = currentUserEntry
    ? entries.find(entry => entry.rank < currentUserEntry.rank && entry.momentumScore > currentUserEntry.momentumScore)
    : null;
  const sprintTotal = sprint ? Math.max(1, sprint.targetLogs + sprint.targetTasks) : 3;
  const sprintDone = sprint ? sprint.currentLogs + sprint.currentTasks : 0;
  const sprintPercent = Math.min(100, Math.round((sprintDone / sprintTotal) * 100));

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
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 pb-24 sm:gap-5 sm:pb-20">
      <header className="rounded-[1.5rem] border border-card-border bg-card p-4 shadow-sm md:flex md:flex-row md:items-end md:justify-between md:rounded-none md:border-0 md:bg-transparent md:p-0 md:shadow-none">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-accent">Weekly Momentum</p>
          <h1 className="mt-1 text-2xl font-black text-text-main sm:text-3xl">Circle Momentum</h1>
          <p className="mt-2 max-w-2xl text-sm font-semibold leading-relaxed text-text-secondary/70 md:mt-1">
            Friendly progress across your accountability circle.
          </p>
        </div>
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1 md:mt-0 md:flex-wrap md:overflow-visible md:pb-0">
          {ranges.map(item => (
            <button
              key={item.value}
              onClick={() => setRange(item.value)}
              className={cn(
                'h-10 shrink-0 rounded-2xl px-4 text-[10px] font-black uppercase tracking-widest transition-all',
                range === item.value ? 'bg-accent text-accent-contrast shadow-sm' : 'border border-card-border bg-card text-text-secondary'
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>

      <section className="rounded-[1.5rem] border border-card-border bg-card p-4 shadow-sm sm:rounded-[1.6rem] sm:p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-accent">Weekly Proof Sprint</p>
            <h2 className="mt-1 text-2xl font-black text-text-main">
              {sprint ? `${sprint.currentLogs}/${sprint.targetLogs} proof logs completed` : 'Commit to one small weekly target'}
            </h2>
            <p className="mt-1 text-sm font-semibold text-text-secondary/70">
              {sprint
                ? sprint.status === 'completed'
                  ? 'Weekly Sprint completed.'
                  : sprint.status === 'missed'
                    ? 'Momentum paused. Start again this week.'
                    : 'Log Proof keeps the loop moving.'
                : 'Your Circle helps you stay consistent. Start with 3 proof logs this week.'}
            </p>
          </div>
          <button
            onClick={() => sprint ? navigate('/') : createWeeklyProofSprint()}
            className="h-11 w-full rounded-2xl bg-accent px-5 text-[10px] font-black uppercase tracking-widest text-accent-contrast md:w-auto"
          >
            {sprint ? 'Log Proof' : 'Start Sprint'}
          </button>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-muted">
          <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${sprintPercent}%` }} />
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        <StatTile label="Circle members" value={entries.length} icon={Users} />
        <StatTile label="Active this window" value={activeEntries.length} icon={Zap} />
        <StatTile label="Your score" value={currentUserEntry?.momentumScore || 0} icon={Target} />
        <StatTile
          label="Proof energy"
          value={activeEntries.reduce((sum, entry) => sum + entry.progressLogsCount, 0)}
          icon={Flame}
        />
      </section>

      <section className="hidden grid-cols-1 gap-4 sm:grid lg:grid-cols-3">
        <FeaturedMomentumCard entry={entries[0]} featured />
        <FeaturedMomentumCard entry={entries[1]} />
        <FeaturedMomentumCard entry={entries[2]} />
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_300px] lg:gap-5">
        <div className="rounded-[1.5rem] border border-card-border bg-card p-3 shadow-sm sm:rounded-[1.6rem] sm:p-4 md:p-5">
          <div className="mb-2 flex items-center justify-between gap-4 px-2">
            <div>
              <h2 className="text-xl font-black text-text-main sm:text-2xl">Weekly Momentum</h2>
              <p className="mt-1 text-xs font-semibold text-text-secondary/60">
                Your private work counts for you. Circle members show shared proof only.
              </p>
            </div>
            <Trophy size={20} className="text-accent" />
          </div>
          {detailMode === 'counts' && (
            <div className="hidden grid-cols-[72px_1.3fr_0.7fr_0.7fr_0.7fr_auto] border-b border-card-border px-2 py-3 text-[9px] font-black uppercase tracking-widest text-text-secondary/45 md:grid">
              <span>Rank</span>
              <span>User name</span>
              <span>Logs</span>
              <span>Tasks</span>
              <span>Streak</span>
              <span className="text-right">Score</span>
            </div>
          )}
          <div>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="my-3 h-16 animate-pulse rounded-2xl bg-app-container" />
              ))
            ) : entries.length > 0 ? (
              entries.map(entry => <LeaderboardRow key={entry.userId} entry={entry} showCounts={detailMode === 'counts'} />)
            ) : (
              <div className="flex min-h-[260px] flex-col items-center justify-center rounded-[1.4rem] border border-dashed border-card-border bg-app-container p-8 text-center">
                <Users size={30} className="text-accent/70" />
                <h3 className="mt-4 text-2xl font-black text-text-main">Build your Circle Momentum.</h3>
                <p className="mt-2 max-w-md text-sm font-semibold leading-relaxed text-text-secondary/70">
                  Add accountability partners or log your first visible proof to start the weekly board.
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-3">
                  <button onClick={() => navigate('/circle?tab=connections')} className="rounded-2xl bg-accent px-5 py-3 text-[10px] font-black uppercase tracking-widest text-accent-contrast">
                    Add connections
                  </button>
                  <button onClick={() => navigate('/')} className="rounded-2xl border border-card-border bg-card px-5 py-3 text-[10px] font-black uppercase tracking-widest text-text-main">
                    Log your proof
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-[1.5rem] border border-card-border bg-card p-4 shadow-sm sm:rounded-[1.6rem] sm:p-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary/50">Your position</p>
            <div className="mt-3 flex items-end justify-between gap-4">
              <h2 className="text-3xl font-black text-text-main">
                {currentUserEntry ? `#${currentUserEntry.rank}` : 'Join'}
              </h2>
              <span className="rounded-2xl bg-accent px-4 py-2 text-lg font-black text-accent-contrast">
                {currentUserEntry?.momentumScore || 0}
              </span>
            </div>
            <p className="mt-4 text-sm font-semibold leading-relaxed text-text-secondary/70">
              {nextEntry
                ? `Your next proof log can move you closer to ${nextEntry.displayName}.`
                : 'Your next proof log keeps the circle moving.'}
            </p>
            <button onClick={() => navigate('/')} className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-accent/10 px-5 text-[10px] font-black uppercase tracking-widest text-accent">
              Log proof today <Zap size={14} />
            </button>
          </div>

          <div className="rounded-[1.6rem] border border-card-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <CalendarDays size={18} className="text-accent" />
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary/50">Top mover</p>
                <h3 className="text-lg font-black text-text-main">{topMover ? topMover.displayName : 'Open this week'}</h3>
              </div>
            </div>
            <p className="mt-3 text-sm font-semibold text-text-secondary/70">
              {topMover ? `+${topMover.changeFromLastWeek} points from the last window.` : 'Shared proof will light this up.'}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <BadgeCard title="Most proof logged" entry={proofLeader?.progressLogsCount ? proofLeader : undefined} />
            <BadgeCard title="Task crusher" entry={taskLeader?.completedTasksCount ? taskLeader : undefined} />
          </div>
        </aside>
      </section>

      {error && (
        <div className="rounded-2xl border border-warning/20 bg-warning/10 px-4 py-3 text-xs font-bold text-text-main">
          {error} Showing whatever progress is available.
        </div>
      )}
    </div>
  );
}
