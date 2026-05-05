import { z } from 'zod';

const FITNESS_GOALS = [
  'LOSE_WEIGHT', 'GAIN_MUSCLE', 'IMPROVE_STRENGTH',
  'STAY_HEALTHY', 'RECOMP', 'POWERLIFTING', 'HYPERTROPHY',
] as const;

const EXPERIENCE_LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'PROFESSIONAL'] as const;

export const updateProfileSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_]+$/, 'Solo letras, números y guiones bajos')
    .optional(),
  displayName: z.string().min(1).max(100).optional(),
  bio: z.string().max(500).nullable().optional(),
  avatarUrl: z.string().url().nullable().optional(),
  coverUrl: z.string().url().nullable().optional(),
  heightCm: z.number().min(50).max(250).nullable().optional(),
  weightKg: z.number().min(20).max(300).nullable().optional(),
  birthDate: z.string().nullable().optional(),
  location: z.string().max(120).nullable().optional(),
  website: z.string().url().nullable().optional(),
  fitnessGoal: z.enum(FITNESS_GOALS).nullable().optional(),
  experienceLevel: z.enum(EXPERIENCE_LEVELS).nullable().optional(),
  isProfilePublic: z.boolean().optional(),
  showWorkouts: z.boolean().optional(),
  showStats: z.boolean().optional(),
});

export const completeOnboardingSchema = z.object({
  displayName: z.string().min(1).max(100),
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_]+$/, 'Solo letras, números y guiones bajos'),
  heightCm: z.number().min(50).max(250).optional(),
  weightKg: z.number().min(20).max(300).optional(),
  fitnessGoal: z.enum(FITNESS_GOALS),
  experienceLevel: z.enum(EXPERIENCE_LEVELS),
  bio: z.string().max(500).optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type CompleteOnboardingInput = z.infer<typeof completeOnboardingSchema>;
