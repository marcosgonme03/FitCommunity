import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
  trend?: { value: number; positive: boolean };
  accent?: 'brand' | 'accent' | 'orange' | 'red' | 'purple';
}

const ACCENT_CLASSES: Record<NonNullable<StatCardProps['accent']>, { iconBg: string; iconColor: string; ring: string }> = {
  brand:   { iconBg: 'bg-brand-50',  iconColor: 'text-brand-600',  ring: 'group-hover:ring-brand-300' },
  accent:  { iconBg: 'bg-accent-50', iconColor: 'text-accent-700', ring: 'group-hover:ring-accent-300' },
  orange:  { iconBg: 'bg-brand-50', iconColor: 'text-brand-600', ring: 'group-hover:ring-brand-300' },
  red:     { iconBg: 'bg-red-50',    iconColor: 'text-red-600',    ring: 'group-hover:ring-red-500/30' },
  purple:  { iconBg: 'bg-purple-50', iconColor: 'text-purple-600', ring: 'group-hover:ring-purple-500/30' },
};

export default function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  trend,
  accent = 'brand',
}: StatCardProps) {
  const a = ACCENT_CLASSES[accent];
  return (
    <div className={`group relative bg-white border border-surface-200 rounded-2xl p-5 shadow-soft
                     transition-all duration-200 hover:border-surface-300 hover:-translate-y-0.5
                     ring-1 ring-transparent ${a.ring}`}>
      <div className="flex items-start justify-between">
        <div className="flex flex-col">
          <span className="text-xs font-medium text-surface-600 uppercase tracking-wider">
            {label}
          </span>
          <span className="text-3xl font-bold text-surface-900 mt-2 tabular-nums">{value}</span>
          {hint && <span className="text-xs text-surface-500 mt-1">{hint}</span>}
          {trend && (
            <span
              className={`inline-flex items-center gap-1 text-xs font-medium mt-2
                          ${trend.positive ? 'text-accent-700' : 'text-red-600'}`}
            >
              {trend.positive ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              {trend.value}%
            </span>
          )}
        </div>
        <div className={`w-10 h-10 rounded-lg ${a.iconBg} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${a.iconColor}`} />
        </div>
      </div>
    </div>
  );
}
