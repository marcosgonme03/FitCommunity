/**
 * Modo "Sesión en vivo": pantalla optimizada para registrar el entrenamiento
 * MIENTRAS lo haces (no después). Convierte la app de logger pasivo a
 * compañero activo en el gym.
 *
 * Funcionalidades:
 *  - Vista grande del ejercicio actual y serie actual
 *  - Pre-rellenado desde la rutina activa (recibido via location.state) o desde
 *    una nueva sesión vacía si el usuario llega directo
 *  - Cronómetro de descanso entre series con barra de progreso visual,
 *    sonido (Web Audio) y vibración (Vibration API)
 *  - Navegación rápida set→set y ejercicio→ejercicio
 *  - Saltar descanso, marcar fallo, marcar calentamiento
 *  - Pantalla de resumen al terminar y guardado como Workout normal
 *
 * Entrada:
 *  - location.state.prefill: TodaySession (de aiService.getActiveRoutineToday)
 *  - location.state.draft: WorkoutDraft simple si el usuario quiere empezar a mano
 *
 * Salida:
 *  - Tras "Finalizar y guardar" → llama a workoutsService.create y navega a /workouts/:id
 *  - "Cambiar a modo formulario" → navega a /workouts/new manteniendo el prefill
 */

import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  SkipForward, X, Check, Flame, Save, ArrowLeft, ArrowRight,
  Timer, Volume2, VolumeX, Clock, Activity, AlertCircle, FileText,
} from 'lucide-react';
import workoutsService, {
  CreateWorkoutPayload, CreateWorkoutSetPayload,
} from '../../services/workouts.service';
import aiService, { TodaySession } from '../../services/ai.service';
import { IntensityLevel, MuscleGroup, Equipment } from '../../types';
import Button from '../../components/ui/Button';
import { ALL_INTENSITIES, INTENSITY_LABELS, INTENSITY_COLORS } from '../../lib/muscles';
import { toast } from '../../components/ui/Toast';

// ─── Modelo del estado en vivo ────────────────────────────────────────────

interface LiveSet {
  setNumber: number;
  /** Sugerencias iniciales (de prefill o histórico) */
  targetReps: number;
  targetWeight: number | null;
  /** Lo que el usuario realmente hace */
  actualReps: number;
  actualWeight: number | null;
  rpe: number | null;
  isWarmup: boolean;
  isFailure: boolean;
  restSec: number;
  completed: boolean;
  notes: string | null;
}

interface LiveExercise {
  exerciseId: string;
  exerciseName: string;
  primaryMuscle: MuscleGroup;
  equipment: Equipment;
  notes: string;
  sets: LiveSet[];
}

type LiveAction =
  | { type: 'UPDATE_SET'; exIdx: number; setIdx: number; patch: Partial<LiveSet> }
  | { type: 'COMPLETE_SET'; exIdx: number; setIdx: number }
  | { type: 'UNCOMPLETE_SET'; exIdx: number; setIdx: number }
  | { type: 'ADD_SET'; exIdx: number }
  | { type: 'GO_TO'; exIdx: number; setIdx: number };

interface LiveState {
  exercises: LiveExercise[];
  currentExIdx: number;
  currentSetIdx: number;
}

function reducer(state: LiveState, action: LiveAction): LiveState {
  switch (action.type) {
    case 'UPDATE_SET': {
      const exercises = state.exercises.map((ex, i) =>
        i !== action.exIdx
          ? ex
          : {
              ...ex,
              sets: ex.sets.map((s, j) => (j === action.setIdx ? { ...s, ...action.patch } : s)),
            }
      );
      return { ...state, exercises };
    }
    case 'COMPLETE_SET': {
      const exercises = state.exercises.map((ex, i) =>
        i !== action.exIdx
          ? ex
          : {
              ...ex,
              sets: ex.sets.map((s, j) => (j === action.setIdx ? { ...s, completed: true } : s)),
            }
      );
      // Avanzar al siguiente set/ejercicio si hay
      let nextEx = action.exIdx;
      let nextSet = action.setIdx + 1;
      const ex = exercises[action.exIdx];
      if (nextSet >= ex.sets.length) {
        nextEx = action.exIdx + 1;
        nextSet = 0;
      }
      if (nextEx >= exercises.length) {
        // Estamos en el último set del último ejercicio: dejamos los índices como estaban
        nextEx = action.exIdx;
        nextSet = action.setIdx;
      }
      return { ...state, exercises, currentExIdx: nextEx, currentSetIdx: nextSet };
    }
    case 'UNCOMPLETE_SET': {
      const exercises = state.exercises.map((ex, i) =>
        i !== action.exIdx
          ? ex
          : {
              ...ex,
              sets: ex.sets.map((s, j) => (j === action.setIdx ? { ...s, completed: false } : s)),
            }
      );
      return { ...state, exercises };
    }
    case 'ADD_SET': {
      const exercises = state.exercises.map((ex, i) => {
        if (i !== action.exIdx) return ex;
        const last = ex.sets[ex.sets.length - 1];
        const nextNum = ex.sets.length + 1;
        const newSet: LiveSet = {
          setNumber: nextNum,
          targetReps: last?.targetReps ?? 8,
          targetWeight: last?.targetWeight ?? null,
          actualReps: last?.actualReps ?? last?.targetReps ?? 8,
          actualWeight: last?.actualWeight ?? last?.targetWeight ?? null,
          rpe: null,
          isWarmup: false,
          isFailure: false,
          restSec: last?.restSec ?? 90,
          completed: false,
          notes: null,
        };
        return { ...ex, sets: [...ex.sets, newSet] };
      });
      return { ...state, exercises };
    }
    case 'GO_TO': {
      const exercises = state.exercises;
      const exIdx = Math.max(0, Math.min(action.exIdx, exercises.length - 1));
      const setIdx = Math.max(0, Math.min(action.setIdx, exercises[exIdx].sets.length - 1));
      return { ...state, currentExIdx: exIdx, currentSetIdx: setIdx };
    }
    default:
      return state;
  }
}

// ─── Helpers de audio / vibración ─────────────────────────────────────────

/** Pita corto al terminar el descanso. Sin assets externos. */
function playBeep(soundEnabled: boolean): void {
  if (!soundEnabled) return;
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
    osc.start();
    osc.stop(ctx.currentTime + 0.65);
    // Segundo beep tras 200ms para que sea reconocible
    setTimeout(() => {
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1100, ctx.currentTime);
      gain2.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain2.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02);
      gain2.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
      osc2.start();
      osc2.stop(ctx.currentTime + 0.65);
    }, 250);
  } catch {
    // Silenciado si el navegador no permite audio
  }
}

function vibrate(): void {
  if (typeof navigator === 'undefined') return;
  const nav = navigator as Navigator & { vibrate?: (p: number | number[]) => boolean };
  nav.vibrate?.([200, 80, 200]);
}

// ─── Construcción del estado inicial ──────────────────────────────────────

function buildInitialFromPrefill(prefill: TodaySession): LiveState {
  return {
    exercises: prefill.exercises.map((pex) => ({
      exerciseId: pex.exerciseId,
      exerciseName: pex.exerciseName,
      primaryMuscle: pex.primaryMuscle as MuscleGroup,
      equipment: pex.equipment as Equipment,
      notes: pex.notes ?? '',
      sets: pex.sets.map((s) => ({
        setNumber: s.setNumber,
        targetReps: s.reps,
        targetWeight: s.weightKg,
        actualReps: s.reps,
        actualWeight: s.weightKg,
        rpe: null,
        isWarmup: s.isWarmup,
        isFailure: s.isFailure,
        restSec: s.restSec ?? 90,
        completed: false,
        notes: s.notes ?? null,
      })),
    })),
    currentExIdx: 0,
    currentSetIdx: 0,
  };
}

// ─── Componente principal ─────────────────────────────────────────────────

export default function LiveWorkoutPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const prefill = (location.state as { prefill?: TodaySession } | null)?.prefill ?? null;

  // Si entran sin prefill, redirige al formulario clásico (no tiene sentido modo en vivo vacío)
  useEffect(() => {
    if (!prefill) {
      navigate('/workouts/new', { replace: true });
    }
  }, [prefill, navigate]);

  const [state, dispatch] = useReducer(
    reducer,
    null,
    () => prefill ? buildInitialFromPrefill(prefill) : ({ exercises: [], currentExIdx: 0, currentSetIdx: 0 } satisfies LiveState)
  );

  // Metadata del workout (tono y datos cabecera)
  const [workoutTitle] = useState(prefill?.suggestedTitle ?? 'Sesión en vivo');
  const [intensity, setIntensity] = useState<IntensityLevel>('HIGH');
  const [notes, setNotes] = useState('');

  // Inicio de la sesión
  const startedAtRef = useRef(Date.now());
  const [elapsedSec, setElapsedSec] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - startedAtRef.current) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Cronómetro de descanso
  const [restEndsAt, setRestEndsAt] = useState<number | null>(null);
  const [restRemaining, setRestRemaining] = useState(0);
  const [restTotal, setRestTotal] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const beepedRef = useRef(false);

  useEffect(() => {
    if (!restEndsAt) return;
    const id = setInterval(() => {
      const ms = restEndsAt - Date.now();
      const sec = Math.max(0, Math.ceil(ms / 1000));
      setRestRemaining(sec);
      if (sec === 0 && !beepedRef.current) {
        beepedRef.current = true;
        playBeep(soundEnabled);
        vibrate();
        // Auto-cerrar el cronómetro tras 1s
        setTimeout(() => {
          setRestEndsAt(null);
          beepedRef.current = false;
        }, 1500);
      }
    }, 100);
    return () => clearInterval(id);
  }, [restEndsAt, soundEnabled]);

  function startRest(seconds: number) {
    if (seconds <= 0) return;
    beepedRef.current = false;
    setRestTotal(seconds);
    setRestRemaining(seconds);
    setRestEndsAt(Date.now() + seconds * 1000);
  }

  function skipRest() {
    setRestEndsAt(null);
    beepedRef.current = false;
    setRestRemaining(0);
  }

  // ─── Datos derivados ────────────────────────────────────────────────────
  const totalSets = useMemo(
    () => state.exercises.reduce((sum, ex) => sum + ex.sets.length, 0),
    [state.exercises]
  );
  const completedSets = useMemo(
    () => state.exercises.reduce((sum, ex) => sum + ex.sets.filter((s) => s.completed).length, 0),
    [state.exercises]
  );
  const totalVolume = useMemo(() => {
    let vol = 0;
    for (const ex of state.exercises) {
      for (const s of ex.sets) {
        if (s.completed && !s.isWarmup) vol += (s.actualWeight ?? 0) * s.actualReps;
      }
    }
    return Math.round(vol);
  }, [state.exercises]);

  const currentExercise = state.exercises[state.currentExIdx];
  const currentSet = currentExercise?.sets[state.currentSetIdx];
  const allDone = completedSets === totalSets && totalSets > 0;

  // ─── Acciones ─────────────────────────────────────────────────────────
  function completeCurrentSet() {
    if (!currentSet) return;
    dispatch({ type: 'COMPLETE_SET', exIdx: state.currentExIdx, setIdx: state.currentSetIdx });
    // Lanzar descanso solo si NO es el último set del último ejercicio
    const isLast =
      state.currentExIdx === state.exercises.length - 1 &&
      state.currentSetIdx === currentExercise.sets.length - 1;
    if (!isLast) startRest(currentSet.restSec ?? 90);
  }

  const [submitting, setSubmitting] = useState(false);
  async function finishAndSave() {
    if (submitting) return;
    setSubmitting(true);
    try {
      // Construir payload normal de Workout
      const exercises = state.exercises
        .map((ex, idx) => ({
          exerciseId: ex.exerciseId,
          orderIdx: idx,
          notes: ex.notes || null,
          sets: ex.sets
            .filter((s) => s.completed) // solo guardamos los completados
            .map((s, i): CreateWorkoutSetPayload => ({
              setNumber: i + 1,
              reps: Number(s.actualReps),
              weightKg: s.actualWeight == null ? null : Number(s.actualWeight),
              rpe: s.rpe == null ? null : Number(s.rpe),
              isWarmup: !!s.isWarmup,
              isFailure: !!s.isFailure,
              restSec: s.restSec ?? null,
              notes: s.notes,
            })),
        }))
        .filter((ex) => ex.sets.length > 0); // filtramos ejercicios sin ningún set completado

      if (exercises.length === 0) {
        toast.error('Sin sets completados', 'Marca al menos una serie como completada antes de guardar.');
        setSubmitting(false);
        return;
      }

      const durationMin = Math.max(1, Math.round(elapsedSec / 60));

      const payload: CreateWorkoutPayload = {
        title: workoutTitle,
        notes: notes || null,
        durationMin,
        intensity,
        isPublic: true,
        workoutDate: new Date().toISOString(),
        exercises,
      };

      const created = await workoutsService.create(payload);

      // Si venía de rutina activa, avanzar al siguiente día
      if (prefill?.routineId) {
        try {
          await aiService.advanceActiveRoutine();
        } catch { /* no rompemos el flujo si falla */ }
      }

      toast.success('¡Entrenamiento guardado!', `${completedSets} series · ${durationMin} min`);
      navigate(`/workouts/${created.id}`);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string; message?: string } } };
      toast.error('No se pudo guardar', e?.response?.data?.message ?? e?.response?.data?.error ?? 'Error desconocido');
      setSubmitting(false);
    }
  }

  function switchToFormMode() {
    if (!prefill) return;
    if (!confirm('¿Cambiar al modo formulario? Perderás los sets que hayas completado en este modo en vivo.')) return;
    navigate('/workouts/new', { state: { prefill }, replace: true });
  }

  function exitWithoutSaving() {
    if (completedSets === 0) {
      navigate('/dashboard', { replace: true });
      return;
    }
    if (confirm(`Llevas ${completedSets} series completadas. ¿Salir sin guardar?`)) {
      navigate('/dashboard', { replace: true });
    }
  }

  if (!prefill || state.exercises.length === 0) {
    return null; // El useEffect ya redirige
  }

  // ─── Render ─────────────────────────────────────────────────────────────

  const restProgress = restTotal > 0 ? ((restTotal - restRemaining) / restTotal) * 100 : 0;
  const overallProgress = totalSets > 0 ? (completedSets / totalSets) * 100 : 0;

  return (
    <div className="min-h-screen bg-surface-50">
      {/* Header sticky */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-surface-200">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={exitWithoutSaving}
            className="p-2 -ml-2 rounded-lg text-surface-600 hover:text-surface-900 hover:bg-surface-100 transition-colors"
            aria-label="Salir"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-surface-900 truncate">{workoutTitle}</p>
            <div className="flex items-center gap-3 text-xs text-surface-500 tabular-nums">
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatHMS(elapsedSec)}
              </span>
              <span>·</span>
              <span>{completedSets}/{totalSets} series</span>
              <span>·</span>
              <span>{totalVolume} kg vol.</span>
            </div>
          </div>
          <button
            onClick={() => setSoundEnabled((v) => !v)}
            className="p-2 rounded-lg text-surface-600 hover:text-surface-900 hover:bg-surface-100 transition-colors"
            title={soundEnabled ? 'Silenciar' : 'Activar sonido'}
          >
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
        </div>
        {/* Barra de progreso global */}
        <div className="h-1 w-full bg-surface-100">
          <div
            className="h-full bg-gradient-to-r from-brand-400 to-brand-600 transition-all"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-5 space-y-4">
        {/* Vista del ejercicio actual + sus sets */}
        {currentExercise && (
          <CurrentExerciseCard
            exercise={currentExercise}
            exIdx={state.currentExIdx}
            totalExercises={state.exercises.length}
            currentSetIdx={state.currentSetIdx}
            onUpdateSet={(setIdx, patch) =>
              dispatch({ type: 'UPDATE_SET', exIdx: state.currentExIdx, setIdx, patch })
            }
            onCompleteSet={completeCurrentSet}
            onUncompleteSet={(setIdx) =>
              dispatch({ type: 'UNCOMPLETE_SET', exIdx: state.currentExIdx, setIdx })
            }
            onAddSet={() => dispatch({ type: 'ADD_SET', exIdx: state.currentExIdx })}
            onSelectSet={(setIdx) =>
              dispatch({ type: 'GO_TO', exIdx: state.currentExIdx, setIdx })
            }
          />
        )}

        {/* Navegación entre ejercicios */}
        <nav className="flex items-center justify-between gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={state.currentExIdx === 0}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
            onClick={() =>
              dispatch({ type: 'GO_TO', exIdx: state.currentExIdx - 1, setIdx: 0 })
            }
          >
            Anterior
          </Button>
          <p className="text-xs text-surface-500 font-semibold">
            Ejercicio {state.currentExIdx + 1} de {state.exercises.length}
          </p>
          <Button
            variant="outline"
            size="sm"
            disabled={state.currentExIdx === state.exercises.length - 1}
            rightIcon={<ArrowRight className="w-4 h-4" />}
            onClick={() =>
              dispatch({ type: 'GO_TO', exIdx: state.currentExIdx + 1, setIdx: 0 })
            }
          >
            Siguiente
          </Button>
        </nav>

        {/* Listado lateral del resto de ejercicios (para saltar rápido) */}
        <ExerciseList
          exercises={state.exercises}
          currentExIdx={state.currentExIdx}
          onSelect={(exIdx) => dispatch({ type: 'GO_TO', exIdx, setIdx: 0 })}
        />

        {/* Metadatos finales (intensidad + notas) */}
        <section className="bg-white border border-surface-200 rounded-2xl p-4 shadow-soft space-y-3">
          <div>
            <label className="label">Intensidad de la sesión</label>
            <div className="grid grid-cols-4 gap-2">
              {ALL_INTENSITIES.map((i) => {
                const c = INTENSITY_COLORS[i];
                const active = intensity === i;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setIntensity(i)}
                    className={`p-2 rounded-lg border text-xs font-bold transition-all
                                ${active
                                  ? `${c.bg} border-current ${c.text}`
                                  : 'bg-white border-surface-200 text-surface-600 hover:bg-surface-50'}`}
                  >
                    {INTENSITY_LABELS[i]}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="label">Notas de la sesión (opcional)</label>
            <textarea
              rows={2}
              maxLength={2000}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Sensaciones, lesiones, energía..."
              className="input-field resize-none"
            />
          </div>
        </section>

        {/* Footer de acciones */}
        <div className="sticky bottom-0 -mx-4 px-4 py-3 bg-white/95 backdrop-blur border-t border-surface-200 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
          <Button variant="ghost" leftIcon={<FileText className="w-4 h-4" />} onClick={switchToFormMode}>
            Modo formulario
          </Button>
          <Button
            leftIcon={<Save className="w-4 h-4" />}
            loading={submitting}
            onClick={finishAndSave}
            disabled={completedSets === 0}
          >
            {allDone ? 'Finalizar y guardar' : `Guardar (${completedSets}/${totalSets})`}
          </Button>
        </div>
      </main>

      {/* Cronómetro de descanso (overlay al final inferior centro) */}
      {restEndsAt && (
        <RestTimerOverlay
          remaining={restRemaining}
          total={restTotal}
          progress={restProgress}
          onSkip={skipRest}
          onAdjust={(delta) => {
            const newEnd = (restEndsAt ?? Date.now()) + delta * 1000;
            const newTotal = Math.max(0, restTotal + delta);
            setRestEndsAt(newEnd);
            setRestTotal(newTotal);
            beepedRef.current = false;
          }}
        />
      )}
    </div>
  );
}

// ─── Subcomponentes ──────────────────────────────────────────────────────

function CurrentExerciseCard({
  exercise,
  exIdx,
  totalExercises,
  currentSetIdx,
  onUpdateSet,
  onCompleteSet,
  onUncompleteSet,
  onAddSet,
  onSelectSet,
}: {
  exercise: LiveExercise;
  exIdx: number;
  totalExercises: number;
  currentSetIdx: number;
  onUpdateSet: (setIdx: number, patch: Partial<LiveSet>) => void;
  onCompleteSet: () => void;
  onUncompleteSet: (setIdx: number) => void;
  onAddSet: () => void;
  onSelectSet: (setIdx: number) => void;
}) {
  const currentSet = exercise.sets[currentSetIdx];
  if (!currentSet) return null;

  return (
    <section className="bg-white border border-surface-200 rounded-2xl shadow-soft overflow-hidden">
      {/* Cabecera del ejercicio */}
      <div className="px-5 py-4 border-b border-surface-200">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-brand-700 font-bold mb-1">
          <Activity className="w-3 h-3" />
          Ejercicio {exIdx + 1} / {totalExercises}
        </div>
        <h2 className="text-2xl font-extrabold text-surface-900">{exercise.exerciseName}</h2>
        {exercise.notes && (
          <p className="text-xs text-surface-600 mt-1.5 leading-relaxed">
            <AlertCircle className="inline w-3 h-3 mr-1 -mt-0.5" />
            {exercise.notes}
          </p>
        )}
      </div>

      {/* Set actual: inputs grandes */}
      <div className="px-5 py-5 bg-gradient-to-br from-brand-50 to-white border-b border-surface-200">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-surface-500 font-bold">Serie actual</p>
            <p className="text-xl font-extrabold text-surface-900">
              Set {currentSet.setNumber}
              {currentSet.isWarmup && (
                <span className="ml-2 inline-flex items-center text-[10px] font-bold uppercase tracking-wider bg-yellow-100 text-yellow-700 border border-yellow-200 px-1.5 py-0.5 rounded">
                  Calentamiento
                </span>
              )}
            </p>
          </div>
          {currentSet.completed ? (
            <button
              onClick={() => onUncompleteSet(currentSetIdx)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg"
            >
              <Check className="w-3.5 h-3.5" />
              Completada
            </button>
          ) : null}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <BigInput
            label="Peso (kg)"
            value={currentSet.actualWeight ?? ''}
            placeholder={currentSet.targetWeight?.toString() ?? '0'}
            type="number"
            step="any"
            min={0}
            onChange={(v) => onUpdateSet(currentSetIdx, { actualWeight: v === '' ? null : Number(v) })}
          />
          <BigInput
            label="Reps"
            value={currentSet.actualReps}
            placeholder={String(currentSet.targetReps)}
            type="number"
            min={0}
            max={500}
            onChange={(v) => onUpdateSet(currentSetIdx, { actualReps: v === '' ? 0 : Number(v) })}
          />
          <BigInput
            label="RPE (1-10)"
            value={currentSet.rpe ?? ''}
            placeholder="—"
            type="number"
            step="0.5"
            min={1}
            max={10}
            onChange={(v) => onUpdateSet(currentSetIdx, { rpe: v === '' ? null : Number(v) })}
          />
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] uppercase tracking-wider text-surface-500 font-bold">Descanso</span>
            <select
              value={currentSet.restSec}
              onChange={(e) => onUpdateSet(currentSetIdx, { restSec: Number(e.target.value) })}
              className="input-field !text-base !font-bold"
            >
              {[60, 90, 120, 150, 180, 240, 300].map((s) => (
                <option key={s} value={s}>
                  {s}s
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Toggles */}
        <div className="flex gap-2 mt-3">
          <button
            type="button"
            onClick={() => onUpdateSet(currentSetIdx, { isWarmup: !currentSet.isWarmup })}
            className={`text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg border transition-colors
                        ${currentSet.isWarmup
                          ? 'bg-yellow-100 text-yellow-700 border-yellow-200'
                          : 'bg-white text-surface-500 border-surface-200 hover:bg-surface-50'}`}
          >
            Calentamiento
          </button>
          <button
            type="button"
            onClick={() => onUpdateSet(currentSetIdx, { isFailure: !currentSet.isFailure })}
            className={`text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg border transition-colors
                        ${currentSet.isFailure
                          ? 'bg-red-100 text-red-700 border-red-200'
                          : 'bg-white text-surface-500 border-surface-200 hover:bg-surface-50'}`}
          >
            <Flame className="inline w-3 h-3 -mt-0.5 mr-1" />
            Al fallo
          </button>
        </div>

        {/* Botón principal */}
        <button
          type="button"
          onClick={onCompleteSet}
          disabled={currentSet.completed}
          className="w-full mt-4 inline-flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 active:bg-brand-700 disabled:bg-emerald-500 disabled:opacity-100 text-white font-extrabold text-base py-4 rounded-xl shadow-glow transition-all"
        >
          {currentSet.completed ? (
            <>
              <Check className="w-5 h-5" />
              Serie completada
            </>
          ) : (
            <>
              <Check className="w-5 h-5" />
              Completar serie
            </>
          )}
        </button>
      </div>

      {/* Lista de todas las series del ejercicio actual */}
      <div className="px-5 py-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] uppercase tracking-wider text-surface-500 font-bold">
            Todas las series
          </p>
          <button
            onClick={onAddSet}
            className="text-xs font-semibold text-brand-600 hover:text-brand-700"
          >
            + Añadir serie
          </button>
        </div>
        <div className="space-y-1.5">
          {exercise.sets.map((s, i) => {
            const isCurrent = i === currentSetIdx;
            return (
              <button
                key={i}
                type="button"
                onClick={() => onSelectSet(i)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors
                            ${isCurrent
                              ? 'bg-brand-50 border border-brand-300'
                              : s.completed
                                ? 'bg-emerald-50 border border-emerald-200 hover:bg-emerald-100'
                                : 'bg-surface-50 border border-surface-200 hover:bg-surface-100'}`}
              >
                <span className={`w-7 h-7 rounded-md flex items-center justify-center font-bold text-xs
                                 ${s.completed ? 'bg-emerald-500 text-white' : 'bg-white border border-surface-300 text-surface-700'}`}>
                  {s.completed ? <Check className="w-4 h-4" /> : s.setNumber}
                </span>
                <span className="flex-1 text-left text-surface-700 tabular-nums">
                  {s.actualWeight !== null ? `${s.actualWeight}kg` : '—'} × {s.actualReps} reps
                  {s.rpe ? ` · RPE ${s.rpe}` : ''}
                  {s.isWarmup && ' · Calentamiento'}
                  {s.isFailure && ' · Fallo'}
                </span>
                <span className="text-[10px] text-surface-500">{s.restSec}s</span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function ExerciseList({
  exercises,
  currentExIdx,
  onSelect,
}: {
  exercises: LiveExercise[];
  currentExIdx: number;
  onSelect: (idx: number) => void;
}) {
  return (
    <details className="bg-white border border-surface-200 rounded-2xl shadow-soft overflow-hidden">
      <summary className="px-5 py-3 cursor-pointer text-sm font-semibold text-surface-700 hover:bg-surface-50 transition-colors">
        Ver lista completa de ejercicios ({exercises.length})
      </summary>
      <ul className="divide-y divide-surface-100 max-h-72 overflow-y-auto">
        {exercises.map((ex, i) => {
          const completed = ex.sets.filter((s) => s.completed).length;
          const total = ex.sets.length;
          const isCurrent = i === currentExIdx;
          return (
            <li key={i}>
              <button
                onClick={() => onSelect(i)}
                className={`w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-surface-50 transition-colors
                            ${isCurrent ? 'bg-brand-50' : ''}`}
              >
                <span className="w-7 h-7 rounded-md bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-xs shrink-0">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold truncate ${isCurrent ? 'text-brand-700' : 'text-surface-900'}`}>
                    {ex.exerciseName}
                  </p>
                  <p className="text-[11px] text-surface-500">
                    {completed}/{total} series · {ex.primaryMuscle}
                  </p>
                </div>
                {completed === total && total > 0 && (
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </details>
  );
}

function RestTimerOverlay({
  remaining,
  total,
  progress,
  onSkip,
  onAdjust,
}: {
  remaining: number;
  total: number;
  progress: number;
  onSkip: () => void;
  onAdjust: (delta: number) => void;
}) {
  const ended = remaining === 0;
  return (
    <div className="fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-md animate-slide-up">
      <div className={`relative bg-white border-2 rounded-2xl shadow-2xl overflow-hidden
                       ${ended ? 'border-emerald-400' : 'border-brand-400'}`}>
        {/* Barra de progreso de fondo */}
        <div
          className={`absolute inset-y-0 left-0 transition-all
                      ${ended ? 'bg-emerald-50' : 'bg-brand-50'}`}
          style={{ width: `${progress}%` }}
        />
        <div className="relative px-5 py-4 flex items-center gap-3">
          <Timer className={`w-6 h-6 shrink-0 ${ended ? 'text-emerald-600' : 'text-brand-600'}`} />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-surface-500 font-bold">
              {ended ? 'Descanso terminado' : 'Descansando'}
            </p>
            <p className={`text-2xl font-extrabold tabular-nums ${ended ? 'text-emerald-700' : 'text-surface-900'}`}>
              {formatMS(remaining)} <span className="text-sm text-surface-500 font-normal">/ {formatMS(total)}</span>
            </p>
          </div>
          {!ended && (
            <div className="flex gap-1">
              <button
                onClick={() => onAdjust(-15)}
                className="px-2 py-1 rounded-md bg-white border border-surface-200 text-xs font-bold text-surface-700 hover:bg-surface-50 transition-colors"
                title="Restar 15s"
              >
                −15s
              </button>
              <button
                onClick={() => onAdjust(15)}
                className="px-2 py-1 rounded-md bg-white border border-surface-200 text-xs font-bold text-surface-700 hover:bg-surface-50 transition-colors"
                title="Sumar 15s"
              >
                +15s
              </button>
            </div>
          )}
          <button
            onClick={onSkip}
            className={`p-2 rounded-lg transition-colors
                       ${ended
                         ? 'text-emerald-700 hover:bg-emerald-100'
                         : 'text-surface-600 hover:text-surface-900 hover:bg-surface-100'}`}
            title={ended ? 'Cerrar' : 'Saltar descanso'}
          >
            {ended ? <Check className="w-5 h-5" /> : <SkipForward className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}

function BigInput({
  label,
  value,
  placeholder,
  type,
  step,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number | string;
  placeholder?: string;
  type: string;
  step?: string;
  min?: number;
  max?: number;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] uppercase tracking-wider text-surface-500 font-bold">{label}</span>
      <input
        type={type}
        step={step}
        min={min}
        max={max}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="input-field !text-2xl !font-extrabold !text-center !py-2 tabular-nums"
      />
    </div>
  );
}

// ─── Utilidades de tiempo ─────────────────────────────────────────────────

function formatHMS(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}
function formatMS(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

