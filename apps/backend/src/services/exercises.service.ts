import { Prisma, MuscleGroup, Equipment, ExerciseCategory } from '@prisma/client';
import { prisma } from '../lib/prisma';

const exerciseSelect = {
  id: true,
  slug: true,
  name: true,
  name_en: true,
  description: true,
  primary_muscle: true,
  secondary_muscles: true,
  equipment: true,
  category: true,
  is_custom: true,
  created_by: true,
  image_url: true,
  video_url: true,
  instructions: true,
  created_at: true,
} satisfies Prisma.ExerciseSelect;

export const exercisesService = {
  async list(filters: {
    search?: string;
    muscle?: MuscleGroup;
    equipment?: Equipment;
    category?: ExerciseCategory;
    includeCustomFor?: string;
  }) {
    const where: Prisma.ExerciseWhereInput = {};
    // Show catalog (non-custom) + viewer's own custom exercises
    if (filters.includeCustomFor) {
      where.OR = [{ is_custom: false }, { created_by: filters.includeCustomFor }];
    } else {
      where.is_custom = false;
    }
    if (filters.muscle) {
      where.AND = where.AND ?? [];
      (where.AND as Prisma.ExerciseWhereInput[]).push({
        OR: [
          { primary_muscle: filters.muscle },
          { secondary_muscles: { has: filters.muscle } },
        ],
      });
    }
    if (filters.equipment) {
      where.equipment = filters.equipment;
    }
    if (filters.category) {
      where.category = filters.category;
    }
    if (filters.search) {
      where.AND = where.AND ?? [];
      (where.AND as Prisma.ExerciseWhereInput[]).push({
        OR: [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { name_en: { contains: filters.search, mode: 'insensitive' } },
        ],
      });
    }

    return prisma.exercise.findMany({
      where,
      select: exerciseSelect,
      orderBy: [{ name: 'asc' }],
      take: 200,
    });
  },

  async findById(id: string) {
    return prisma.exercise.findUnique({
      where: { id },
      select: exerciseSelect,
    });
  },

  async createCustom(userId: string, data: {
    name: string;
    description?: string;
    primaryMuscle: MuscleGroup;
    secondaryMuscles?: MuscleGroup[];
    equipment: Equipment;
    category: ExerciseCategory;
    instructions?: string;
  }) {
    const slug =
      'custom_' +
      data.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '') +
      '_' +
      Date.now().toString(36);

    return prisma.exercise.create({
      data: {
        slug,
        name: data.name,
        description: data.description ?? null,
        primary_muscle: data.primaryMuscle,
        secondary_muscles: data.secondaryMuscles ?? [],
        equipment: data.equipment,
        category: data.category,
        instructions: data.instructions ?? null,
        is_custom: true,
        created_by: userId,
      },
      select: exerciseSelect,
    });
  },

  async deleteCustom(userId: string, exerciseId: string) {
    const ex = await prisma.exercise.findUnique({ where: { id: exerciseId } });
    if (!ex) return null;
    if (!ex.is_custom || ex.created_by !== userId) return 'forbidden' as const;
    await prisma.exercise.delete({ where: { id: exerciseId } });
    return true;
  },

  /**
   * Recent history of how a user has performed a specific exercise.
   * Returns the last N workouts where the exercise was logged, with all sets.
   */
  async exerciseHistory(userId: string, exerciseId: string, limit = 10) {
    const items = await prisma.workoutExercise.findMany({
      where: {
        exercise_id: exerciseId,
        workout: { user_id: userId },
      },
      select: {
        id: true,
        notes: true,
        workout: {
          select: { id: true, title: true, workout_date: true },
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
          },
          orderBy: { set_number: 'asc' },
        },
      },
      orderBy: { workout: { workout_date: 'desc' } },
      take: limit,
    });
    return items;
  },
};
