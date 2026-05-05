interface DonutChartProps {
  data: Array<{ label: string; value: number; color: string }>;
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerSubLabel?: string;
}

export default function DonutChart({
  data,
  size = 180,
  thickness = 28,
  centerLabel,
  centerSubLabel,
}: DonutChartProps) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) {
    return (
      <div
        className="rounded-full border-[20px] border-surface-200 flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <span className="text-xs text-surface-500">Sin datos</span>
      </div>
    );
  }

  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="relative inline-flex">
      <svg width={size} height={size} className="-rotate-90">
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="#1e293b"
          strokeWidth={thickness}
        />
        {/* Segments */}
        {data.map((d, i) => {
          const fraction = d.value / total;
          const dasharray = `${fraction * circumference} ${circumference}`;
          const dashoffset = -offset;
          offset += fraction * circumference;
          return (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              stroke={d.color}
              strokeWidth={thickness}
              strokeDasharray={dasharray}
              strokeDashoffset={dashoffset}
              strokeLinecap="butt"
              className="transition-all duration-300"
            />
          );
        })}
      </svg>
      {(centerLabel || centerSubLabel) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {centerLabel && <span className="text-2xl font-bold text-surface-900">{centerLabel}</span>}
          {centerSubLabel && <span className="text-[10px] text-surface-500 uppercase tracking-wider">{centerSubLabel}</span>}
        </div>
      )}
    </div>
  );
}
