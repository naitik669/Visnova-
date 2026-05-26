import { CheckCircle2, FileText, Flame, ShieldAlert, Target, X, Zap } from 'lucide-react';
import type { GrowthTimelineEvent, ProgressLog, Vision } from '../../types';
import type { ProgressPulseData } from '../../lib/progressAnalytics';
import { ProgressSummaryCard } from './ProgressSummaryCard';
import { ProgressMetricCard } from './ProgressMetricCard';
import { ConsistencyHeatmap } from './ConsistencyHeatmap';
import { VisionProgressBreakdown } from './VisionProgressBreakdown';
import { MoneyGoalProgressCard } from './MoneyGoalProgressCard';
import { DeadlineTrackerCard } from './DeadlineTrackerCard';
import { DayOneVsNowCard } from './DayOneVsNowCard';
import { SmartProgressUpdates } from './SmartProgressUpdates';
import { ProgressTimeline } from './ProgressTimeline';

export function ProgressPulsePage({
  pulse,
  visions,
  progressLogs,
  growthTimelineEvents,
  onClose,
}: {
  pulse: ProgressPulseData;
  visions: Vision[];
  progressLogs: ProgressLog[];
  growthTimelineEvents: GrowthTimelineEvent[];
  onClose?: () => void;
}) {
  const activeVisionCount = visions.filter(vision => vision.status !== 'completed').length;
  const logsTrend = pulse.activityChart.map(day => day.logs);
  const tasksTrend = pulse.activityChart.map(day => day.tasks);
  const journalTrend = pulse.activityChart.map(day => day.journal);
  const risk = pulse.deadlines.find(item => item.status === 'behind' || item.status === 'at risk');

  return (
    <div className="rounded-[1.5rem] bg-app-container p-0 sm:p-3 lg:rounded-[2.25rem] lg:p-5">
      <div className="space-y-4 lg:hidden">
        <header className="rounded-[1.5rem] border border-card-border bg-card p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-accent">Progress Pulse</p>
              <h1 className="mt-1 text-2xl font-black leading-tight text-text-main">Growth Tracker</h1>
              <p className="mt-2 text-sm font-semibold leading-relaxed text-text-secondary">
                Your week, proof, streaks, and Vision movement in one calm view.
              </p>
            </div>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-card-border bg-app-container text-text-secondary"
                aria-label="Close Growth Tracker"
              >
                <X size={17} />
              </button>
            )}
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2">
            <MobilePulseStat label="Weekly" value={`${pulse.weeklyScore}%`} />
            <MobilePulseStat label="Streak" value={`${pulse.currentStreak}d`} />
            <MobilePulseStat label="Proof" value={pulse.totalLogs} />
          </div>
        </header>

        <section className="rounded-[1.5rem] border border-card-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-secondary/60">This week</p>
              <h2 className="mt-1 text-lg font-black text-text-main">Activity rhythm</h2>
            </div>
            <span className="rounded-full bg-accent/10 px-3 py-1 text-[10px] font-black text-accent">
              {pulse.tasksCompletedThisWeek} tasks
            </span>
          </div>
          <div className="mt-4 rounded-[1.25rem] bg-app-container p-3">
            <ProgressSummaryCard pulse={pulse} compact />
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <MobileMetricTile label="Tasks done" value={pulse.completedTasks} detail={`${pulse.tasksCompletedThisWeek} this week`} />
          <MobileMetricTile label="Active Visions" value={activeVisionCount} detail="in motion" />
          <MobileMetricTile label="Journal rhythm" value={journalTrend.reduce((sum, value) => sum + value, 0)} detail="reflections" />
          <MobileMetricTile
            label="Momentum"
            value={risk ? 'At risk' : 'Stable'}
            detail={risk ? risk.vision.title : 'No blockers'}
            urgent={!!risk}
          />
        </section>

        <VisionProgressBreakdown items={pulse.visionBreakdown} compact />
        <DayOneVsNowCard pulse={pulse} activeVisionCount={activeVisionCount} compact />
        <ConsistencyHeatmap data={pulse.heatmap} compact />

        <section className="space-y-3">
          <MobileSectionTitle eyebrow="Goals" title="Deadlines and resources" />
          {pulse.deadlines.slice(0, 2).map(item => (
            <DeadlineTrackerCard key={item.vision.id} item={item} compact />
          ))}
          {pulse.goals.slice(0, 2).map(goal => (
            <MoneyGoalProgressCard key={goal.id} goal={goal} compact />
          ))}
          {!pulse.deadlines.length && !pulse.goals.length && (
            <div className="rounded-[1.4rem] border border-dashed border-card-border bg-card p-5 text-sm font-semibold text-text-secondary">
              Add deadlines or money goals to see pressure points here.
            </div>
          )}
        </section>

        <ProgressTimeline progressLogs={progressLogs} growthTimelineEvents={growthTimelineEvents} compact />
      </div>

      <div className="hidden lg:block">
      <header className="mb-5 flex flex-col gap-4 rounded-[2rem] border border-card-border bg-card p-5 shadow-[0_18px_60px_rgba(0,0,0,0.07)] sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-accent">Progress Pulse</p>
          <h1 className="mt-1 text-2xl font-black text-text-main sm:text-3xl">Growth Tracker</h1>
          <p className="mt-2 max-w-2xl text-sm font-semibold text-text-secondary">Your visible proof of growth across Visions, tasks, resources, deadlines, and reflection.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-accent/10 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-accent">
            {pulse.weeklyScore}% weekly
          </span>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-card-border bg-app-container text-text-secondary transition-colors hover:text-text-main"
              aria-label="Close Growth Tracker"
            >
              <X size={17} />
            </button>
          )}
        </div>
      </header>

      <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
        <div className="space-y-5">
          <ProgressSummaryCard pulse={pulse} />
          <DayOneVsNowCard pulse={pulse} activeVisionCount={activeVisionCount} />
          <ConsistencyHeatmap data={pulse.heatmap} />
        </div>

        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <ProgressMetricCard label="Proof Logs" value={pulse.totalLogs} detail="total recorded" trend="+11.5%" icon={FileText} data={logsTrend} />
            <ProgressMetricCard label="Tasks Done" value={pulse.completedTasks} detail={`${pulse.tasksCompletedThisWeek} this week`} trend="+4.5%" icon={CheckCircle2} data={tasksTrend} />
            <ProgressMetricCard label="Streak" value={`${pulse.currentStreak}d`} detail="current run" icon={Flame} data={[1, 2, 2, 3, pulse.currentStreak]} />
            <ProgressMetricCard
              label="Momentum Risk"
              value={risk ? risk.status : 'Stable'}
              detail={risk ? `${risk.vision.title} needs attention` : 'No urgent blockers'}
              icon={risk ? ShieldAlert : Zap}
              data={journalTrend}
              dark={!!risk}
            />
          </div>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <VisionProgressBreakdown items={pulse.visionBreakdown} />
            <SmartProgressUpdates updates={pulse.updates} />
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <section className="rounded-[2rem] border border-card-border bg-card p-5 shadow-[0_18px_60px_rgba(0,0,0,0.07)]">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-text-secondary">Resources</p>
              <h2 className="mt-1 text-lg font-black text-text-main">Money goals</h2>
              <div className="mt-5 space-y-3">
                {pulse.goals.length ? pulse.goals.map(goal => (
                  <MoneyGoalProgressCard key={goal.id} goal={goal} />
                )) : (
                  <div className="rounded-[1.4rem] border border-dashed border-card-border bg-app-container p-5 text-sm font-semibold text-text-secondary">No Vision-linked money goals yet.</div>
                )}
              </div>
            </section>

            <section className="rounded-[2rem] border border-card-border bg-card p-5 shadow-[0_18px_60px_rgba(0,0,0,0.07)]">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-text-secondary">Deadlines</p>
              <h2 className="mt-1 text-lg font-black text-text-main">Upcoming pressure</h2>
              <div className="mt-5 space-y-3">
                {pulse.deadlines.length ? pulse.deadlines.map(item => (
                  <DeadlineTrackerCard key={item.vision.id} item={item} />
                )) : (
                  <div className="rounded-[1.4rem] border border-dashed border-card-border bg-app-container p-5 text-sm font-semibold text-text-secondary">No deadlines set on active Visions.</div>
                )}
              </div>
            </section>
          </div>

          <ProgressTimeline progressLogs={progressLogs} growthTimelineEvents={growthTimelineEvents} />
        </div>
      </div>
      </div>
    </div>
  );
}

function MobilePulseStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-[1.1rem] bg-app-container p-3 text-center">
      <p className="text-lg font-black leading-none text-text-main tabular-nums">{value}</p>
      <p className="mt-2 text-[9px] font-black uppercase tracking-widest text-text-secondary/55">{label}</p>
    </div>
  );
}

function MobileMetricTile({
  label,
  value,
  detail,
  urgent = false,
}: {
  label: string;
  value: string | number;
  detail: string;
  urgent?: boolean;
}) {
  return (
    <article className={`rounded-[1.35rem] border p-4 shadow-sm ${urgent ? 'border-warning/25 bg-warning/10' : 'border-card-border bg-card'}`}>
      <p className="text-[9px] font-black uppercase tracking-widest text-text-secondary/55">{label}</p>
      <p className="mt-3 truncate text-2xl font-black text-text-main tabular-nums">{value}</p>
      <p className="mt-1 line-clamp-2 text-xs font-semibold text-text-secondary/70">{detail}</p>
    </article>
  );
}

function MobileSectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="px-1">
      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-accent">{eyebrow}</p>
      <h2 className="mt-1 text-lg font-black text-text-main">{title}</h2>
    </div>
  );
}
