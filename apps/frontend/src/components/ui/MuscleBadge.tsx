import { MuscleGroup } from '../../types';
import { MUSCLE_LABELS, MUSCLE_COLORS } from '../../lib/muscles';

interface MuscleBadgeProps {
  muscle: MuscleGroup;
  size?: 'sm' | 'md';
}

export default function MuscleBadge({ muscle, size = 'md' }: MuscleBadgeProps) {
  const c = MUSCLE_COLORS[muscle];
  const sizeClass = size === 'sm'
    ? 'text-[10px] px-2 py-0.5'
    : 'text-xs px-2.5 py-1';

  return (
    <span className={`inline-flex items-center rounded-full font-semibold ${c.bg} ${c.text} ${sizeClass}`}>
      {MUSCLE_LABELS[muscle]}
    </span>
  );
}
