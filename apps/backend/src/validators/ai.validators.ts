import { z } from 'zod';

export const chatMessageSchema = z.object({
  conversationId: z.string().uuid().optional(),
  message: z.string().min(1, 'El mensaje no puede estar vacío').max(2000, 'Máximo 2000 caracteres'),
});

export const generateRoutineSchema = z.object({
  goal: z.enum([
    'LOSE_WEIGHT', 'GAIN_MUSCLE', 'IMPROVE_STRENGTH',
    'STAY_HEALTHY', 'RECOMP', 'POWERLIFTING', 'HYPERTROPHY',
  ]),
  daysPerWeek: z.number().int().min(1).max(7),
  sessionMinutes: z.number().int().min(15).max(180),
  experienceLevel: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'PROFESSIONAL']),
  equipment: z
    .array(z.enum(['FULL_GYM', 'DUMBBELLS', 'BANDS', 'BODYWEIGHT_ONLY']))
    .min(1)
    .default(['FULL_GYM']),
  notes: z.string().max(500).optional(),
});

export const generateNutritionSchema = z.object({
  goal: z.enum([
    'LOSE_WEIGHT', 'GAIN_MUSCLE', 'IMPROVE_STRENGTH',
    'STAY_HEALTHY', 'RECOMP', 'POWERLIFTING', 'HYPERTROPHY',
  ]),
  heightCm: z.number().min(120).max(250),
  weightKg: z.number().min(30).max(250),
  age: z.number().int().min(14).max(100),
  sex: z.enum(['MALE', 'FEMALE', 'OTHER']),
  activityLevel: z.enum(['SEDENTARY', 'LIGHT', 'MODERATE', 'INTENSE', 'EXTREME']),
  dietaryRestrictions: z.array(z.string()).max(10).optional(),
  notes: z.string().max(500).optional(),
});

export type ChatMessageInput = z.infer<typeof chatMessageSchema>;
export type GenerateRoutineInput = z.infer<typeof generateRoutineSchema>;
export type GenerateNutritionInput = z.infer<typeof generateNutritionSchema>;
