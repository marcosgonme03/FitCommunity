interface LineChartProps {
  data: Array<{ label: string; value: number }>;
  height?: number;
  color?: string;
  className?: string;
}

export default function LineChart({
  data,
  height = 160,
  color = '#3b82f6',
  className = '',
}: LineChartProps) {
  if (data.length === 0) return null;
  const width = 600;
  const padding = { top: 16, right: 16, bottom: 24, left: 32 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const max = Math.max(...data.map((d) => d.value), 1);
  const min = 0;
  const stepX = chartW / Math.max(data.length - 1, 1);

  const points = data.map((d, i) => ({
    x: padding.left + i * stepX,
    y: padding.top + chartH - ((d.value - min) / (max - min || 1)) * chartH,
    label: d.label,
    value: d.value,
  }));

  const pathD = points
    .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
    .join(' ');

  const areaD =
    `M ${points[0].x} ${padding.top + chartH} ` +
    points.map((p) => `L ${p.x} ${p.y}`).join(' ') +
    ` L ${points[points.length - 1].x} ${padding.top + chartH} Z`;

  // Y axis ticks
  const ticks = 4;
  const tickValues = Array.from({ length: ticks + 1 }, (_, i) => Math.round((max * i) / ticks));

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={`w-full ${className}`}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="lc-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Grid lines */}
      {tickValues.map((tv, i) => {
        const y = padding.top + chartH - (tv / (max || 1)) * chartH;
        return (
          <g key={i}>
            <line
              x1={padding.left}
              x2={width - padding.right}
              y1={y}
              y2={y}
              stroke="#e7e5e4"
              strokeWidth="1"
              strokeDasharray="2 4"
              opacity="0.4"
            />
            <text
              x={padding.left - 6}
              y={y + 3}
              fontSize="9"
              fill="#78716c"
              textAnchor="end"
            >
              {tv}
            </text>
          </g>
        );
      })}

      {/* Area */}
      <path d={areaD} fill="url(#lc-area)" />
      {/* Line */}
      <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {/* Points */}
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="3" fill={color} />
          <circle cx={p.x} cy={p.y} r="6" fill={color} opacity="0.2" />
        </g>
      ))}
      {/* X axis labels */}
      {points.map((p, i) => {
        // Show every n-th label to avoid clutter
        const skip = Math.max(1, Math.floor(points.length / 8));
        if (i % skip !== 0 && i !== points.length - 1) return null;
        return (
          <text
            key={i}
            x={p.x}
            y={height - 6}
            fontSize="9"
            fill="#64748b"
            textAnchor="middle"
          >
            {p.label}
          </text>
        );
      })}
    </svg>
  );
}
