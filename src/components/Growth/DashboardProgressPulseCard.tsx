import { Brain } from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';

export function DashboardProgressPulseCard({
  currentStreak,
  totalProofLogs,
  weeklyScore,
  tasksDone,
  onOpen,
}: {
  currentStreak: number;
  totalProofLogs: number;
  weeklyScore: number;
  tasksDone: number;
  onOpen: () => void;
}) {
  const data = [currentStreak, totalProofLogs % 10, tasksDone, weeklyScore / 10, Math.max(1, weeklyScore / 8)].map((value, index) => ({ index, value }));

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group relative w-full overflow-hidden rounded-[2rem] border border-card-border bg-card p-4 text-left shadow-[0_18px_50px_rgba(0,0,0,0.08)] transition-all hover:-translate-y-0.5 hover:shadow-hover active:scale-[0.99]"
    >
      <div className="absolute -right-12 -top-16 h-36 w-36 rounded-full bg-accent/10 blur-2xl transition-transform group-hover:scale-110" />
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-accent">Progress Pulse</p>
          <h3 className="mt-1 text-lg font-black text-text-main">Growth Tracker</h3>
          <p className="mt-1 text-xs font-semibold text-text-secondary">
            {currentStreak}-day streak - {totalProofLogs} logs - {weeklyScore}% weekly
          </p>
        </div>
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-accent">
          <Brain size={18} />
        </span>
      </div>
      <div className="relative z-10 mt-4 grid grid-cols-[1fr_auto] items-end gap-3">
        <div className="h-16">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="dashboardPulseFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="value" stroke="var(--accent)" strokeWidth={2.8} fill="url(#dashboardPulseFill)" dot={false} activeDot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <span className="mb-1 rounded-full bg-accent px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-accent-contrast">
          View full tracker
        </span>
      </div>
    </button>
  );
}
