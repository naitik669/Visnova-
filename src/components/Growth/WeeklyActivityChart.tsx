import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import type { WeeklyActivityPoint } from '../../lib/progressAnalytics';

function ActivityTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((sum: number, item: any) => sum + Number(item.value || 0), 0);
  return (
    <div className="rounded-2xl border border-[#E7DDFF] bg-white px-3 py-2 text-xs shadow-xl shadow-purple-950/10">
      <p className="font-black text-[#25163D]">{label}</p>
      <p className="mt-1 font-semibold text-[#7A6F91]">{total} activity points</p>
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
              <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.95} />
              <stop offset="100%" stopColor="#A78BFA" stopOpacity={0.45} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="day"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: '#7A6F91', fontWeight: 800 }}
            tickFormatter={(value) => String(value).slice(0, 3).toUpperCase()}
          />
          <Tooltip cursor={{ fill: 'rgba(139, 92, 246, 0.06)' }} content={<ActivityTooltip />} />
          <Bar dataKey="logs" stackId="activity" fill="url(#growthBarFill)" radius={[14, 14, 0, 0]} />
          <Bar dataKey="tasks" stackId="activity" fill="#C4B5FD" radius={[14, 14, 0, 0]} />
          <Bar dataKey="journal" stackId="activity" fill="#E5D8FF" radius={[14, 14, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
