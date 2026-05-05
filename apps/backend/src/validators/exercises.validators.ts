import { z } from 'zod';

const MUSCLE_GROUPS = [
  'CHEST', 'BACK', 'SHOULDERS', 'BICEPS', 'TRICEPS', 'FOREARMS',
  'QUADS', 'HAMSTRINGS', 'GLUTES', 'CALVES', 'CORE',
  'TRAPS', 'LATS', 'FULL_BODY', 'CARDIO',
] as const;

const EQUIPMENT = [
  'BARBELL', 'DUMBBELL', 'MACHINE', 'CABLE', 'BODYWEIGHT',
  'KETTLEBELL', 'BAND', 'SMITH_MACHINE', 'CARDIO_MACHINE', 'OTHER',
] as const;

const EXERCISE_CATEGORIES = ['COMPOUND', 'ISOLATION', 'CARDIO', 'MOBILITY'] as const;

export const listExercisesQuerySchema = z.object({
  search: z.string().optional(),
  muscle: z.enum(MUSCLE_GROUPS).optional(),
  equipment: z.enum(EQUIPMENT).optional(),
  category: z.enum(EXERCISE_CATEGORIES).optional(),
});

export const createCustomExerciseSchema = z.object({
  name: z.string().min(2).max(200),
  description: z.string().max(1000).optional(),
  primaryMuscle: z.enum(MUSCLE_GROUPS),
  secondaryMuscles: z.array(z.enum(MUSCLE_GROUPS)).max(5).optional(),
  equipment: z.enum(EQUIPMENT),
  category: z.enum(EXERCISE_CATEGORIES),
  instructions: z.string().max(2000).optional(),
});

export type CreateCustomExerciseInput = z.infer<typeof createCustomExerciseSchema>;
