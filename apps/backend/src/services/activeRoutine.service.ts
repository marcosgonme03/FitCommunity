/**
 * Servicio de "rutina activa": permite que un usuario active una rutina IA y
 * que cada sesión que toque (modo secuencial) salga pre-rellenada como
 * borrador en /workouts/new.
 *
 * Diseño:
 *  - Una sola rutina activa por usuario (controlado en activate()).
 *  - Modo secuencial: el día actual se guarda en current_day_idx (0-indexed).
 *    Avanza al guardar un workout y vuelve a 0 al pasar el último día.
 *  - Los nombres de ejercicios del JSON de la IA se intentan matchear contra
 *    el catálogo real (exercises.name) por similitud. Los que no matchean se
 *    devuelven como `unmatched` para avisar al usuario.
 *  - Para cada ejercicio matcheado se sugiere peso y reps a partir del último
 *    workout del usuario con ese mismo ejercicio (si existe). Si no, se usan
 *    los valores de la IA (sin peso, reps según rango).
 */

import { prisma } from '../lib/prisma';

// ─── Tipos del JSON que devuelve la IA ─────────────────────────────────────

export interface RoutinePlanExercise {
  name: string;
  sets: number;
  reps: string | number; // "6-8" o 10
  rest_sec?: number;
  notes?: string;
}

export interface RoutinePlanDay {
  day: number;
  focus: string;
  warmup?: string;
  exercises: RoutinePlanExercise[];
  cooldown?: string;
}

export interface RoutinePlanJson {
  title?: string;
  summary?: string;
  weekly_plan: RoutinePlanDay[];
  tips?: string[];
}

// ─── Tipos de la sesión de hoy (la respuesta del endpoint) ─────────────────

export interface PrefilledSet {
  setNumber: number;
  reps: number;
  weightKg: number | null;
  rpe: null;
  isWarmup: boolean;
  isFailure: boolean;
  restSec: number | null;
  notes: string | null;
}

export interface PrefilledExercise {
  exerciseId: string;
  exerciseName: string;
  primaryMuscle: string;
  equipment: string;
  notes: string | null;
  sets: PrefilledSet[];
  /** Si los pesos vienen del último workout del usuario en lugar de la IA */
  fromHistory: boolean;
}

export interface UnmatchedExercise {
  name: string;
  sets: number;
  reps: string | number;
  notes?: string;
  /** Sugerencias del catálogo (top 3) por si el usuario quiere elegir manualmente */
  suggestions: Array<{ id: string; name: string; primary_muscle: string }>;
}

export interface TodaySession {
  routineId: string;
  routineTitle: string;
  totalDays: number;
  dayIdx: number;
  day: RoutinePlanDay;
  /** Título sugerido para el workout (ej: "Día 2 — Empuje") */
  suggestedTitle: string;
  /** Duración estimada del plan IA */
  estimatedMinutes: number;
  /** Ejercicios pre-rellenados con exercise_id real y pesos sugeridos */
  exercises: PrefilledExercise[];
  /** Ejercicios del plan que no encontramos en el catálogo */
  unmatched: UnmatchedExercise[];
}

// ─── Utilidades de matching ────────────────────────────────────────────────

/**
 * Normaliza un nombre de ejercicio para comparar: minúsculas, sin acentos,
 * sin caracteres especiales, sin palabras de relleno.
 */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // sin acentos
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const STOP_WORDS = new Set([
  'con', 'de', 'la', 'el', 'en', 'a', 'al', 'los', 'las', 'una', 'un',
  'y', 'o', 'para', 'por', 'sin', 'sobre',
]);

function tokens(s: string): Set<string> {
  return new Set(
    normalize(s)
      .split(' ')
      .filter((t) => t.length > 1 && !STOP_WORDS.has(t))
  );
}

/** Similitud Jaccard entre dos sets de tokens (0 = nada, 1 = idéntico) */
function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const t of a) if (b.has(t)) intersection++;
  const union = a.size + b.size - intersection;
  return intersection / union;
}

/**
 * Busca el mejor match en el catálogo para un nombre dado. Devuelve null si
 * ningún candidato supera el threshold mínimo.
 */
function findBestMatch(
  aiName: string,
  catalog: Array<{ id: string; name: string; primary_muscle: string; equipment: string }>,
  threshold = 0.5
): { id: string; name: string; primary_muscle: string; equipment: string; score: number } | null {
  const aiTokens = tokens(aiName);
  let best: { id: string; name: string; primary_muscle: string; equipment: string; score: number } | null = null;

  for (const ex of catalog) {
    const score = jaccard(aiTokens, tokens(ex.name));
    if (score > (best?.score ?? -1)) {
      best = { ...ex, score };
    }
  }

  if (!best || best.score < threshold) return null;
  return best;
}

/**
 * Top N candidatos para sugerir al usuario cuando no encontramos un match
 * suficientemente bueno.
 */
function topSuggestions(
  aiName: string,
  catalog: Array<{ id: string; name: string; primary_muscle: string }>,
  n = 3
): Array<{ id: string; name: string; primary_muscle: string }> {
  const aiTokens = tokens(aiName);
  return catalog
    .map((ex) => ({ ex, score: jaccard(aiTokens, tokens(ex.name)) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, n)
    .map((x) => ({ id: x.ex.id, name: x.ex.name, primary_muscle: x.ex.primary_muscle }));
}

// ─── Parsing de reps de la IA ──────────────────────────────────────────────

/**
 * Convierte "6-8", "10", "8 a 12" en un número (extremo superior por defecto
 * para que el usuario lo baje si es necesario).
 */
function parseReps(input: string | number): number {
  if (typeof input === 'number') return Math.max(0, Math.min(500, Math.floor(input)));
  const cleaned = String(input).replace(/[^0-9-]/g, '');
  const parts = cleaned.split('-').filter(Boolean).map(Number).filter((n) => !Number.isNaN(n));
  if (parts.length === 0) return 8; // default razonable
  // Tomamos el extremo superior del rango (ej: "6-8" → 8)
  return Math.max(0, Math.min(500, Math.floor(parts[parts.length - 1])));
}

// ─── Service ────────────────────────────────────────────────────────────────

export const activeRoutineService = {
  /**
   * Marca una rutina como activa. Desactiva cualquier otra del mismo usuario.
   * Si ya estaba activa, la deja como está pero no resetea current_day_idx.
   */
  async activate(userId: string, routineId: string): Promise<{ activated: boolean }> {
    const routine = await prisma.generatedRoutine.findFirst({
      where: { id: routineId, user_id: userId },
    });
    if (!routine) return { activated: false };

    await prisma.$transaction([
      // Desactivar cualquier otra del usuario
      prisma.generatedRoutine.updateMany({
        where: { user_id: userId, is_active: true, NOT: { id: routineId } },
        data: { is_active: false },
      }),
      // Activar la pedida (si era nueva, registrar started_at y resetear day idx)
      prisma.generatedRoutine.update({
        where: { id: routineId },
        data: {
          is_active: true,
          started_at: routine.is_active ? routine.started_at : new Date(),
          current_day_idx: routine.is_active ? routine.current_day_idx : 0,
        },
      }),
    ]);

    return { activated: true };
  },

  /** Desactiva la rutina activa actual (si la hay) */
  async deactivate(userId: string): Promise<{ deactivated: boolean }> {
    const result = await prisma.generatedRoutine.updateMany({
      where: { user_id: userId, is_active: true },
      data: { is_active: false },
    });
    return { deactivated: result.count > 0 };
  },

  /** Devuelve la rutina activa del usuario (sin la sesión computada) */
  async getActive(userId: string) {
    return prisma.generatedRoutine.findFirst({
      where: { user_id: userId, is_active: true },
    });
  },

  /**
   * Avanza al siguiente día de la rotación (con wrap). Llamar tras guardar
   * un workout que se hizo siguiendo la rutina.
   */
  async advance(userId: string): Promise<{ newDayIdx: number } | null> {
    const active = await prisma.generatedRoutine.findFirst({
      where: { user_id: userId, is_active: true },
    });
    if (!active) return null;

    const plan = active.plan_json as unknown as RoutinePlanJson;
    const totalDays = Array.isArray(plan?.weekly_plan) ? plan.weekly_plan.length : 0;
    if (totalDays === 0) return { newDayIdx: 0 };

    const next = (active.current_day_idx + 1) % totalDays;
    await prisma.generatedRoutine.update({
      where: { id: active.id },
      data: { current_day_idx: next },
    });
    return { newDayIdx: next };
  },

  /**
   * Construye la sesión de hoy: ejercicios matcheados con el catálogo +
   * pesos sugeridos del histórico del usuario. Devuelve null si no hay
   * rutina activa.
   */
  async getTodaySession(userId: string): Promise<TodaySession | null> {
    const active = await prisma.generatedRoutine.findFirst({
      where: { user_id: userId, is_active: true },
    });
    if (!active) return null;

    const plan = active.plan_json as unknown as RoutinePlanJson;
    if (!plan?.weekly_plan || plan.weekly_plan.length === 0) return null;

    const dayIdx = Math.min(active.current_day_idx, plan.weekly_plan.length - 1);
    const day = plan.weekly_plan[dayIdx];

    // Cargamos el catálogo (ejercicios no custom) una sola vez
    const catalog = await prisma.exercise.findMany({
      where: { is_custom: false },
      select: { id: true, name: true, primary_muscle: true, equipment: true },
    });

    const matched: PrefilledExercise[] = [];
    const unmatched: UnmatchedExercise[] = [];

    for (const ex of day.exercises ?? []) {
      const match = findBestMatch(ex.name, catalog);
      if (!match) {
        unmatched.push({
          name: ex.name,
          sets: ex.sets,
          reps: ex.reps,
          notes: ex.notes,
          suggestions: topSuggestions(ex.name, catalog),
        });
        continue;
      }

      const targetReps = parseReps(ex.reps);
      const setsCount = Math.max(1, Math.min(20, ex.sets ?? 3));

      // Buscar el último set del usuario para este ejercicio (no-warmup, con peso)
      const lastSet = await prisma.workoutSet.findFirst({
        where: {
          is_warmup: false,
          weight_kg: { not: null, gt: 0 },
          workout_exercise: {
            exercise_id: match.id,
            workout: { user_id: userId },
          },
        },
        orderBy: { workout_exercise: { workout: { workout_date: 'desc' } } },
        select: { weight_kg: true, reps: true },
      });

      const weightSuggestion = lastSet?.weight_kg ?? null;
      const repsSuggestion = lastSet?.reps ?? targetReps;

      const sets: PrefilledSet[] = Array.from({ length: setsCount }, (_, i) => ({
        setNumber: i + 1,
        reps: repsSuggestion,
        weightKg: weightSuggestion,
        rpe: null,
        isWarmup: false,
        isFailure: false,
        restSec: ex.rest_sec ?? 90,
        notes: null,
      }));

      matched.push({
        exerciseId: match.id,
        exerciseName: match.name,
        primaryMuscle: match.primary_muscle,
        equipment: match.equipment,
        notes: ex.notes ?? null,
        sets,
        fromHistory: lastSet !== null,
      });
    }

    const focus = day.focus?.trim() || `Día ${dayIdx + 1}`;
    return {
      routineId: active.id,
      routineTitle: active.title,
      totalDays: plan.weekly_plan.length,
      dayIdx,
      day,
      suggestedTitle: `Día ${dayIdx + 1} — ${focus}`,
      estimatedMinutes: active.session_minutes,
      exercises: matched,
      unmatched,
    };
  },
};
