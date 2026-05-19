import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import type { WeeklyActivityPoint } from '../../lib/progressAnalytics';

function ActivityTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((sum: number, item: any) => sum + Number(item.value || 0), 0);
  return (
    <div className="rounded-2xl border border-card-border bg-card-elevated px-3 py-2 text-xs shadow-xl shadow-black/10">
      <p className="font-black text-text-main">{label}</p>
      <p className="mt-1 font-semibold text-text-secondary">{total} activity points</p>
    </div>
  );
}

export function WeeklyActivityChart({ data, height = 170 }: { data: WeeklyActivityPoint[]; height?: number }) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barGap={4} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
          <defs>
            <linearGradient id="growthBarFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.95} />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.35} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="day"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: 'var(--text-secondary)', fontWeight: 800 }}
            tickFormatter={(value) => String(value).slice(0, 3).toUpperCase()}
          />
          <Tooltip cursor={{ fill: 'rgba(139, 92, 246, 0.06)' }} content={<ActivityTooltip />} />
          <Bar dataKey="logs" stackId="activity" fill="url(#growthBarFill)" radius={[14, 14, 0, 0]} />
          <Bar dataKey="tasks" stackId="activity" fill="rgba(var(--accent-rgb), 0.42)" radius={[14, 14, 0, 0]} />
          <Bar dataKey="journal" stackId="activity" fill="rgba(var(--accent-rgb), 0.18)" radius={[14, 14, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
