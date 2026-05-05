import { z } from 'zod';

const INTENSITY_LEVELS = ['LOW', 'MEDIUM', 'HIGH', 'MAX'] as const;

export const workoutSetSchema = z.object({
  setNumber: z.number().int().positive(),
  reps: z.number().int().min(0).max(500),
  weightKg: z.number().min(0).max(1000).optional().nullable(),
  rpe: z.number().min(1).max(10).optional().nullable(),
  isWarmup: z.boolean().optional().default(false),
  isFailure: z.boolean().optional().default(false),
  restSec: z.number().int().min(0).max(3600).optional().nullable(),
  notes: z.string().max(300).optional().nullable(),
});

export const workoutExerciseSchema = z.object({
  exerciseId: z.string().uuid(),
  orderIdx: z.number().int().min(0),
  notes: z.string().max(500).optional().nullable(),
  sets: z.array(workoutSetSchema).min(1, 'Cada ejercicio debe tener al menos una serie'),
});

export const createWorkoutSchema = z.object({
  title: z.string().min(3, 'Mínimo 3 caracteres').max(200),
  notes: z.string().max(2000).optional().nullable(),
  durationMin: z.number().int().positive().max(1440),
  intensity: z.enum(INTENSITY_LEVELS),
  isPublic: z.boolean().optional().default(true),
  workoutDate: z.string().optional(),
  photoUrl: z.string().url().optional().nullable(),
  exercises: z.array(workoutExerciseSchema).min(1, 'Añade al menos un ejercicio'),
});

export const updateWorkoutSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  notes: z.string().max(2000).nullable().optional(),
  durationMin: z.number().int().positive().max(1440).optional(),
  intensity: z.enum(INTENSITY_LEVELS).optional(),
  isPublic: z.boolean().optional(),
  workoutDate: z.string().optional(),
  photoUrl: z.string().url().nullable().optional(),
  exercises: z.array(workoutExerciseSchema).optional(),
});

export const listWorkoutsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  intensity: z.enum(INTENSITY_LEVELS).optional(),
  search: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  userId: z.string().uuid().optional(),
});

export type CreateWorkoutInput = z.infer<typeof createWorkoutSchema>;
export type UpdateWorkoutInput = z.infer<typeof updateWorkoutSchema>;
export type ListWorkoutsQuery = z.infer<typeof listWorkoutsQuerySchema>;
export type WorkoutExerciseInput = z.infer<typeof workoutExerciseSchema>;
export type WorkoutSetInput = z.infer<typeof workoutSetSchema>;
