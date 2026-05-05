import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { workoutsService, WorkoutWithMeta } from '../services/workouts.service';
import { sendSuccess, sendPaginated } from '../utils/apiResponse';
import { AppError } from '../middleware/errorHandler';
import {
  CreateWorkoutInput,
  UpdateWorkoutInput,
  ListWorkoutsQuery,
} from '../validators/workouts.validators';

function serialize(w: WorkoutWithMeta) {
  return {
    id: w.id,
    userId: w.user_id,
    title: w.title,
    notes: w.notes,
    durationMin: w.duration_min,
    intensity: w.intensity,
    calories: w.calories,
    photoUrl: w.photo_url,
    isPublic: w.is_public,
    workoutDate: w.workout_date,
    createdAt: w.created_at,
    updatedAt: w.updated_at,
    likesCount: w._count.likes,
    commentsCount: w._count.comments,
    user: w.user
      ? {
          id: w.user.id,
          username: w.user.profile?.username ?? null,
          displayName: w.user.profile?.display_name ?? null,
          avatarUrl: w.user.profile?.avatar_url ?? null,
          isPremium: w.user.is_premium,
        }
      : null,
    exercises: w.exercises.map((we) => ({
      id: we.id,
      orderIdx: we.order_idx,
      notes: we.notes,
      exercise: {
        id: we.exercise.id,
        slug: we.exercise.slug,
        name: we.exercise.name,
        primaryMuscle: we.exercise.primary_muscle,
        secondaryMuscles: we.exercise.secondary_muscles,
        equipment: we.exercise.equipment,
        category: we.exercise.category,
        imageUrl: we.exercise.image_url,
      },
      sets: we.sets.map((s) => ({
        id: s.id,
        setNumber: s.set_number,
        reps: s.reps,
        weightKg: s.weight_kg,
        rpe: s.rpe,
        isWarmup: s.is_warmup,
        isFailure: s.is_failure,
        restSec: s.rest_sec,
        notes: s.notes,
      })),
    })),
  };
}

export async function create(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError('No autenticado', 401, 'UNAUTHORIZED');
    const data = req.body as CreateWorkoutInput;
    const result = await workoutsService.create(req.user.userId, data);
    if (result === 'invalid-exercise') {
      throw new AppError('Algún ejercicio seleccionado no existe', 400, 'INVALID_EXERCISE');
    }
    sendSuccess(res, serialize(result), { statusCode: 201, message: 'Entrenamiento creado' });
  } catch (e) {
    next(e);
  }
}

export async function update(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError('No autenticado', 401, 'UNAUTHORIZED');
    const { id } = req.params;
    const data = req.body as UpdateWorkoutInput;
    const result = await workoutsService.update(id, req.user.userId, data);
    if (!result) throw new AppError('Entrenamiento no encontrado', 404, 'NOT_FOUND');
    if (result === 'forbidden') throw new AppError('No puedes editar este entrenamiento', 403, 'FORBIDDEN');
    if (result === 'invalid-exercise') throw new AppError('Algún ejercicio no existe', 400, 'INVALID_EXERCISE');
    sendSuccess(res, serialize(result), { message: 'Entrenamiento actualizado' });
  } catch (e) {
    next(e);
  }
}

export async function getById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const result = await workoutsService.findById(id, req.user?.userId);
    if (!result) throw new AppError('Entrenamiento no encontrado', 404, 'NOT_FOUND');
    if (result === 'forbidden') throw new AppError('Entrenamiento privado', 403, 'FORBIDDEN');
    sendSuccess(res, serialize(result));
  } catch (e) {
    next(e);
  }
}

export async function remove(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError('No autenticado', 401, 'UNAUTHORIZED');
    const { id } = req.params;
    const result = await workoutsService.delete(id, req.user.userId, req.user.role === 'ADMIN');
    if (!result) throw new AppError('Entrenamiento no encontrado', 404, 'NOT_FOUND');
    if (result === 'forbidden') throw new AppError('No puedes borrar este entrenamiento', 403, 'FORBIDDEN');
    sendSuccess(res, { id }, { message: 'Entrenamiento eliminado' });
  } catch (e) {
    next(e);
  }
}

export async function list(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError('No autenticado', 401, 'UNAUTHORIZED');
    const q = req.query as unknown as ListWorkoutsQuery;
    const userId = q.userId ?? req.user.userId;
    const result = await workoutsService.list({
      userId,
      intensity: q.intensity,
      search: q.search,
      startDate: q.startDate,
      endDate: q.endDate,
      page: q.page,
      limit: q.limit,
      viewerId: req.user.userId,
      publicOnly: userId !== req.user.userId,
    });

    sendPaginated(res, result.items.map(serialize), result.pagination);
  } catch (e) {
    next(e);
  }
}

export async function calendar(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError('No autenticado', 401, 'UNAUTHORIZED');
    const year = Number(req.params.year);
    const month = Number(req.params.month);
    if (Number.isNaN(year) || Number.isNaN(month)) {
      throw new AppError('Parámetros inválidos', 400, 'INVALID_PARAMS');
    }
    const result = await workoutsService.calendar(req.user.userId, year, month);
    sendSuccess(res, result);
  } catch (e) {
    next(e);
  }
}

export async function heatmap(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError('No autenticado', 401, 'UNAUTHORIZED');
    const year = Number(req.params.year);
    if (Number.isNaN(year) || year < 2000 || year > 2100) {
      throw new AppError('Año inválido', 400, 'INVALID_YEAR');
    }
    const result = await workoutsService.heatmap(req.user.userId, year);
    sendSuccess(res, result);
  } catch (e) {
    next(e);
  }
}

export async function stats(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError('No autenticado', 401, 'UNAUTHORIZED');
    const targetUserId = (req.params.userId as string | undefined) ?? req.user.userId;
    const result = await workoutsService.stats(targetUserId);
    sendSuccess(res, {
      ...result,
      recentWorkouts: result.recentWorkouts.map(serialize),
    });
  } catch (e) {
    next(e);
  }
}

export async function personalRecords(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError('No autenticado', 401, 'UNAUTHORIZED');
    const limitRaw = req.query.limit ? Math.min(100, Number(req.query.limit)) : undefined;
    const items = await workoutsService.personalRecords(req.user.userId, limitRaw);
    sendSuccess(res, { items });
  } catch (e) {
    next(e);
  }
}

export async function exerciseProgress(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError('No autenticado', 401, 'UNAUTHORIZED');
    const { exerciseId } = req.params;
    if (!exerciseId) throw new AppError('exerciseId requerido', 400, 'INVALID_PARAM');
    const items = await workoutsService.exerciseProgress(req.user.userId, exerciseId);
    sendSuccess(res, { items });
  } catch (e) {
    next(e);
  }
}
