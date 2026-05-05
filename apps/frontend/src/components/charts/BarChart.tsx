interface BarChartProps {
  data: Array<{ label: string; value: number; color?: string }>;
  height?: number;
  className?: string;
  formatter?: (n: number) => string;
}

export default function BarChart({
  data,
  height = 160,
  className = '',
  formatter = (n) => String(n),
}: BarChartProps) {
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-end gap-2 h-[var(--h)]" style={{ ['--h' as never]: `${height}px` }}>
        {data.map((d, i) => {
          const heightPct = (d.value / max) * 100;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group min-w-0">
              <div className="relative flex-1 w-full flex items-end">
                <div
                  className="w-full rounded-t-md transition-all duration-300 group-hover:brightness-125 relative"
                  style={{
                    height: `${heightPct}%`,
                    minHeight: d.value > 0 ? '4px' : '2px',
                    backgroundColor: d.color ?? '#3b82f6',
                  }}
                >
                  {/* Tooltip on hover */}
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-surface-900 rounded text-[10px] font-semibold text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    {formatter(d.value)}
                  </div>
                </div>
              </div>
              <span className="text-[10px] text-surface-500 truncate w-full text-center">{d.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
