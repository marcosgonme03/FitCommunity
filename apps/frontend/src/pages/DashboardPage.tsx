import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Dumbbell, Clock, Flame, Zap, TrendingUp, Plus, ChevronRight, Trophy, Crown,
  Sparkles, Play,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import workoutsService, { HeatmapResponse } from '../services/workouts.service';
import usersService from '../services/users.service';
import aiService, { TodaySession } from '../services/ai.service';
import { WorkoutStats, SuggestedUser, PersonalRecord } from '../types';
import StatCard from '../components/ui/StatCard';
import Avatar from '../components/ui/Avatar';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import IntensityBadge from '../components/ui/IntensityBadge';
import BarChart from '../components/charts/BarChart';
import DonutChart from '../components/charts/DonutChart';
import YearlyHeatmap from '../components/charts/YearlyHeatmap';
import {
  formatDuration, formatMinutesAsHours, formatNumber, formatDate,
} from '../lib/format';
import { MUSCLE_LABELS, MUSCLE_COLORS } from '../lib/muscles';

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<WorkoutStats | null>(null);
  const [suggestions, setSuggestions] = useState<SuggestedUser[]>([]);
  const [prs, setPRs] = useState<PersonalRecord[]>([]);
  const [todaySession, setTodaySession] = useState<TodaySession | null>(null);
  const [loading, setLoading] = useState(true);

  // Heatmap anual
  const [heatmapYear, setHeatmapYear] = useState(() => new Date().getFullYear());
  const [heatmap, setHeatmap] = useState<HeatmapResponse | null>(null);
  const [heatmapLoading, setHeatmapLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    setHeatmapLoading(true);
    workoutsService
      .heatmap(heatmapYear)
      .then((r) => { if (alive) setHeatmap(r); })
      .catch(() => undefined)
      .finally(() => { if (alive) setHeatmapLoading(false); });
    return () => { alive = false; };
  }, [heatmapYear]);

  useEffect(() => {
    let alive = true;
    // Solo llamamos al endpoint de rutina activa si el usuario es premium
    // (sino siempre devuelve 402 y ensuciaría la consola)
    const todayPromise = user?.isPremium
      ? aiService.getActiveRoutineToday().catch(() => null)
      : Promise.resolve(null);

    Promise.all([
      workoutsService.stats(),
      usersService.getSuggestions(4),
      workoutsService.personalRecords(5),
      todayPromise,
    ])
      .then(([s, sugg, pr, today]) => {
        if (!alive) return;
        setStats(s);
        setSuggestions(sugg.items);
        setPRs(pr.items);
        setTodaySession(today);
      })
      .catch((e) => console.error('Failed to load dashboard', e))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [user?.isPremium]);

  function startTodaySessionLive() {
    if (!todaySession) return;
    // Modo en vivo: pantalla optimizada para gym con cronómetros
    navigate('/workouts/live', { state: { prefill: todaySession } });
  }

  function startTodaySessionForm() {
    if (!todaySession) return;
    // Modo formulario clásico: pre-rellenado, editable libremente
    navigate('/workouts/new', { state: { prefill: todaySession } });
  }

  if (loading) return <div className="p-8"><Spinner fullScreen label="Cargando tu dashboard..." /></div>;

  const displayName = user?.profile?.displayName ?? user?.email?.split('@')[0] ?? 'atleta';
  const totals = stats?.totals;
  const monthly = stats?.thisMonth;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-surface-900">
            Hola, {displayName.split(' ')[0]}
          </h1>
          <p className="text-surface-600 mt-1 text-sm sm:text-base">
            Aquí tienes el resumen de tu progreso. {stats && stats.streakDays > 0 && (
              <span className="text-brand-600 font-semibold">¡{stats.streakDays} días seguidos entrenando!</span>
            )}
          </p>
        </div>
        <Link to="/workouts/new">
          <Button leftIcon={<Plus className="w-4 h-4" />}>Registrar entrenamiento</Button>
        </Link>
      </header>

      {/* ── Widget de rutina activa ─────────────────────────────────────── */}
      {todaySession && (
        <section className="bg-gradient-to-br from-brand-50 via-white to-accent-50 border border-brand-200 rounded-2xl p-5 sm:p-6 shadow-soft">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-brand-700 bg-white border border-brand-200 px-2 py-1 rounded mb-2">
                <Sparkles className="w-3 h-3" />
                Rutina activa · Día {todaySession.dayIdx + 1} de {todaySession.totalDays}
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-surface-900">
                Hoy te toca: <span className="text-brand-700">{todaySession.day.focus}</span>
              </h2>
              <p className="text-sm text-surface-600 mt-1">
                {todaySession.exercises.length} ejercicios · ~{todaySession.estimatedMinutes} min
                {todaySession.unmatched.length > 0 && (
                  <span className="text-amber-700 font-semibold"> · {todaySession.unmatched.length} sin emparejar</span>
                )}
              </p>
              <p className="text-xs text-surface-500 mt-1 truncate">De: {todaySession.routineTitle}</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 shrink-0">
              <Button
                leftIcon={<Play className="w-4 h-4 fill-current" />}
                onClick={startTodaySessionLive}
              >
                Empezar en vivo
              </Button>
              <Button
                variant="outline"
                onClick={startTodaySessionForm}
                title="Modo formulario clásico (editar libremente)"
              >
                Editar
              </Button>
            </div>
          </div>
        </section>
      )}

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Dumbbell} label="Entrenamientos" value={totals?.workouts ?? 0}
          hint={`${monthly?.workouts ?? 0} este mes`} accent="brand" />
        <StatCard icon={Clock} label="Horas entrenadas"
          value={totals ? formatMinutesAsHours(totals.minutes) : '0h'}
          hint={`${monthly ? formatMinutesAsHours(monthly.minutes) : '0h'} este mes`} accent="accent" />
        <StatCard icon={Flame} label="Calorías"
          value={totals ? formatNumber(totals.calories) : '0'}
          hint={`${monthly ? formatNumber(monthly.calories) : '0'} este mes`} accent="orange" />
        <StatCard icon={Zap} label="Racha activa" value={`${stats?.streakDays ?? 0}`}
          hint={(stats?.streakDays ?? 0) === 1 ? 'día' : 'días seguidos'} accent="red" />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white border border-surface-200 rounded-2xl p-5 shadow-soft">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-bold text-surface-900">Actividad reciente</h2>
              <p className="text-xs text-surface-500 mt-0.5">Últimas 4 semanas</p>
            </div>
            <TrendingUp className="w-4 h-4 text-surface-500" />
          </div>
          {stats && stats.weeklyActivity.length > 0 ? (
            <BarChart
              data={stats.weeklyActivity.map((w) => ({
                label: formatDate(w.weekStart).slice(0, 6),
                value: w.count,
                color: '#f97316',
              }))}
              height={180}
              formatter={(n) => `${n} entr.`}
            />
          ) : (
            <p className="text-center text-sm text-surface-500 py-12">Sin actividad todavía</p>
          )}
          {stats && stats.last30Days.totalSets > 0 && (
            <div className="mt-4 pt-4 border-t border-surface-200 grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-surface-500 uppercase tracking-wider font-semibold">Volumen 30d</p>
                <p className="text-lg font-bold text-surface-900">{formatNumber(stats.last30Days.totalVolume)} kg</p>
              </div>
              <div>
                <p className="text-xs text-surface-500 uppercase tracking-wider font-semibold">Series 30d</p>
                <p className="text-lg font-bold text-surface-900">{stats.last30Days.totalSets}</p>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white border border-surface-200 rounded-2xl p-5 shadow-soft">
          <div className="mb-5">
            <h2 className="font-bold text-surface-900">Grupos musculares</h2>
            <p className="text-xs text-surface-500 mt-0.5">Top 5 más entrenados</p>
          </div>
          {stats && stats.topMuscles.length > 0 ? (
            <div className="flex flex-col items-center">
              <DonutChart
                data={stats.topMuscles.slice(0, 5).map((s) => ({
                  label: MUSCLE_LABELS[s.muscle],
                  value: s.count,
                  color: MUSCLE_COLORS[s.muscle].hex,
                }))}
                size={140}
                thickness={22}
                centerLabel={String(stats.topMuscles.slice(0, 5).reduce((s, x) => s + x.count, 0))}
                centerSubLabel="Sesiones"
              />
              <div className="w-full mt-4 space-y-2">
                {stats.topMuscles.slice(0, 5).map((s) => (
                  <div key={s.muscle} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: MUSCLE_COLORS[s.muscle].hex }} />
                      <span className="text-surface-700">{MUSCLE_LABELS[s.muscle]}</span>
                    </div>
                    <span className="text-surface-600 font-semibold">{s.count}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-center text-sm text-surface-500 py-12">Registra tu primer entrenamiento</p>
          )}
        </div>
      </section>

      {/* Heatmap anual */}
      <YearlyHeatmap
        data={heatmap}
        loading={heatmapLoading}
        year={heatmapYear}
        onYearChange={setHeatmapYear}
      />

      {/* PRs y sugerencias */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white border border-surface-200 rounded-2xl shadow-soft">
          <div className="flex items-center justify-between p-5 border-b border-surface-200">
            <h2 className="font-bold text-surface-900 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-accent-600" />
              Tus marcas personales
            </h2>
            <Link to="/workouts" className="text-xs text-brand-600 hover:text-brand-700 font-semibold inline-flex items-center gap-1">
              Ver todos <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {prs.length > 0 ? (
            <div className="divide-y divide-surface-100">
              {prs.map((pr) => (
                <div key={pr.exerciseId} className="flex items-center gap-3 p-4 hover:bg-surface-50 transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-accent-100 flex items-center justify-center shrink-0">
                    <Trophy className="w-4 h-4 text-accent-700" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-surface-900 text-sm truncate">{pr.exerciseName}</p>
                    <p className="text-xs text-surface-500 mt-0.5">
                      {formatDate(pr.achievedAt)} · {pr.repsAtMax} repeticiones
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-surface-900">{pr.maxWeight} <span className="text-sm font-normal text-surface-500">kg</span></p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Trophy}
              title="Aún no tienes marcas registradas"
              description="Registra entrenamientos con peso para ver aquí tus PRs."
              action={<Link to="/workouts/new"><Button>Crear entrenamiento</Button></Link>}
            />
          )}
        </div>

        <div className="bg-white border border-surface-200 rounded-2xl shadow-soft">
          <div className="p-5 border-b border-surface-200">
            <h2 className="font-bold text-surface-900">A quién seguir</h2>
            <p className="text-xs text-surface-500 mt-0.5">Atletas activos en la comunidad</p>
          </div>
          <div className="p-3 space-y-1">
            {suggestions.length === 0 ? (
              <p className="text-center text-xs text-surface-500 py-6">Sin sugerencias por ahora</p>
            ) : (
              suggestions.map((u) => (
                <Link
                  key={u.id}
                  to={u.username ? `/u/${u.username}` : `/u/${u.id}`}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-50 transition-colors group"
                >
                  <Avatar src={u.avatarUrl} name={u.displayName ?? '?'} size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <p className="text-sm font-semibold text-surface-900 truncate group-hover:text-brand-700 transition-colors">
                        {u.displayName ?? 'Usuario'}
                      </p>
                      {u.isPremium && <Crown className="w-3 h-3 text-accent-600" />}
                    </div>
                    <p className="text-xs text-surface-500 truncate">
                      {u.workoutsCount} entr. · {u.followersCount} seguidores
                    </p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Recent workouts */}
      {stats && stats.recentWorkouts.length > 0 && (
        <section className="bg-white border border-surface-200 rounded-2xl shadow-soft">
          <div className="flex items-center justify-between p-5 border-b border-surface-200">
            <h2 className="font-bold text-surface-900">Entrenamientos recientes</h2>
            <Link to="/workouts" className="text-xs text-brand-600 hover:text-brand-700 font-semibold inline-flex items-center gap-1">
              Ver todos <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-surface-100">
            {stats.recentWorkouts.map((w) => (
              <Link
                key={w.id}
                to={`/workouts/${w.id}`}
                className="flex items-center gap-3 p-4 hover:bg-surface-50 transition-colors group"
              >
                <div className="w-10 h-10 rounded-lg bg-brand-100 flex items-center justify-center shrink-0">
                  <Dumbbell className="w-4 h-4 text-brand-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-surface-900 text-sm truncate group-hover:text-brand-700 transition-colors">
                    {w.title}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-surface-500 mt-0.5">
                    <span>{w.exercises.length} ejercicios</span>
                    <span>· {formatDuration(w.durationMin)}</span>
                    {w.calories && <span>· {w.calories} kcal</span>}
                    <span>· {formatDate(w.workoutDate)}</span>
                  </div>
                </div>
                <IntensityBadge intensity={w.intensity} size="sm" />
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
