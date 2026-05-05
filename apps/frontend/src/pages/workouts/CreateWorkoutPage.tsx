import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft, Save, Plus, X, GripVertical, Search, Dumbbell, Trash2, Globe, Lock, Copy,
  Sparkles, AlertTriangle,
} from 'lucide-react';
import workoutsService, { CreateWorkoutSetPayload, CreateWorkoutExercisePayload } from '../../services/workouts.service';
import exercisesService from '../../services/exercises.service';
import aiService, { TodaySession } from '../../services/ai.service';
import { Exercise, IntensityLevel, MuscleGroup, Equipment } from '../../types';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import MuscleBadge from '../../components/ui/MuscleBadge';
import {
  ALL_MUSCLES, MUSCLE_LABELS, ALL_EQUIPMENT, EQUIPMENT_LABELS,
  ALL_INTENSITIES, INTENSITY_LABELS, INTENSITY_COLORS,
} from '../../lib/muscles';
import { toast } from '../../components/ui/Toast';

interface DraftSet extends CreateWorkoutSetPayload {
  tempId: string;
}

interface DraftExercise {
  tempId: string;
  exercise: Exercise;
  notes: string;
  sets: DraftSet[];
}

let tempCounter = 0;
const nextTemp = () => `t_${++tempCounter}`;

function defaultSet(setNumber: number): DraftSet {
  return {
    tempId: nextTemp(),
    setNumber,
    reps: 8,
    weightKg: null,
    rpe: null,
    isWarmup: false,
    isFailure: false,
    restSec: 90,
    notes: null,
  };
}

export default function CreateWorkoutPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const prefill = (location.state as { prefill?: TodaySession } | null)?.prefill ?? null;

  const [submitting, setSubmitting] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  const [form, setForm] = useState({
    title: prefill?.suggestedTitle ?? '',
    notes: '',
    durationMin: prefill?.estimatedMinutes ?? 60,
    intensity: 'HIGH' as IntensityLevel,
    isPublic: true,
    workoutDate: new Date().toISOString().slice(0, 16),
  });

  const [exercises, setExercises] = useState<DraftExercise[]>(() => {
    if (!prefill) return [];
    // Convertir los PrefilledExercise en DraftExercise
    return prefill.exercises.map((pex) => ({
      tempId: nextTemp(),
      exercise: {
        id: pex.exerciseId,
        slug: '',
        name: pex.exerciseName,
        primary_muscle: pex.primaryMuscle as MuscleGroup,
        secondary_muscles: [],
        equipment: pex.equipment as Equipment,
        category: 'COMPOUND',
        is_custom: false,
        created_at: new Date().toISOString(),
      } as Exercise,
      notes: pex.notes ?? '',
      sets: pex.sets.map((s) => ({
        tempId: nextTemp(),
        setNumber: s.setNumber,
        reps: s.reps,
        weightKg: s.weightKg,
        rpe: s.rpe,
        isWarmup: s.isWarmup,
        isFailure: s.isFailure,
        restSec: s.restSec,
        notes: s.notes,
      })),
    }));
  });

  function addExercise(ex: Exercise) {
    setExercises((prev) => [
      ...prev,
      { tempId: nextTemp(), exercise: ex, notes: '', sets: [defaultSet(1), defaultSet(2), defaultSet(3)] },
    ]);
    setShowPicker(false);
  }

  function removeExercise(tempId: string) {
    setExercises((prev) => prev.filter((e) => e.tempId !== tempId));
  }

  function moveExercise(tempId: string, dir: -1 | 1) {
    setExercises((prev) => {
      const idx = prev.findIndex((e) => e.tempId === tempId);
      if (idx < 0) return prev;
      const target = idx + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }

  function addSet(exTempId: string) {
    setExercises((prev) =>
      prev.map((e) => {
        if (e.tempId !== exTempId) return e;
        const nextNum = e.sets.length + 1;
        const last = e.sets[e.sets.length - 1];
        return {
          ...e,
          sets: [
            ...e.sets,
            {
              ...defaultSet(nextNum),
              reps: last?.reps ?? 8,
              weightKg: last?.weightKg ?? null,
              restSec: last?.restSec ?? 90,
            },
          ],
        };
      })
    );
  }

  function removeSet(exTempId: string, setTempId: string) {
    setExercises((prev) =>
      prev.map((e) => {
        if (e.tempId !== exTempId) return e;
        const filtered = e.sets.filter((s) => s.tempId !== setTempId);
        return {
          ...e,
          sets: filtered.map((s, i) => ({ ...s, setNumber: i + 1 })),
        };
      })
    );
  }

  function updateSet(exTempId: string, setTempId: string, patch: Partial<DraftSet>) {
    setExercises((prev) =>
      prev.map((e) => {
        if (e.tempId !== exTempId) return e;
        return {
          ...e,
          sets: e.sets.map((s) => (s.tempId === setTempId ? { ...s, ...patch } : s)),
        };
      })
    );
  }

  function duplicateSet(exTempId: string, setTempId: string) {
    setExercises((prev) =>
      prev.map((e) => {
        if (e.tempId !== exTempId) return e;
        const idx = e.sets.findIndex((s) => s.tempId === setTempId);
        if (idx < 0) return e;
        const original = e.sets[idx];
        const newSet: DraftSet = { ...original, tempId: nextTemp() };
        const newSets = [
          ...e.sets.slice(0, idx + 1),
          newSet,
          ...e.sets.slice(idx + 1),
        ].map((s, i) => ({ ...s, setNumber: i + 1 }));
        return { ...e, sets: newSets };
      })
    );
  }

  // Total volume preview
  const stats = useMemo(() => {
    let totalSets = 0;
    let totalVolume = 0;
    for (const ex of exercises) {
      for (const s of ex.sets) {
        if (s.isWarmup) continue;
        totalSets++;
        totalVolume += (s.weightKg ?? 0) * s.reps;
      }
    }
    return { totalSets, totalVolume: Math.round(totalVolume) };
  }, [exercises]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.title.length < 3) {
      toast.error('Pon un título', 'Mínimo 3 caracteres');
      return;
    }
    if (exercises.length === 0) {
      toast.error('Añade al menos un ejercicio');
      return;
    }
    setSubmitting(true);
    try {
      const payload: CreateWorkoutExercisePayload[] = exercises.map((ex, idx) => ({
        exerciseId: ex.exercise.id,
        orderIdx: idx,
        notes: ex.notes || null,
        sets: ex.sets.map(({ tempId: _t, ...rest }) => ({
          setNumber: rest.setNumber,
          reps: Number(rest.reps),
          weightKg: rest.weightKg == null ? null : Number(rest.weightKg),
          rpe: rest.rpe == null ? null : Number(rest.rpe),
          isWarmup: !!rest.isWarmup,
          isFailure: !!rest.isFailure,
          restSec: rest.restSec == null ? null : Number(rest.restSec),
          notes: rest.notes || null,
        })),
      }));
      const created = await workoutsService.create({
        title: form.title.trim(),
        notes: form.notes ? form.notes.trim() : null,
        durationMin: Number(form.durationMin),
        intensity: form.intensity,
        isPublic: form.isPublic,
        workoutDate: form.workoutDate ? new Date(form.workoutDate).toISOString() : undefined,
        exercises: payload,
      });

      // Si veníamos de una rutina activa, avanzamos al siguiente día
      if (prefill?.routineId) {
        try {
          await aiService.advanceActiveRoutine();
          toast.success('¡Entrenamiento guardado!', 'Mañana en el dashboard verás el siguiente día.');
        } catch {
          // Si falla el advance no rompemos el flujo del usuario
          toast.success('¡Entrenamiento guardado!');
        }
      } else {
        toast.success('¡Entrenamiento guardado!');
      }
      navigate(`/workouts/${created.id}`);
    } catch (err: unknown) {
      console.error('[CreateWorkout] error:', err);
      const e = err as {
        response?: {
          status?: number;
          data?: { error?: string; message?: string; details?: unknown };
        };
        message?: string;
      };
      const backendMsg =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e?.message ||
        'Error al guardar el entrenamiento';
      toast.error('No se pudo guardar', backendMsg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <button
        onClick={() => navigate(-1)}
        className="text-surface-600 hover:text-surface-900 text-sm font-medium inline-flex items-center gap-1 mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> Volver
      </button>

      <header className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-surface-900">
            {prefill ? `Sesión de hoy: ${prefill.day.focus}` : 'Nuevo entrenamiento'}
          </h1>
          <p className="text-surface-600 mt-1 text-sm">
            {prefill
              ? `Día ${prefill.dayIdx + 1} de ${prefill.totalDays} de "${prefill.routineTitle}". Ajusta lo que necesites.`
              : 'Añade los ejercicios y registra tus series.'}
          </p>
        </div>
        <div className="flex gap-3 text-xs">
          <span className="bg-brand-50 text-brand-700 px-3 py-1.5 rounded-lg font-semibold">
            {exercises.length} ejercicios
          </span>
          <span className="bg-surface-100 text-surface-700 px-3 py-1.5 rounded-lg font-semibold">
            {stats.totalSets} series · {stats.totalVolume} kg vol.
          </span>
        </div>
      </header>

      {/* Banner: ejercicios sin emparejar de la rutina IA */}
      {prefill && prefill.unmatched.length > 0 && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-amber-900 text-sm">
              {prefill.unmatched.length} {prefill.unmatched.length === 1 ? 'ejercicio no se encontró' : 'ejercicios no se encontraron'} en el catálogo
            </p>
            <p className="text-xs text-amber-800 mt-0.5">
              La IA propuso: {prefill.unmatched.map((u) => `"${u.name}"`).join(', ')}. Añádelos manualmente con el botón "+ Añadir ejercicio" si los quieres registrar.
            </p>
          </div>
        </div>
      )}

      {/* Banner: sugerencia de pesos del histórico */}
      {prefill && prefill.exercises.some((e) => e.fromHistory) && (
        <div className="mb-6 bg-brand-50 border border-brand-200 rounded-xl p-4 flex gap-3">
          <Sparkles className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
          <p className="text-sm text-brand-900">
            Los pesos pre-rellenados son los de tu último entrenamiento de cada ejercicio. Ajústalos si hoy quieres ir más fuerte o más suave.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Cabecera del workout */}
        <section className="bg-white border border-surface-200 rounded-2xl p-5 space-y-4 shadow-soft">
          <div>
            <label className="label">Título</label>
            <input
              type="text"
              required
              minLength={3}
              maxLength={200}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Ej: Día de pierna · Pecho y tríceps · Push pesado"
              className="input-field"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Duración (min)</label>
              <input
                type="number"
                required
                min={1}
                max={1440}
                value={form.durationMin}
                onChange={(e) => setForm({ ...form, durationMin: Number(e.target.value) })}
                className="input-field"
              />
            </div>
            <div>
              <label className="label">Fecha y hora</label>
              <input
                type="datetime-local"
                value={form.workoutDate}
                onChange={(e) => setForm({ ...form, workoutDate: e.target.value })}
                className="input-field"
              />
            </div>
          </div>
          <div>
            <label className="label">Intensidad</label>
            <div className="grid grid-cols-4 gap-2">
              {ALL_INTENSITIES.map((i) => {
                const c = INTENSITY_COLORS[i];
                const active = form.intensity === i;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setForm({ ...form, intensity: i })}
                    className={`p-3 rounded-lg border text-sm font-semibold transition-all
                                ${active ? `${c.bg} border-current ${c.text}` : 'bg-white border-surface-200 text-surface-600 hover:bg-surface-50'}`}
                  >
                    {INTENSITY_LABELS[i]}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="label">Notas (opcional)</label>
            <textarea
              rows={2}
              maxLength={2000}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="¿Cómo te has sentido? Sensaciones, lesiones, energía..."
              className="input-field resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setForm({ ...form, isPublic: true })}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-all text-left
                          ${form.isPublic ? 'bg-brand-50 border-brand-300 ring-1 ring-brand-200' : 'bg-white border-surface-200 hover:bg-surface-50'}`}
            >
              <Globe className={`w-5 h-5 ${form.isPublic ? 'text-brand-600' : 'text-surface-400'}`} />
              <div>
                <p className={`font-semibold text-sm ${form.isPublic ? 'text-surface-900' : 'text-surface-700'}`}>Público</p>
                <p className="text-xs text-surface-500">Visible en el feed</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setForm({ ...form, isPublic: false })}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-all text-left
                          ${!form.isPublic ? 'bg-brand-50 border-brand-300 ring-1 ring-brand-200' : 'bg-white border-surface-200 hover:bg-surface-50'}`}
            >
              <Lock className={`w-5 h-5 ${!form.isPublic ? 'text-brand-600' : 'text-surface-400'}`} />
              <div>
                <p className={`font-semibold text-sm ${!form.isPublic ? 'text-surface-900' : 'text-surface-700'}`}>Privado</p>
                <p className="text-xs text-surface-500">Solo tú</p>
              </div>
            </button>
          </div>
        </section>

        {/* Ejercicios */}
        <section className="space-y-3">
          {exercises.map((ex, exIdx) => (
            <div key={ex.tempId} className="bg-white border border-surface-200 rounded-2xl shadow-soft overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-3 bg-surface-50 border-b border-surface-200">
                <div className="flex flex-col gap-0.5">
                  <button type="button" onClick={() => moveExercise(ex.tempId, -1)} disabled={exIdx === 0}
                    className="text-surface-400 hover:text-surface-700 disabled:opacity-30">
                    <GripVertical className="w-4 h-4 rotate-90" />
                  </button>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-surface-900 truncate">{ex.exercise.name}</p>
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    <MuscleBadge muscle={ex.exercise.primary_muscle} size="sm" />
                    <span className="text-[10px] text-surface-500 px-1.5 py-0.5">
                      {EQUIPMENT_LABELS[ex.exercise.equipment]}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeExercise(ex.tempId)}
                  className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                  aria-label="Eliminar ejercicio"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="px-5 py-4">
                {/* Sets */}
                <div className="space-y-2">
                  <div className="grid grid-cols-12 gap-2 text-[10px] uppercase tracking-wider text-surface-500 font-bold px-2">
                    <div className="col-span-1">Set</div>
                    <div className="col-span-3">Peso (kg)</div>
                    <div className="col-span-3">Reps</div>
                    <div className="col-span-2">RPE</div>
                    <div className="col-span-2">Tipo</div>
                    <div className="col-span-1"></div>
                  </div>
                  {ex.sets.map((s) => (
                    <div key={s.tempId} className="grid grid-cols-12 gap-2 items-center">
                      <div className={`col-span-1 text-sm font-bold ${s.isWarmup ? 'text-yellow-600' : 'text-surface-700'}`}>
                        {s.setNumber}
                      </div>
                      <div className="col-span-3">
                        <input
                          type="number"
                          step="any"
                          min={0}
                          value={s.weightKg ?? ''}
                          onChange={(e) =>
                            updateSet(ex.tempId, s.tempId, {
                              weightKg: e.target.value === '' ? null : Number(e.target.value),
                            })
                          }
                          placeholder="0"
                          className="input-field !py-1.5 text-sm"
                        />
                      </div>
                      <div className="col-span-3">
                        <input
                          type="number"
                          min={0}
                          max={500}
                          required
                          value={s.reps}
                          onChange={(e) =>
                            updateSet(ex.tempId, s.tempId, { reps: Number(e.target.value) })
                          }
                          className="input-field !py-1.5 text-sm"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          step="0.5"
                          min={1}
                          max={10}
                          value={s.rpe ?? ''}
                          onChange={(e) =>
                            updateSet(ex.tempId, s.tempId, {
                              rpe: e.target.value === '' ? null : Number(e.target.value),
                            })
                          }
                          placeholder="—"
                          className="input-field !py-1.5 text-sm"
                        />
                      </div>
                      <div className="col-span-2 flex gap-1">
                        <button
                          type="button"
                          onClick={() => updateSet(ex.tempId, s.tempId, { isWarmup: !s.isWarmup })}
                          className={`flex-1 text-[10px] font-bold uppercase tracking-wider px-1 py-1.5 rounded
                                      ${s.isWarmup ? 'bg-yellow-100 text-yellow-700' : 'bg-surface-100 text-surface-500 hover:bg-surface-200'}`}
                          title="Calentamiento"
                        >
                          W
                        </button>
                        <button
                          type="button"
                          onClick={() => updateSet(ex.tempId, s.tempId, { isFailure: !s.isFailure })}
                          className={`flex-1 text-[10px] font-bold uppercase tracking-wider px-1 py-1.5 rounded
                                      ${s.isFailure ? 'bg-red-100 text-red-700' : 'bg-surface-100 text-surface-500 hover:bg-surface-200'}`}
                          title="Fallo muscular"
                        >
                          F
                        </button>
                      </div>
                      <div className="col-span-1 flex gap-1">
                        <button
                          type="button"
                          onClick={() => duplicateSet(ex.tempId, s.tempId)}
                          className="text-surface-400 hover:text-brand-600 p-1"
                          title="Duplicar"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeSet(ex.tempId, s.tempId)}
                          className="text-surface-400 hover:text-red-500 p-1"
                          title="Eliminar"
                          disabled={ex.sets.length === 1}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => addSet(ex.tempId)}
                  className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-brand-600 hover:text-brand-700"
                >
                  <Plus className="w-4 h-4" /> Añadir serie
                </button>
                <input
                  type="text"
                  value={ex.notes}
                  onChange={(e) =>
                    setExercises((prev) =>
                      prev.map((x) => (x.tempId === ex.tempId ? { ...x, notes: e.target.value } : x))
                    )
                  }
                  placeholder="Notas del ejercicio (opcional)"
                  maxLength={500}
                  className="input-field !py-2 text-sm mt-3"
                />
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={() => setShowPicker(true)}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border-2 border-dashed border-surface-300 text-surface-600 hover:border-brand-400 hover:text-brand-600 hover:bg-brand-50/40 transition-all font-semibold"
          >
            <Plus className="w-5 h-5" /> Añadir ejercicio
          </button>
        </section>

        {/* Footer */}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4">
          <Button type="button" variant="ghost" onClick={() => navigate(-1)} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" loading={submitting} leftIcon={<Save className="w-4 h-4" />}>
            Guardar entrenamiento
          </Button>
        </div>
      </form>

      <ExercisePicker
        open={showPicker}
        onClose={() => setShowPicker(false)}
        onPick={addExercise}
      />
    </div>
  );
}

// ─── Exercise picker modal ────────────────────────────────────────────────

function ExercisePicker({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (ex: Exercise) => void;
}) {
  const [search, setSearch] = useState('');
  const [muscle, setMuscle] = useState<MuscleGroup | ''>('');
  const [equipment, setEquipment] = useState<Equipment | ''>('');
  const [items, setItems] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    exercisesService
      .list({
        search: search || undefined,
        muscle: muscle || undefined,
        equipment: equipment || undefined,
      })
      .then((r) => setItems(r.items))
      .finally(() => setLoading(false));
  }, [open, search, muscle, equipment]);

  return (
    <Modal isOpen={open} onClose={onClose} size="xl" title="Añadir ejercicio">
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar ejercicio..."
            className="input-field pl-10"
            autoFocus
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <select
            value={muscle}
            onChange={(e) => setMuscle(e.target.value as MuscleGroup | '')}
            className="input-field !py-2"
          >
            <option value="">Todos los músculos</option>
            {ALL_MUSCLES.map((m) => (
              <option key={m} value={m}>{MUSCLE_LABELS[m]}</option>
            ))}
          </select>
          <select
            value={equipment}
            onChange={(e) => setEquipment(e.target.value as Equipment | '')}
            className="input-field !py-2"
          >
            <option value="">Todo el equipamiento</option>
            {ALL_EQUIPMENT.map((e) => (
              <option key={e} value={e}>{EQUIPMENT_LABELS[e]}</option>
            ))}
          </select>
        </div>

        <div className="max-h-[420px] overflow-y-auto -mx-2 px-2 space-y-1">
          {loading ? (
            <p className="text-center text-sm text-surface-500 py-8">Cargando...</p>
          ) : items.length === 0 ? (
            <p className="text-center text-sm text-surface-500 py-8">No se encontraron ejercicios</p>
          ) : (
            items.map((ex) => (
              <button
                key={ex.id}
                type="button"
                onClick={() => onPick(ex)}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-surface-100 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center">
                  <Dumbbell className="w-4 h-4 text-brand-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-surface-900 text-sm truncate">{ex.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <MuscleBadge muscle={ex.primary_muscle} size="sm" />
                    <span className="text-[10px] text-surface-500">{EQUIPMENT_LABELS[ex.equipment]}</span>
                  </div>
                </div>
                <Plus className="w-4 h-4 text-surface-400" />
              </button>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
}
