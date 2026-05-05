import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import workoutsService from '../services/workouts.service';
import { CalendarMonth, MuscleGroup, IntensityLevel } from '../types';
import Spinner from '../components/ui/Spinner';
import IntensityBadge from '../components/ui/IntensityBadge';
import MuscleBadge from '../components/ui/MuscleBadge';
import { MUSCLE_COLORS } from '../lib/muscles';
import { formatDuration } from '../lib/format';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const DAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

interface DisplayWorkout {
  id: string;
  title: string;
  intensity: IntensityLevel;
  duration_min: number;
  calories: number | null;
  workout_date: string;
  muscles: MuscleGroup[];
}

export default function CalendarPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [data, setData] = useState<CalendarMonth | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  useEffect(() => {
    setLoading(true);
    setSelectedDay(null);
    workoutsService.calendar(year, month).then(setData).catch(console.error).finally(() => setLoading(false));
  }, [year, month]);

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear((y) => y - 1); } else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear((y) => y + 1); } else setMonth((m) => m + 1);
  }
  function goToToday() {
    setYear(today.getFullYear()); setMonth(today.getMonth() + 1);
  }

  const firstOfMonth = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstWeekDay = (firstOfMonth.getDay() + 6) % 7;
  const totalCells = Math.ceil((firstWeekDay + daysInMonth) / 7) * 7;

  const dayMap = new Map<number, CalendarMonth['days'][number]>();
  data?.days.forEach((d) => dayMap.set(d.day, d));

  const isToday = (day: number) =>
    day === today.getDate() &&
    month === today.getMonth() + 1 &&
    year === today.getFullYear();

  const selectedDayData = selectedDay ? dayMap.get(selectedDay) : null;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-surface-900">Calendario</h1>
          <p className="text-surface-600 mt-1 text-sm">
            {data ? `${data.totalWorkouts} entrenamientos en ${MONTH_NAMES[month - 1]}` : 'Cargando...'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={prevMonth}
            className="p-2 rounded-lg bg-white border border-surface-200 text-surface-700 hover:bg-surface-50 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={goToToday}
            className="px-3 py-2 rounded-lg bg-white border border-surface-200 text-sm font-semibold text-surface-700 hover:bg-surface-50 transition-colors">
            Hoy
          </button>
          <button onClick={nextMonth}
            className="p-2 rounded-lg bg-white border border-surface-200 text-surface-700 hover:bg-surface-50 transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white border border-surface-200 rounded-2xl p-4 sm:p-6 shadow-soft">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-surface-900 text-lg">{MONTH_NAMES[month - 1]} {year}</h2>
          </div>
          {loading ? (
            <div className="py-16"><Spinner label="Cargando..." /></div>
          ) : (
            <>
              <div className="grid grid-cols-7 gap-1 mb-2">
                {DAY_LABELS.map((d) => (
                  <div key={d} className="text-[10px] font-bold text-surface-500 text-center uppercase tracking-wider py-2">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: totalCells }).map((_, idx) => {
                  const dayNumber = idx - firstWeekDay + 1;
                  const isInMonth = dayNumber >= 1 && dayNumber <= daysInMonth;
                  const dayData = isInMonth ? dayMap.get(dayNumber) : undefined;
                  const isSelected = selectedDay === dayNumber;
                  const cellIsToday = isInMonth && isToday(dayNumber);

                  if (!isInMonth) return <div key={idx} className="aspect-square" />;
                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedDay(dayNumber)}
                      className={`aspect-square flex flex-col items-center justify-start p-1.5 rounded-lg border transition-all text-left
                                  ${isSelected
                                    ? 'bg-brand-50 border-brand-400 ring-1 ring-brand-300'
                                    : cellIsToday
                                      ? 'bg-brand-50/50 border-brand-200'
                                      : 'bg-surface-50 border-surface-200 hover:bg-white hover:border-surface-300'}`}
                    >
                      <span className={`text-xs font-bold ${cellIsToday ? 'text-brand-700' : 'text-surface-700'}`}>
                        {dayNumber}
                      </span>
                      {dayData && (
                        <div className="flex flex-wrap gap-0.5 mt-1 justify-center">
                          {dayData.muscles.slice(0, 4).map((m) => (
                            <span key={m} className="w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: MUSCLE_COLORS[m].hex }} title={m} />
                          ))}
                          {dayData.muscles.length > 4 && <span className="text-[8px] text-surface-500">+</span>}
                        </div>
                      )}
                      {dayData && dayData.count > 0 && (
                        <span className="text-[9px] text-surface-500 mt-auto">
                          {dayData.count} entr.
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div className="bg-white border border-surface-200 rounded-2xl p-5 shadow-soft">
          {selectedDayData ? (
            <>
              <h3 className="font-bold text-surface-900">
                Día {selectedDayData.day} de {MONTH_NAMES[month - 1]}
              </h3>
              <p className="text-xs text-surface-500 mt-0.5">
                {selectedDayData.count} {selectedDayData.count === 1 ? 'entrenamiento' : 'entrenamientos'}
              </p>
              <div className="space-y-2 mt-4">
                {(selectedDayData.workouts as DisplayWorkout[]).map((w) => (
                  <Link key={w.id} to={`/workouts/${w.id}`}
                    className="block p-3 rounded-lg bg-surface-50 border border-surface-200 hover:border-brand-300 hover:bg-brand-50/40 transition-colors group">
                    <p className="text-sm font-semibold text-surface-900 group-hover:text-brand-700 truncate">{w.title}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      <span className="text-xs text-surface-600">{formatDuration(w.duration_min)}</span>
                      <IntensityBadge intensity={w.intensity} size="sm" />
                    </div>
                    {w.muscles.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {w.muscles.slice(0, 3).map((m) => <MuscleBadge key={m} muscle={m} size="sm" />)}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            </>
          ) : selectedDay ? (
            <div className="text-center py-10">
              <CalendarIcon className="w-8 h-8 text-surface-400 mx-auto mb-2" />
              <p className="text-sm text-surface-500">Sin entrenamientos este día</p>
            </div>
          ) : (
            <div className="text-center py-10">
              <CalendarIcon className="w-8 h-8 text-surface-400 mx-auto mb-2" />
              <p className="text-sm text-surface-500">Selecciona un día para ver los detalles</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
