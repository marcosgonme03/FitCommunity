/**
 * Formatting helpers for FitCommunity UI
 */

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

export function formatMinutesAsHours(minutes: number, decimals = 1): string {
  const hours = minutes / 60;
  return `${hours.toFixed(decimals)}h`;
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toString();
}

export function formatCalories(kcal: number | null | undefined): string {
  if (!kcal && kcal !== 0) return '—';
  if (kcal >= 1000) return `${(kcal / 1000).toFixed(1)}k kcal`;
  return `${kcal} kcal`;
}

export function formatDistance(km: number | null | undefined): string {
  if (km == null) return '—';
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

const RTF = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });

export function timeAgo(dateInput: string | Date): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const diffMs = date.getTime() - Date.now();
  const diffSec = Math.round(diffMs / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffHour = Math.round(diffMin / 60);
  const diffDay = Math.round(diffHour / 24);

  if (Math.abs(diffSec) < 60) return RTF.format(diffSec, 'second');
  if (Math.abs(diffMin) < 60) return RTF.format(diffMin, 'minute');
  if (Math.abs(diffHour) < 24) return RTF.format(diffHour, 'hour');
  if (Math.abs(diffDay) < 7) return RTF.format(diffDay, 'day');
  if (Math.abs(diffDay) < 30) return RTF.format(Math.round(diffDay / 7), 'week');
  if (Math.abs(diffDay) < 365) return RTF.format(Math.round(diffDay / 30), 'month');
  return RTF.format(Math.round(diffDay / 365), 'year');
}

const DATE_FORMATTER = new Intl.DateTimeFormat('es-ES', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const DATE_LONG_FORMATTER = new Intl.DateTimeFormat('es-ES', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const TIME_FORMATTER = new Intl.DateTimeFormat('es-ES', {
  hour: '2-digit',
  minute: '2-digit',
});

export function formatDate(d: string | Date): string {
  return DATE_FORMATTER.format(typeof d === 'string' ? new Date(d) : d);
}

export function formatDateLong(d: string | Date): string {
  return DATE_LONG_FORMATTER.format(typeof d === 'string' ? new Date(d) : d);
}

export function formatTime(d: string | Date): string {
  return TIME_FORMATTER.format(typeof d === 'string' ? new Date(d) : d);
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}
