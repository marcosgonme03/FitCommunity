/**
 * Heatmap anual de actividad estilo GitHub contributions.
 * Renderiza una cuadrícula 53×7 con un cuadrito por día del año, coloreado
 * según la intensidad/volumen de entrenamientos de ese día.
 *
 * Diseño:
 * - Fondo gris muy claro = sin actividad
 * - Naranja gradient (4 niveles) según intensidad del día
 * - Hover: tooltip con detalles
 * - Click en un día: callback opcional para ir al calendario detallado
 */

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Flame, Clock, Trophy } from 'lucide-react';
import { HeatmapDay, HeatmapResponse } from '../../services/workouts.service';

const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const DAY_LABELS = ['Lun', '', 'Mié', '', 'Vie', '', ''];

const INTENSITY_LEVELS: Record<string, number> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  MAX: 4,
};

const LEVEL_COLORS: Record<number, string> = {
  0: 'bg-surface-100 hover:bg-surface-200',
  1: 'bg-brand-200 hover:bg-brand-300',
  2: 'bg-brand-400 hover:bg-brand-500',
  3: 'bg-brand-500 hover:bg-brand-600',
  4: 'bg-brand-700 hover:bg-brand-800',
};

interface CellInfo {
  date: Date;
  iso: string;
  inYear: boolean;
  data: HeatmapDay | undefined;
  level: number;
}

function buildGrid(year: number, byDate: Map<string, HeatmapDay>): CellInfo[][] {
  // Empezamos en el lunes anterior al 1 de enero (o el mismo si es lunes).
  // Esto da una rejilla limpia donde cada columna es una semana completa.
  const firstDayOfYear = new Date(Date.UTC(year, 0, 1));
  const startDow = (firstDayOfYear.getUTCDay() + 6) % 7; // 0 = lunes
  const start = new Date(firstDayOfYear);
  start.setUTCDate(start.getUTCDate() - startDow);

  const lastDayOfYear = new Date(Date.UTC(year, 11, 31));
  const endDow = (lastDayOfYear.getUTCDay() + 6) % 7;
  const end = new Date(lastDayOfYear);
  end.setUTCDate(end.getUTCDate() + (6 - endDow));

  const weeks: CellInfo[][] = [];
  const cursor = new Date(start);

  while (cursor <= end) {
    const week: CellInfo[] = [];
    for (let d = 0; d < 7; d++) {
      const iso = cursor.toISOString().slice(0, 10);
      const data = byDate.get(iso);
      const inYear = cursor.getUTCFullYear() === year;
      let level = 0;
      if (data && inYear) {
        const intensityLevel = INTENSITY_LEVELS[data.maxIntensity] ?? 1;
        level = Math.min(4, Math.max(intensityLevel, data.count >= 2 ? intensityLevel + 1 : intensityLevel));
      }
      week.push({ date: new Date(cursor), iso, inYear, data, level });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    weeks.push(week);
  }

  return weeks;
}

interface Props {
  /** Datos cargados del backend (response de /workouts/heatmap/:year) */
  data: HeatmapResponse | null;
  /** True mientras se está cargando (para disabled de los botones de navegación) */
  loading?: boolean;
  /** Callback cuando el usuario cambia de año (con flechas) */
  onYearChange: (year: number) => void;
  /** Año actualmente visualizado (controlado externamente) */
  year: number;
  /** Callback opcional al hacer click en un día con datos */
  onDayClick?: (day: HeatmapDay) => void;
}

export default function YearlyHeatmap({ data, loading, onYearChange, year, onDayClick }: Props) {
  const [hovered, setHovered] = useState<{ cell: CellInfo; x: number; y: number } | null>(null);
  const currentYear = new Date().getFullYear();

  const byDate = useMemo(() => {
    const map = new Map<string, HeatmapDay>();
    data?.days.forEach((d) => map.set(d.date, d));
    return map;
  }, [data]);

  const grid = useMemo(() => buildGrid(year, byDate), [year, byDate]);

  // Etiquetas de meses: para cada columna calculamos el mes del 1er día visible que pertenezca al año
  // y solo mostramos la etiqueta cuando cambia.
  const monthLabels = useMemo(() => {
    const labels: Array<{ col: number; label: string }> = [];
    let lastMonth = -1;
    grid.forEach((week, col) => {
      const firstInYear = week.find((c) => c.inYear);
      if (!firstInYear) return;
      const month = firstInYear.date.getUTCMonth();
      if (month !== lastMonth) {
        labels.push({ col, label: MONTH_LABELS[month] });
        lastMonth = month;
      }
    });
    return labels;
  }, [grid]);

  return (
    <section className="bg-white border border-surface-200 rounded-2xl p-5 shadow-soft relative">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div>
          <h3 className="font-bold text-surface-900">Tu año en entrenamientos</h3>
          <p className="text-xs text-surface-500 mt-0.5">
            {data
              ? `${data.totals.activeDays} días activos · ${data.totals.workouts} sesiones · ${data.totals.longestStreak} días seguidos máximo`
              : 'Cargando...'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onYearChange(year - 1)}
            disabled={loading || year <= 2000}
            className="p-1.5 rounded-lg bg-white border border-surface-200 text-surface-700 hover:bg-surface-50 disabled:opacity-40 transition-colors"
            aria-label="Año anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-bold text-surface-900 min-w-[3rem] text-center tabular-nums">
            {year}
          </span>
          <button
            type="button"
            onClick={() => onYearChange(year + 1)}
            disabled={loading || year >= currentYear}
            className="p-1.5 rounded-lg bg-white border border-surface-200 text-surface-700 hover:bg-surface-50 disabled:opacity-40 transition-colors"
            aria-label="Año siguiente"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Métricas anuales */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          <Metric icon={Flame} label="Sesiones" value={String(data.totals.workouts)} />
          <Metric icon={Clock} label="Minutos" value={data.totals.minutes.toLocaleString()} />
          <Metric icon={Trophy} label="Racha máxima" value={`${data.totals.longestStreak}d`} />
          <Metric icon={Flame} label="Kcal" value={data.totals.calories.toLocaleString()} />
        </div>
      )}

      {/* Heatmap */}
      <div className="overflow-x-auto -mx-1 px-1">
        <div className="inline-block min-w-full">
          {/* Etiquetas de meses */}
          <div className="flex gap-[3px] pl-7 mb-1">
            {grid.map((_, col) => {
              const lab = monthLabels.find((m) => m.col === col);
              return (
                <div key={col} className="w-[12px] text-[9px] text-surface-500 font-semibold">
                  {lab ? lab.label : ''}
                </div>
              );
            })}
          </div>

          {/* Grid: filas = días de la semana, columnas = semanas del año */}
          <div className="flex gap-[3px]">
            {/* Etiquetas de día (columna izquierda) */}
            <div className="flex flex-col gap-[3px] pr-1 justify-between text-[9px] text-surface-500 font-semibold pt-[2px]">
              {DAY_LABELS.map((d, i) => (
                <div key={i} className="h-[12px] leading-[12px]">
                  {d}
                </div>
              ))}
            </div>

            {/* Semanas */}
            {grid.map((week, col) => (
              <div key={col} className="flex flex-col gap-[3px]">
                {week.map((cell, row) => (
                  <button
                    key={row}
                    type="button"
                    disabled={!cell.data || !cell.inYear}
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setHovered({
                        cell,
                        x: rect.left + rect.width / 2,
                        y: rect.top,
                      });
                    }}
                    onMouseLeave={() => setHovered(null)}
                    onClick={() => cell.data && onDayClick?.(cell.data)}
                    className={`w-[12px] h-[12px] rounded-[2px] transition-colors
                                ${!cell.inYear ? 'bg-transparent cursor-default' : LEVEL_COLORS[cell.level]}
                                ${cell.data ? 'cursor-pointer' : ''}`}
                    aria-label={cell.data ? `${cell.iso}: ${cell.data.count} entrenamientos` : cell.iso}
                  />
                ))}
              </div>
            ))}
          </div>

          {/* Leyenda */}
          <div className="flex items-center justify-end gap-1.5 mt-3 text-[10px] text-surface-500 font-semibold">
            <span>Menos</span>
            {[0, 1, 2, 3, 4].map((lvl) => (
              <span
                key={lvl}
                className={`w-[12px] h-[12px] rounded-[2px] ${LEVEL_COLORS[lvl].split(' ')[0]}`}
              />
            ))}
            <span>Más</span>
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {hovered && hovered.cell.inYear && (
        <div
          className="fixed z-50 pointer-events-none px-2.5 py-1.5 rounded-lg bg-surface-900 text-white text-[11px] shadow-2xl whitespace-nowrap"
          style={{
            left: hovered.x,
            top: hovered.y - 8,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <p className="font-semibold">{formatDateEs(hovered.cell.date)}</p>
          {hovered.cell.data ? (
            <p className="text-white/80">
              {hovered.cell.data.count} {hovered.cell.data.count === 1 ? 'entreno' : 'entrenos'} ·{' '}
              {hovered.cell.data.totalMinutes} min
              {hovered.cell.data.totalCalories ? ` · ${hovered.cell.data.totalCalories} kcal` : ''}
            </p>
          ) : (
            <p className="text-white/60">Sin entrenamientos</p>
          )}
        </div>
      )}
    </section>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-surface-50 border border-surface-200 rounded-lg p-2.5">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-surface-500 font-bold mb-0.5">
        <Icon className="w-3 h-3" />
        {label}
      </div>
      <p className="text-base font-extrabold text-surface-900 tabular-nums">{value}</p>
    </div>
  );
}

function formatDateEs(d: Date): string {
  const dayLabels = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const monthLabels = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
  ];
  const dayName = dayLabels[d.getUTCDay()];
  return `${dayName.charAt(0).toUpperCase() + dayName.slice(1)} ${d.getUTCDate()} ${monthLabels[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}
