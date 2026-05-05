/**
 * @deprecated Este módulo se mantiene por retrocompatibilidad.
 * Usa `lib/muscles` en código nuevo. Los nombres de exports cambian:
 *   - SPORT_LABELS / SPORT_COLORS / SPORT_ICONS → MUSCLE_*
 *   - ALL_SPORTS → ALL_MUSCLES
 */
export {
  MUSCLE_LABELS as SPORT_LABELS,
  MUSCLE_COLORS as SPORT_COLORS,
  MUSCLE_ICONS as SPORT_ICONS,
  ALL_MUSCLES as ALL_SPORTS,
  ALL_INTENSITIES,
  INTENSITY_LABELS,
  INTENSITY_COLORS,
  FITNESS_GOAL_LABELS,
  EXPERIENCE_LABELS,
} from './muscles';
