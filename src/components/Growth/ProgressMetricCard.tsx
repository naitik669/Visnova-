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
        'relative overflow-hidden rounded-[1.75rem] border p-4 shadow-[0_18px_45px_rgba(37,22,61,0.07)]',
        dark
          ? 'border-[#3B255B] bg-[#3B255B] text-white'
          : 'border-[#E7DDFF] bg-white text-[#25163D]'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn('flex h-8 w-8 items-center justify-center rounded-full', dark ? 'bg-white/12' : 'bg-[#F1ECFF]')}>
              <Icon size={15} className={dark ? 'text-white' : 'text-[#8B5CF6]'} />
            </span>
            <p className={cn('text-[11px] font-black', dark ? 'text-white/80' : 'text-[#7A6F91]')}>{label}</p>
          </div>
          <p className="mt-4 text-3xl font-black leading-none tabular-nums">{value}</p>
          {detail && <p className={cn('mt-2 text-xs font-semibold', dark ? 'text-white/65' : 'text-[#7A6F91]')}>{detail}</p>}
        </div>
        {trend && (
          <span className={cn('rounded-full px-2.5 py-1 text-[10px] font-black', dark ? 'bg-white/10 text-white' : 'bg-[#F1ECFF] text-[#8B5CF6]')}>
            {trend}
          </span>
        )}
      </div>
      <div className="mt-4 h-16">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={dark ? '#A78BFA' : '#8B5CF6'} stopOpacity={0.32} />
                <stop offset="100%" stopColor={dark ? '#A78BFA' : '#8B5CF6'} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="value"
              stroke={dark ? '#C4B5FD' : '#8B5CF6'}
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
