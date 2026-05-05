import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { exercisesService } from '../services/exercises.service';
import { sendSuccess } from '../utils/apiResponse';
import { AppError } from '../middleware/errorHandler';
import { CreateCustomExerciseInput } from '../validators/exercises.validators';
import { MuscleGroup, Equipment, ExerciseCategory } from '@prisma/client';

export async function list(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError('No autenticado', 401, 'UNAUTHORIZED');
    const q = req.query as {
      search?: string;
      muscle?: MuscleGroup;
      equipment?: Equipment;
      category?: ExerciseCategory;
    };
    const items = await exercisesService.list({
      search: q.search,
      muscle: q.muscle,
      equipment: q.equipment,
      category: q.category,
      includeCustomFor: req.user.userId,
    });
    sendSuccess(res, { items });
  } catch (e) {
    next(e);
  }
}

export async function getById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const ex = await exercisesService.findById(id);
    if (!ex) throw new AppError('Ejercicio no encontrado', 404, 'NOT_FOUND');
    sendSuccess(res, ex);
  } catch (e) {
    next(e);
  }
}

export async function create(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError('No autenticado', 401, 'UNAUTHORIZED');
    const data = req.body as CreateCustomExerciseInput;
    const created = await exercisesService.createCustom(req.user.userId, {
      name: data.name,
      description: data.description,
      primaryMuscle: data.primaryMuscle,
      secondaryMuscles: data.secondaryMuscles,
      equipment: data.equipment,
      category: data.category,
      instructions: data.instructions,
    });
    sendSuccess(res, created, { statusCode: 201, message: 'Ejercicio creado' });
  } catch (e) {
    next(e);
  }
}

export async function remove(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError('No autenticado', 401, 'UNAUTHORIZED');
    const { id } = req.params;
    const result = await exercisesService.deleteCustom(req.user.userId, id);
    if (!result) throw new AppError('Ejercicio no encontrado', 404, 'NOT_FOUND');
    if (result === 'forbidden') throw new AppError('No puedes borrar este ejercicio', 403, 'FORBIDDEN');
    sendSuccess(res, { id }, { message: 'Ejercicio eliminado' });
  } catch (e) {
    next(e);
  }
}

export async function history(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError('No autenticado', 401, 'UNAUTHORIZED');
    const { id } = req.params;
    const limit = Math.min(50, Number(req.query.limit ?? 10));
    const items = await exercisesService.exerciseHistory(req.user.userId, id, limit);
    sendSuccess(res, { items });
  } catch (e) {
    next(e);
  }
}
