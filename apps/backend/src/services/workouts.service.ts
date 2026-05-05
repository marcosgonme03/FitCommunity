import { Prisma, IntensityLevel, MuscleGroup } from '@prisma/client';
import { prisma } from '../lib/prisma';
import {
  CreateWorkoutInput,
  UpdateWorkoutInput,
  WorkoutExerciseInput,
} from '../validators/workouts.validators';
import { cached, invalidate } from '../utils/memoryCache';
import { invalidateCoachContext } from './ai.service';

const STATS_TTL_SECONDS = 30;
const PRS_TTL_SECONDS = 60;
const statsKey = (userId: string) => `workouts:stats:${userId}`;
const prsKey = (userId: string, limit?: number) => `workouts:prs:${userId}:${limit ?? 'all'}`;

/**
 * Calorie estimation for gym sessions.
 * MET ≈ 5-8 depending on intensity. Formula: kcal = MET * weightKg * (durationMin / 60)
 */
const INTENSITY_MET: Record<IntensityLevel, number> = {
  LOW: 3.5,
  MEDIUM: 5,
  HIGH: 7,
  MAX: 9,
};

export function estimateCalories(params: {
  intensity: IntensityLevel;
  durationMin: number;
  weightKg?: number | null;
}): number {
  const met = INTENSITY_MET[params.intensity] ?? 5;
  const weight = params.weightKg && params.weightKg > 0 ? params.weightKg : 70;
  return Math.round(met * weight * (params.durationMin / 60));
}

const workoutAuthorSelect = {
  id: true,
  is_premium: true,
  profile: {
    select: {
      username: true,
      display_name: true,
      avatar_url: true,
    },
  },
} as const;

const workoutSelect = {
  id: true,
  user_id: true,
  title: true,
  notes: true,
  duration_min: true,
  intensity: true,
  calories: true,
  photo_url: true,
  is_public: true,
  workout_date: true,
  created_at: true,
  updated_at: true,
  user: { select: workoutAuthorSelect },
  exercises: {
    select: {
      id: true,
      order_idx: true,
      notes: true,
      exercise: {
        select: {
          id: true,
          slug: true,
          name: true,
          primary_muscle: true,
          secondary_muscles: true,
          equipment: true,
          category: true,
          image_url: true,
        },
      },
      sets: {
        select: {
          id: true,
          set_number: true,
          reps: true,
          weight_kg: true,
          rpe: true,
          is_warmup: true,
          is_failure: true,
          rest_sec: true,
          notes: true,
        },
        orderBy: { set_number: 'asc' as const },
      },
    },
    orderBy: { order_idx: 'asc' as const },
  },
  _count: { select: { likes: true, comments: true } },
} satisfies Prisma.WorkoutSelect;

export type WorkoutWithMeta = Prisma.WorkoutGetPayload<{ select: typeof workoutSelect }>;

async function buildExerciseTransactions(exercises: WorkoutExerciseInput[]) {
  // Validate that all exercise IDs exist
  const ids = exercises.map((e) => e.exerciseId);
  const found = await prisma.exercise.findMany({
    where: { id: { in: ids } },
    select: { id: true },
  });
  const foundIds = new Set(found.map((e) => e.id));
  const missing = ids.filter((id) => !foundIds.has(id));
  if (missing.length > 0) {
    return { error: 'invalid-exercise', missing };
  }
  return { error: null };
}

export const workoutsService = {
  async create(userId: string, data: CreateWorkoutInput) {
    const validation = await buildExerciseTransactions(data.exercises);
    if (validation.error) return validation.error as 'invalid-exercise';

    const profile = await prisma.userProfile.findUnique({
      where: { user_id: userId },
      select: { weight_kg: true },
    });

    const calories = estimateCalories({
      intensity: data.intensity,
      durationMin: data.durationMin,
      weightKg: profile?.weight_kg,
    });

    const created = await prisma.workout.create({
      data: {
        user_id: userId,
        title: data.title,
        notes: data.notes ?? null,
        duration_min: data.durationMin,
        intensity: data.intensity,
        calories,
        photo_url: data.photoUrl ?? null,
        is_public: data.isPublic ?? true,
        workout_date: data.workoutDate ? new Date(data.workoutDate) : new Date(),
        exercises: {
          create: data.exercises.map((e) => ({
            exercise_id: e.exerciseId,
            order_idx: e.orderIdx,
            notes: e.notes ?? null,
            sets: {
              create: e.sets.map((s) => ({
                set_number: s.setNumber,
                reps: s.reps,
                weight_kg: s.weightKg ?? null,
                rpe: s.rpe ?? null,
                is_warmup: s.isWarmup ?? false,
                is_failure: s.isFailure ?? false,
                rest_sec: s.restSec ?? null,
                notes: s.notes ?? null,
              })),
            },
          })),
        },
      },
      select: workoutSelect,
    });

    // Invalidar caches del usuario que cambiaron por este workout
    invalidate(statsKey(userId));
    invalidate(prsKey(userId));
    invalidate(prsKey(userId, 5));
    invalidateCoachContext(userId);

    return created;
  },

  async update(workoutId: string, userId: string, data: UpdateWorkoutInput) {
    const existing = await prisma.workout.findUnique({ where: { id: workoutId } });
    if (!existing) return null;
    if (existing.user_id !== userId) return 'forbidden' as const;

    if (data.exercises) {
      const validation = await buildExerciseTransactions(data.exercises);
      if (validation.error) return validation.error as 'invalid-exercise';
    }

    const intensity = data.intensity ?? existing.intensity;
    const durationMin = data.durationMin ?? existing.duration_min;
    let calories = existing.calories;
    if (data.intensity || data.durationMin) {
      const profile = await prisma.userProfile.findUnique({
        where: { user_id: userId },
        select: { weight_kg: true },
      });
      calories = estimateCalories({ intensity, durationMin, weightKg: profile?.weight_kg });
    }

    // If exercises are provided, replace them entirely (delete & recreate)
    if (data.exercises) {
      await prisma.workoutExercise.deleteMany({ where: { workout_id: workoutId } });
    }

    // Invalidar caches del usuario (volumen / PRs / stats pueden haber cambiado)
    invalidate(statsKey(userId));
    invalidate(prsKey(userId));
    invalidate(prsKey(userId, 5));
    invalidateCoachContext(userId);

    const updated = await prisma.workout.update({
      where: { id: workoutId },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.durationMin !== undefined && { duration_min: data.durationMin }),
        ...(data.intensity !== undefined && { intensity: data.intensity }),
        ...(data.isPublic !== undefined && { is_public: data.isPublic }),
        ...(data.workoutDate !== undefined && { workout_date: new Date(data.workoutDate) }),
        ...(data.photoUrl !== undefined && { photo_url: data.photoUrl }),
        calories,
        ...(data.exercises && {
          exercises: {
            create: data.exercises.map((e) => ({
              exercise_id: e.exerciseId,
              order_idx: e.orderIdx,
              notes: e.notes ?? null,
              sets: {
                create: e.sets.map((s) => ({
                  set_number: s.setNumber,
                  reps: s.reps,
                  weight_kg: s.weightKg ?? null,
                  rpe: s.rpe ?? null,
                  is_warmup: s.isWarmup ?? false,
                  is_failure: s.isFailure ?? false,
                  rest_sec: s.restSec ?? null,
                  notes: s.notes ?? null,
                })),
              },
            })),
          },
        }),
      },
      select: workoutSelect,
    });

    return updated;
  },

  async findById(workoutId: string, viewerId?: string) {
    const w = await prisma.workout.findUnique({
      where: { id: workoutId },
      select: workoutSelect,
    });
    if (!w) return null;
    if (!w.is_public && w.user_id !== viewerId) return 'forbidden' as const;
    return w;
  },

  async delete(workoutId: string, userId: string, isAdmin = false) {
    const existing = await prisma.workout.findUnique({ where: { id: workoutId } });
    if (!existing) return null;
    if (!isAdmin && existing.user_id !== userId) return 'forbidden' as const;
    await prisma.workout.delete({ where: { id: workoutId } });
    // Invalidar caches del propietario
    invalidate(statsKey(existing.user_id));
    invalidate(prsKey(existing.user_id));
    invalidate(prsKey(existing.user_id, 5));
    invalidateCoachContext(existing.user_id);
    return true;
  },

  async list(filters: {
    userId?: string;
    intensity?: IntensityLevel;
    search?: string;
    startDate?: string;
    endDate?: string;
    page: number;
    limit: number;
    viewerId?: string;
    publicOnly?: boolean;
  }) {
    const where: Prisma.WorkoutWhereInput = {};
    if (filters.userId) where.user_id = filters.userId;
    if (filters.intensity) where.intensity = filters.intensity;
    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { notes: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    if (filters.startDate || filters.endDate) {
      where.workout_date = {};
      if (filters.startDate) where.workout_date.gte = new Date(filters.startDate);
      if (filters.endDate) where.workout_date.lte = new Date(filters.endDate);
    }
    if (filters.publicOnly && filters.viewerId !== filters.userId) {
      where.is_public = true;
    }

    const skip = (filters.page - 1) * filters.limit;
    const [items, total] = await Promise.all([
      prisma.workout.findMany({
        where,
        select: workoutSelect,
        orderBy: { workout_date: 'desc' },
        skip,
        take: filters.limit,
      }),
      prisma.workout.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit) || 1,
        hasNextPage: skip + items.length < total,
        hasPrevPage: filters.page > 1,
      },
    };
  },

  async calendar(userId: string, year: number, month: number) {
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 1));

    const workouts = await prisma.workout.findMany({
      where: {
        user_id: userId,
        workout_date: { gte: start, lt: end },
      },
      select: {
        id: true,
        title: true,
        intensity: true,
        duration_min: true,
        calories: true,
        workout_date: true,
        exercises: {
          select: {
            exercise: { select: { primary_muscle: true } },
          },
        },
      },
      orderBy: { workout_date: 'asc' },
    });

    const byDay: Record<number, typeof workouts> = {};
    for (const w of workouts) {
      const day = w.workout_date.getUTCDate();
      if (!byDay[day]) byDay[day] = [];
      byDay[day].push(w);
    }

    return {
      year,
      month,
      days: Object.entries(byDay).map(([day, items]) => ({
        day: Number(day),
        count: items.length,
        muscles: Array.from(
          new Set(
            items.flatMap((i) => i.exercises.map((e) => e.exercise.primary_muscle))
          )
        ),
        workouts: items.map((w) => ({
          id: w.id,
          title: w.title,
          intensity: w.intensity,
          duration_min: w.duration_min,
          calories: w.calories,
          workout_date: w.workout_date,
          muscles: Array.from(new Set(w.exercises.map((e) => e.exercise.primary_muscle))),
        })),
      })),
      totalWorkouts: workouts.length,
    };
  },

  async stats(userId: string) {
    return cached(statsKey(userId), STATS_TTL_SECONDS, () => buildStats(userId));
  },

  /**
   * Heatmap anual de actividad (estilo GitHub contributions).
   *
   * Devuelve un mapa con todos los días del año en los que el usuario ha
   * entrenado, con número de sesiones e intensidad agregada. El frontend
   * lo renderiza como una cuadrícula 52×7 coloreada según volumen.
   */
  async heatmap(userId: string, year: number) {
    const start = new Date(Date.UTC(year, 0, 1));
    const end = new Date(Date.UTC(year + 1, 0, 1));

    const rows = await prisma.$queryRaw<Array<{
      day: Date;
      count: bigint;
      total_minutes: number | null;
      total_calories: number | null;
      max_intensity: string;
    }>>`
      SELECT
        DATE_TRUNC('day', workout_date)::date as day,
        COUNT(*)::bigint as count,
        SUM(duration_min)::int as total_minutes,
        SUM(calories)::int as total_calories,
        MAX(intensity::text) as max_intensity
      FROM workouts
      WHERE user_id = ${userId}
        AND workout_date >= ${start}
        AND workout_date < ${end}
      GROUP BY DATE_TRUNC('day', workout_date)
      ORDER BY day ASC
    `;

    const days = rows.map((r) => ({
      date: r.day.toISOString().slice(0, 10),
      count: Number(r.count),
      totalMinutes: r.total_minutes ?? 0,
      totalCalories: r.total_calories ?? 0,
      maxIntensity: r.max_intensity,
    }));

    // Agregados anuales
    const totals = days.reduce(
      (acc, d) => ({
        workouts: acc.workouts + d.count,
        minutes: acc.minutes + d.totalMinutes,
        calories: acc.calories + d.totalCalories,
        activeDays: acc.activeDays + 1,
      }),
      { workouts: 0, minutes: 0, calories: 0, activeDays: 0 }
    );

    // Racha máxima del año
    const dayKeys = new Set(days.map((d) => d.date));
    let longestStreak = 0;
    let currentStreak = 0;
    const cursor = new Date(start);
    while (cursor < end) {
      const key = cursor.toISOString().slice(0, 10);
      if (dayKeys.has(key)) {
        currentStreak++;
        if (currentStreak > longestStreak) longestStreak = currentStreak;
      } else {
        currentStreak = 0;
      }
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    return {
      year,
      days,
      totals: {
        ...totals,
        longestStreak,
      },
    };
  },

  /**
   * Personal records: best weight per exercise (working sets only).
   * Devuelve también el músculo primario, equipment y nº veces que el usuario
   * ha entrenado ese ejercicio (para una página de PRs completa).
   *
   * Cacheado en memoria (TTL = PRS_TTL_SECONDS) e invalidado automáticamente
   * al crear/editar/borrar un workout del usuario.
   */
  async personalRecords(userId: string, limit?: number) {
    return cached(prsKey(userId, limit), PRS_TTL_SECONDS, async () => {
      const rows = await prisma.$queryRaw<
        Array<{
          exercise_id: string;
          exercise_slug: string;
          exercise_name: string;
          primary_muscle: string;
          equipment: string;
          max_weight: number;
          reps_at_max: number;
          estimated_1rm: number;
          achieved_at: Date;
          workout_id: string;
          times_performed: bigint;
        }>
      >`
        WITH best_set AS (
          SELECT DISTINCT ON (e.id)
            e.id as exercise_id,
            e.slug as exercise_slug,
            e.name as exercise_name,
            e.primary_muscle::text as primary_muscle,
            e.equipment::text as equipment,
            ws.weight_kg as max_weight,
            ws.reps as reps_at_max,
            -- Epley 1RM: weight * (1 + reps/30)
            ROUND((ws.weight_kg * (1 + ws.reps::numeric / 30))::numeric, 1) as estimated_1rm,
            w.workout_date as achieved_at,
            w.id as workout_id
          FROM workouts w
          INNER JOIN workout_exercises we ON we.workout_id = w.id
          INNER JOIN exercises e ON e.id = we.exercise_id
          INNER JOIN workout_sets ws ON ws.workout_exercise_id = we.id
          WHERE w.user_id = ${userId}
            AND ws.is_warmup = false
            AND ws.weight_kg IS NOT NULL
            AND ws.weight_kg > 0
          ORDER BY e.id, ws.weight_kg DESC, ws.reps DESC, w.workout_date DESC
        )
        SELECT
          bs.*,
          (
            SELECT COUNT(DISTINCT w2.id)::bigint
            FROM workouts w2
            INNER JOIN workout_exercises we2 ON we2.workout_id = w2.id
            WHERE w2.user_id = ${userId} AND we2.exercise_id = bs.exercise_id
          ) as times_performed
        FROM best_set bs
        ORDER BY bs.estimated_1rm DESC
        ${limit ? Prisma.sql`LIMIT ${limit}` : Prisma.empty}
      `;

      return rows.map((r) => ({
        exerciseId: r.exercise_id,
        exerciseSlug: r.exercise_slug,
        exerciseName: r.exercise_name,
        primaryMuscle: r.primary_muscle,
        equipment: r.equipment,
        maxWeight: Number(r.max_weight),
        repsAtMax: r.reps_at_max,
        estimatedOneRm: Number(r.estimated_1rm),
        achievedAt: r.achieved_at,
        workoutId: r.workout_id,
        timesPerformed: Number(r.times_performed),
      }));
    });
  },

  /**
   * Histórico de un ejercicio para gráfica de evolución del peso máximo.
   * Devuelve el peso máximo (no calentamiento) por workout, ordenado cronológicamente.
   */
  async exerciseProgress(userId: string, exerciseId: string) {
    const rows = await prisma.$queryRaw<
      Array<{
        workout_id: string;
        workout_date: Date;
        max_weight: number;
        max_reps: number;
        total_volume: number;
      }>
    >`
      SELECT
        w.id as workout_id,
        w.workout_date,
        MAX(ws.weight_kg) as max_weight,
        MAX(ws.reps) as max_reps,
        SUM(ws.weight_kg * ws.reps) as total_volume
      FROM workouts w
      INNER JOIN workout_exercises we ON we.workout_id = w.id
      INNER JOIN workout_sets ws ON ws.workout_exercise_id = we.id
      WHERE w.user_id = ${userId}
        AND we.exercise_id = ${exerciseId}
        AND ws.is_warmup = false
        AND ws.weight_kg IS NOT NULL
      GROUP BY w.id, w.workout_date
      ORDER BY w.workout_date ASC
      LIMIT 60
    `;

    return rows.map((r) => ({
      workoutId: r.workout_id,
      workoutDate: r.workout_date,
      maxWeight: Number(r.max_weight),
      maxReps: r.max_reps,
      totalVolume: Number(r.total_volume),
    }));
  },
};

// ─── Internal builders (cacheados por workoutsService) ──────────────────────

async function buildStats(userId: string) {
  const now = new Date();
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const startOfYear = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  const fourWeeksAgo = new Date();
  fourWeeksAgo.setDate(now.getDate() - 28);

  const [
    total,
    monthAgg,
    yearAgg,
    lifetimeAgg,
    recentByWeek,
    lastWorkouts,
    muscleStats,
    volumeStats,
  ] = await Promise.all([
    prisma.workout.count({ where: { user_id: userId } }),
    prisma.workout.aggregate({
      where: { user_id: userId, workout_date: { gte: startOfMonth } },
      _count: true,
      _sum: { duration_min: true, calories: true },
    }),
    prisma.workout.aggregate({
      where: { user_id: userId, workout_date: { gte: startOfYear } },
      _count: true,
      _sum: { duration_min: true, calories: true },
    }),
    prisma.workout.aggregate({
      where: { user_id: userId },
      _sum: { duration_min: true, calories: true },
    }),
    prisma.workout.findMany({
      where: { user_id: userId, workout_date: { gte: fourWeeksAgo } },
      select: { workout_date: true, duration_min: true, calories: true },
      orderBy: { workout_date: 'asc' },
    }),
    prisma.workout.findMany({
      where: { user_id: userId },
      select: workoutSelect,
      orderBy: { workout_date: 'desc' },
      take: 5,
    }),
    // Top muscle groups by workout count
    prisma.$queryRaw<Array<{ muscle: MuscleGroup; count: bigint }>>`
      SELECT e.primary_muscle as muscle, COUNT(DISTINCT w.id)::bigint as count
      FROM workouts w
      INNER JOIN workout_exercises we ON we.workout_id = w.id
      INNER JOIN exercises e ON e.id = we.exercise_id
      WHERE w.user_id = ${userId}
      GROUP BY e.primary_muscle
      ORDER BY count DESC
      LIMIT 10
    `,
    // Total volume (sum of weight * reps) over last 30 days
    prisma.$queryRaw<Array<{ total_volume: number | null; total_sets: bigint }>>`
      SELECT
        COALESCE(SUM(ws.weight_kg * ws.reps), 0)::float as total_volume,
        COUNT(ws.id)::bigint as total_sets
      FROM workouts w
      INNER JOIN workout_exercises we ON we.workout_id = w.id
      INNER JOIN workout_sets ws ON ws.workout_exercise_id = we.id
      WHERE w.user_id = ${userId}
        AND w.workout_date >= ${fourWeeksAgo}
        AND ws.is_warmup = false
    `,
  ]);

  // Compute streak
  const allDates = await prisma.workout.findMany({
    where: { user_id: userId },
    select: { workout_date: true },
    orderBy: { workout_date: 'desc' },
    take: 365,
  });

  const dayKeys = new Set(
    allDates.map((d) => d.workout_date.toISOString().slice(0, 10))
  );

  let streak = 0;
  const cursor = new Date();
  cursor.setUTCHours(0, 0, 0, 0);
  if (!dayKeys.has(cursor.toISOString().slice(0, 10))) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  while (dayKeys.has(cursor.toISOString().slice(0, 10))) {
    streak++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  const weekBuckets: Array<{ weekStart: string; count: number; minutes: number; calories: number }> = [];
  for (let i = 3; i >= 0; i--) {
    const weekStart = new Date();
    weekStart.setUTCHours(0, 0, 0, 0);
    weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay() - 7 * i);
    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);
    const inWeek = recentByWeek.filter(
      (w) => w.workout_date >= weekStart && w.workout_date < weekEnd
    );
    weekBuckets.push({
      weekStart: weekStart.toISOString().slice(0, 10),
      count: inWeek.length,
      minutes: inWeek.reduce((s, w) => s + w.duration_min, 0),
      calories: inWeek.reduce((s, w) => s + (w.calories ?? 0), 0),
    });
  }

  const volume = volumeStats[0] ?? { total_volume: 0, total_sets: 0n };

  return {
    totals: {
      workouts: total,
      minutes: lifetimeAgg._sum.duration_min ?? 0,
      calories: lifetimeAgg._sum.calories ?? 0,
    },
    thisMonth: {
      workouts: monthAgg._count ?? 0,
      minutes: monthAgg._sum.duration_min ?? 0,
      calories: monthAgg._sum.calories ?? 0,
    },
    thisYear: {
      workouts: yearAgg._count ?? 0,
      minutes: yearAgg._sum.duration_min ?? 0,
      calories: yearAgg._sum.calories ?? 0,
    },
    streakDays: streak,
    topMuscles: muscleStats.map((m) => ({
      muscle: m.muscle,
      count: Number(m.count),
    })),
    last30Days: {
      totalVolume: Number(volume.total_volume ?? 0),
      totalSets: Number(volume.total_sets ?? 0n),
    },
    weeklyActivity: weekBuckets,
    recentWorkouts: lastWorkouts,
  };
}
