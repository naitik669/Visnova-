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
    <div className="rounded-[2.25rem] bg-app-container p-3 sm:p-5">
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
  );
}
