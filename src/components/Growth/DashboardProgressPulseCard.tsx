import { Brain } from 'lucide-react';

function sparklinePath(values: number[], width = 220, height = 58) {
  const max = Math.max(...values, 1);
  const step = values.length > 1 ? width / (values.length - 1) : width;
  const points = values.map((value, index) => {
    const x = index * step;
    const y = height - (Math.max(0, value) / max) * (height - 8) - 4;
    return { x, y };
  });

  return points.reduce((path, point, index) => {
    if (index === 0) return `M ${point.x.toFixed(1)} ${point.y.toFixed(1)}`;

    const previous = points[index - 1];
    const beforePrevious = points[index - 2] || previous;
    const next = points[index + 1] || point;
    const controlOneX = previous.x + (point.x - beforePrevious.x) / 6;
    const controlOneY = previous.y + (point.y - beforePrevious.y) / 6;
    const controlTwoX = point.x - (next.x - previous.x) / 6;
    const controlTwoY = point.y - (next.y - previous.y) / 6;

    return `${path} C ${controlOneX.toFixed(1)} ${controlOneY.toFixed(1)} ${controlTwoX.toFixed(1)} ${controlTwoY.toFixed(1)} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
  }, '');
}

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
  const data = [currentStreak, totalProofLogs % 10, tasksDone, weeklyScore / 10, Math.max(1, weeklyScore / 8)];
  const linePath = sparklinePath(data);
  const areaPath = `${linePath} L 220 58 L 0 58 Z`;

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
          <svg viewBox="0 0 220 58" className="h-full w-full overflow-visible" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <linearGradient id="dashboardPulseFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.28} />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <path d={areaPath} fill="url(#dashboardPulseFill)" />
            <path d={linePath} fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          </svg>
        </div>
        <span className="mb-1 rounded-full bg-accent px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-accent-contrast">
          View full tracker
        </span>
      </div>
    </button>
  );
}
