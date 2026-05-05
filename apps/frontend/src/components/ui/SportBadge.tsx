/**
 * @deprecated Reemplazado por MuscleBadge. Wrapper para retrocompatibilidad.
 */
import { MuscleGroup } from '../../types';
import MuscleBadge from './MuscleBadge';

interface Props {
  sport: MuscleGroup;
  size?: 'sm' | 'md';
  showIcon?: boolean;
}

export default function SportBadge({ sport, size = 'md' }: Props) {
  return <MuscleBadge muscle={sport} size={size} />;
}
