import { IntensityLevel } from '../../types';
import { INTENSITY_LABELS, INTENSITY_COLORS } from '../../lib/muscles';

interface IntensityBadgeProps {
  intensity: IntensityLevel;
  size?: 'sm' | 'md';
}

export default function IntensityBadge({ intensity, size = 'md' }: IntensityBadgeProps) {
  const c = INTENSITY_COLORS[intensity];
  const sizeClass = size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1';
  const bars = { LOW: 1, MEDIUM: 2, HIGH: 3, MAX: 4 }[intensity];

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${c.bg} ${c.text} ${sizeClass}`}>
      <span className="flex items-end gap-0.5">
        {[1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className={`w-0.5 rounded-sm ${i <= bars ? c.bar : 'bg-surface-300'}`}
            style={{ height: `${4 + i * 2}px` }}
          />
        ))}
      </span>
      {INTENSITY_LABELS[intensity]}
    </span>
  );
}
