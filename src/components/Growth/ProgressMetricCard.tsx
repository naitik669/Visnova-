import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

export function ProgressMetricCard({
  label,
  value,
  detail,
  trend,
  icon: Icon,
  data,
  dark = false,
}: {
  label: string;
  value: string | number;
  detail?: string;
  trend?: string;
  icon: LucideIcon;
  data: number[];
  dark?: boolean;
}) {
  const chartData = data.length ? data.map((value, index) => ({ index, value })) : [{ index: 0, value: 0 }, { index: 1, value: 0 }];
  const gradientId = `metric-${label.replace(/\s+/g, '-').toLowerCase()}`;

  return (
    <article
      className={cn(
        'relative overflow-hidden rounded-[1.75rem] border p-4 shadow-[0_18px_45px_rgba(0,0,0,0.07)]',
        dark
          ? 'border-accent/25 bg-accent text-accent-contrast'
          : 'border-card-border bg-card text-text-main'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn('flex h-8 w-8 items-center justify-center rounded-full', dark ? 'bg-white/12' : 'bg-accent/10')}>
              <Icon size={15} className={dark ? 'text-accent-contrast' : 'text-accent'} />
            </span>
            <p className={cn('text-[11px] font-black', dark ? 'text-accent-contrast/80' : 'text-text-secondary')}>{label}</p>
          </div>
          <p className="mt-4 text-3xl font-black leading-none tabular-nums">{value}</p>
          {detail && <p className={cn('mt-2 text-xs font-semibold', dark ? 'text-accent-contrast/65' : 'text-text-secondary')}>{detail}</p>}
        </div>
        {trend && (
          <span className={cn('rounded-full px-2.5 py-1 text-[10px] font-black', dark ? 'bg-white/10 text-accent-contrast' : 'bg-accent/10 text-accent')}>
            {trend}
          </span>
        )}
      </div>
      <div className="mt-4 h-16">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={dark ? 'var(--accent-contrast)' : 'var(--accent)'} stopOpacity={0.32} />
                <stop offset="100%" stopColor={dark ? 'var(--accent-contrast)' : 'var(--accent)'} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="value"
              stroke={dark ? 'var(--accent-contrast)' : 'var(--accent)'}
              strokeWidth={2.8}
              fill={`url(#${gradientId})`}
              dot={false}
              activeDot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </article>
  );
}
