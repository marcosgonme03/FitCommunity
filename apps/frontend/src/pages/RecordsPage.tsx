import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Trophy,
  TrendingUp,
  Calendar,
  Dumbbell,
  Filter,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import workoutsService from '../services/workouts.service';
import { PersonalRecord, ExerciseProgressPoint, MuscleGroup } from '../types';
import EmptyState from '../components/ui/EmptyState';
import Spinner from '../components/ui/Spinner';
import LineChart from '../components/charts/LineChart';
import Modal from '../components/ui/Modal';
import { MUSCLE_LABELS, MUSCLE_COLORS } from '../lib/muscles';
import { formatDate } from '../lib/format';
import { toast } from '../components/ui/Toast';

export default function RecordsPage() {
  const [records, setRecords] = useState<PersonalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [muscleFilter, setMuscleFilter] = useState<MuscleGroup | 'ALL'>('ALL');
  const [selected, setSelected] = useState<PersonalRecord | null>(null);
  const [progress, setProgress] = useState<ExerciseProgressPoint[] | null>(null);
  const [progressLoading, setProgressLoading] = useState(false);

  useEffect(() => {
    workoutsService
      .personalRecords()
      .then((res) => setRecords(res.items))
      .catch(() => toast.error('Error', 'No se pudieron cargar tus PRs'))
      .finally(() => setLoading(false));
  }, []);

  // Listado de músculos presentes en los PRs (para el filtro)
  const musclePresent = Array.from(new Set(records.map((r) => r.primaryMuscle))) as MuscleGroup[];

  const filtered =
    muscleFilter === 'ALL'
      ? records
      : records.filter((r) => r.primaryMuscle === muscleFilter);

  const totalLifted = records.reduce((sum, r) => sum + r.maxWeight * r.repsAtMax, 0);
  const heaviest = records.reduce<PersonalRecord | null>((max, r) => {
    if (!max || r.maxWeight > max.maxWeight) return r;
    return max;
  }, null);
  const bestEstimated = records.reduce<PersonalRecord | null>((max, r) => {
    if (!max || r.estimatedOneRm > max.estimatedOneRm) return r;
    return max;
  }, null);

  async function openProgress(rec: PersonalRecord) {
    setSelected(rec);
    setProgress(null);
    setProgressLoading(true);
    try {
      const res = await workoutsService.exerciseProgress(rec.exerciseId);
      setProgress(res.items);
    } catch {
      toast.error('Error', 'No se pudo cargar la evolución');
    } finally {
      setProgressLoading(false);
    }
  }

  if (loading) return <Spinner fullScreen label="Cargando tus PRs..." />;

  if (records.length === 0) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
        <header className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-surface-900 flex items-center gap-2">
            <Trophy className="w-7 h-7 text-amber-500" />
            Marcas personales
          </h1>
          <p className="text-surface-600 mt-1 text-sm">
            Tu mejor peso por ejercicio y la evolución de cada uno.
          </p>
        </header>
        <EmptyState
          icon={Trophy}
          title="Aún no tienes marcas registradas"
          description="Registra entrenamientos con peso (no calentamiento) y aquí verás automáticamente tus PRs por ejercicio."
        />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-surface-900 flex items-center gap-2">
            <Trophy className="w-7 h-7 text-amber-500" />
            Marcas personales
          </h1>
          <p className="text-surface-600 mt-1 text-sm">
            {records.length} ejercicio{records.length === 1 ? '' : 's'} con récord registrado
          </p>
        </div>
      </header>

      {/* Top stats */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <HighlightCard
          icon={Dumbbell}
          label="Peso más alto levantado"
          value={heaviest ? `${heaviest.maxWeight} kg` : '—'}
          hint={heaviest ? heaviest.exerciseName : ''}
          gradient="from-orange-500 to-amber-500"
        />
        <HighlightCard
          icon={Sparkles}
          label="Mejor 1RM estimado"
          value={bestEstimated ? `${bestEstimated.estimatedOneRm} kg` : '—'}
          hint={bestEstimated ? bestEstimated.exerciseName : 'Fórmula Epley'}
          gradient="from-amber-500 to-yellow-500"
        />
        <HighlightCard
          icon={TrendingUp}
          label="Volumen total en PRs"
          value={`${(totalLifted / 1000).toFixed(1)} t`}
          hint={`${totalLifted.toLocaleString('es-ES')} kg movidos en sets PR`}
          gradient="from-emerald-500 to-teal-500"
        />
      </section>

      {/* Muscle filter */}
      {musclePresent.length > 1 && (
        <section className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-surface-400 shrink-0" />
          <FilterPill active={muscleFilter === 'ALL'} onClick={() => setMuscleFilter('ALL')} label="Todos" />
          {musclePresent.map((m) => (
            <FilterPill
              key={m}
              active={muscleFilter === m}
              onClick={() => setMuscleFilter(m)}
              label={MUSCLE_LABELS[m] ?? m}
              color={MUSCLE_COLORS[m]?.hex}
            />
          ))}
        </section>
      )}

      {/* Records grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((r, idx) => (
          <RecordCard key={r.exerciseId} record={r} rank={idx + 1} onClick={() => openProgress(r)} />
        ))}
      </section>

      {/* Empty filter state */}
      {filtered.length === 0 && (
        <EmptyState
          icon={Filter}
          title="Sin PRs en este filtro"
          description="Cambia el grupo muscular o quita el filtro para ver todos."
        />
      )}

      {/* Progress modal */}
      {selected && (
        <Modal
          isOpen={!!selected}
          onClose={() => setSelected(null)}
          title={selected.exerciseName}
          size="lg"
        >
          <div className="space-y-5">
            {/* Header info */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <ModalStat label="Tu PR" value={`${selected.maxWeight} kg`} sub={`${selected.repsAtMax} reps`} />
              <ModalStat label="1RM est." value={`${selected.estimatedOneRm} kg`} sub="Epley" />
              <ModalStat label="Sesiones" value={selected.timesPerformed.toString()} sub="con este ejercicio" />
            </div>

            {/* Achievement date */}
            <div className="flex items-center justify-center gap-2 text-sm text-surface-600">
              <Calendar className="w-4 h-4" />
              Conseguido el <strong>{formatDate(selected.achievedAt)}</strong>
              <Link
                to={`/workouts/${selected.workoutId}`}
                className="inline-flex items-center gap-1 text-brand-600 hover:text-brand-700 font-semibold ml-2"
              >
                Ver entrenamiento
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {/* Progress chart */}
            <div className="bg-surface-50 rounded-xl p-4 border border-surface-200">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-surface-900 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  Evolución del peso máximo
                </h3>
                <span className="text-xs text-surface-500">
                  Últimas {progress?.length ?? '—'} sesiones
                </span>
              </div>

              {progressLoading ? (
                <div className="py-12">
                  <Spinner label="Cargando evolución..." />
                </div>
              ) : !progress || progress.length === 0 ? (
                <p className="text-sm text-surface-500 text-center py-12">
                  Sin datos suficientes para mostrar la evolución.
                </p>
              ) : progress.length === 1 ? (
                <p className="text-sm text-surface-500 text-center py-12">
                  Solo has hecho este ejercicio una vez. Vuelve a hacerlo para ver evolución.
                </p>
              ) : (
                <LineChart
                  data={progress.map((p) => ({
                    label: formatDate(p.workoutDate).slice(0, 5),
                    value: p.maxWeight,
                  }))}
                  height={200}
                  color={MUSCLE_COLORS[selected.primaryMuscle]?.hex ?? '#f97316'}
                />
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Subcomponents ─────────────────────────────────────────────────────────

function HighlightCard({
  icon: Icon,
  label,
  value,
  hint,
  gradient,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  hint: string;
  gradient: string;
}) {
  return (
    <div className={`rounded-2xl p-4 bg-gradient-to-br ${gradient} text-white shadow-sm`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold uppercase tracking-wide text-white/80">{label}</span>
        <Icon className="w-4 h-4 text-white/80" />
      </div>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-xs text-white/80 mt-1 truncate">{hint}</p>
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  label,
  color,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  color?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
        active
          ? 'bg-brand-500 text-white'
          : 'bg-white border border-surface-200 text-surface-700 hover:bg-surface-50'
      }`}
    >
      {color && (
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: active ? '#fff' : color }}
        />
      )}
      {label}
    </button>
  );
}

function RecordCard({
  record,
  rank,
  onClick,
}: {
  record: PersonalRecord;
  rank: number;
  onClick: () => void;
}) {
  const muscleColor = MUSCLE_COLORS[record.primaryMuscle]?.hex ?? '#64748b';
  const muscleBg = MUSCLE_COLORS[record.primaryMuscle]?.bg ?? 'bg-surface-100';
  const isTop3 = rank <= 3;

  return (
    <button
      onClick={onClick}
      className="group bg-white border border-surface-200 rounded-2xl p-4 shadow-soft hover:border-brand-300 hover:shadow-md transition-all text-left w-full"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          {isTop3 && (
            <span className={`w-7 h-7 shrink-0 rounded-lg flex items-center justify-center text-xs font-bold ${
              rank === 1 ? 'bg-amber-100 text-amber-700' :
              rank === 2 ? 'bg-surface-200 text-surface-700' :
              'bg-orange-100 text-orange-700'
            }`}>
              #{rank}
            </span>
          )}
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide ${muscleBg}`}
            style={{ color: muscleColor }}
          >
            {MUSCLE_LABELS[record.primaryMuscle] ?? record.primaryMuscle}
          </span>
        </div>
        <ArrowRight className="w-4 h-4 text-surface-300 group-hover:text-brand-500 group-hover:translate-x-0.5 transition-all" />
      </div>

      <h3 className="font-bold text-surface-900 line-clamp-2 leading-tight mb-3">
        {record.exerciseName}
      </h3>

      <div className="flex items-end justify-between mb-3">
        <div>
          <p className="text-3xl font-extrabold text-surface-900 tabular-nums">
            {record.maxWeight}
            <span className="text-lg text-surface-500 ml-0.5">kg</span>
          </p>
          <p className="text-xs text-surface-500 mt-0.5">
            × {record.repsAtMax} {record.repsAtMax === 1 ? 'rep' : 'reps'}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-surface-500">1RM est.</p>
          <p className="text-lg font-bold text-amber-600 tabular-nums">
            {record.estimatedOneRm}
            <span className="text-xs text-amber-500 ml-0.5">kg</span>
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-surface-500 pt-2 border-t border-surface-100">
        <span className="inline-flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {formatDate(record.achievedAt)}
        </span>
        <span>{record.timesPerformed} {record.timesPerformed === 1 ? 'sesión' : 'sesiones'}</span>
      </div>
    </button>
  );
}

function ModalStat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-surface-50 rounded-xl p-3">
      <p className="text-[10px] uppercase tracking-wide text-surface-500 font-semibold">{label}</p>
      <p className="text-2xl font-bold text-surface-900 tabular-nums mt-0.5">{value}</p>
      <p className="text-xs text-surface-500">{sub}</p>
    </div>
  );
}
