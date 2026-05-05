import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { prisma } from '../lib/prisma';
import { sendSuccess } from '../utils/apiResponse';
import { AppError } from '../middleware/errorHandler';
import { usersService, serializeUser } from '../services/users.service';
import { workoutsService } from '../services/workouts.service';
import {
  UpdateProfileInput,
  CompleteOnboardingInput,
} from '../validators/users.validators';

/**
 * GET /api/users/me — full authenticated profile
 */
export async function getMe(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError('No autenticado', 401, 'UNAUTHORIZED');
    const u = await usersService.findById(req.user.userId);
    if (!u) throw new AppError('Usuario no encontrado', 404, 'NOT_FOUND');
    sendSuccess(res, serializeUser(u));
  } catch (e) {
    next(e);
  }
}

/**
 * PUT /api/users/me — update own profile
 */
export async function updateMe(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError('No autenticado', 401, 'UNAUTHORIZED');
    const data = req.body as UpdateProfileInput;

    if (data.username) {
      const available = await usersService.checkUsernameAvailable(data.username, req.user.userId);
      if (!available) throw new AppError('El nombre de usuario ya está en uso', 409, 'USERNAME_TAKEN');
    }

    const updated = await usersService.updateProfile(req.user.userId, data);
    if (!updated) throw new AppError('Usuario no encontrado', 404, 'NOT_FOUND');
    sendSuccess(res, serializeUser(updated), { message: 'Perfil actualizado' });
  } catch (e) {
    next(e);
  }
}

/**
 * POST /api/users/me/onboarding — complete onboarding flow
 */
export async function completeOnboarding(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) throw new AppError('No autenticado', 401, 'UNAUTHORIZED');
    const data = req.body as CompleteOnboardingInput;

    const available = await usersService.checkUsernameAvailable(data.username, req.user.userId);
    if (!available) throw new AppError('El nombre de usuario ya está en uso', 409, 'USERNAME_TAKEN');

    const updated = await usersService.completeOnboarding(req.user.userId, data);
    if (!updated) throw new AppError('Usuario no encontrado', 404, 'NOT_FOUND');
    sendSuccess(res, serializeUser(updated), { message: 'Onboarding completado' });
  } catch (e) {
    next(e);
  }
}

/**
 * GET /api/users/me/stats — own stats
 */
export async function getMyStats(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError('No autenticado', 401, 'UNAUTHORIZED');
    const stats = await workoutsService.stats(req.user.userId);
    sendSuccess(res, {
      ...stats,
      recentWorkouts: stats.recentWorkouts.map((w) => ({
        id: w.id,
        title: w.title,
        durationMin: w.duration_min,
        intensity: w.intensity,
        calories: w.calories,
        workoutDate: w.workout_date,
        exercisesCount: w.exercises.length,
      })),
    });
  } catch (e) {
    next(e);
  }
}

/**
 * GET /api/users/me/export — GDPR data export
 * Returns all personal data as a downloadable JSON file.
 * Rate-limited to one request per hour (handled via requireAuth + no extra cache needed).
 */
export async function exportMyData(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError('No autenticado', 401, 'UNAUTHORIZED');

    const userId = req.user.userId;

    const [user, workouts, notifications, following, followers] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        include: { profile: true },
      }),
      prisma.workout.findMany({
        where: { user_id: userId },
        include: {
          exercises: {
            include: { exercise: true },
            orderBy: { order_idx: 'asc' },
          },
        },
        orderBy: { workout_date: 'desc' },
      }),
      prisma.notification.findMany({
        where: { user_id: userId },
        orderBy: { created_at: 'desc' },
        take: 500,
      }),
      prisma.socialFollow.findMany({
        where: { follower_id: userId },
        include: { following: { include: { profile: true } } },
      }),
      prisma.socialFollow.findMany({
        where: { following_id: userId },
        include: { follower: { include: { profile: true } } },
      }),
    ]);

    const exportPayload = {
      exportedAt: new Date().toISOString(),
      exportVersion: '1.0',
      account: {
        id: user?.id,
        email: user?.email,
        role: user?.role,
        isEmailVerified: user?.is_email_verified,
        twoFaEnabled: user?.two_fa_enabled,
        createdAt: user?.created_at,
      },
      profile: user?.profile
        ? {
            displayName: user.profile.display_name,
            username: user.profile.username,
            bio: user.profile.bio,
            heightCm: user.profile.height_cm,
            weightKg: user.profile.weight_kg,
            birthDate: user.profile.birth_date,
            location: user.profile.location,
            fitnessGoal: user.profile.fitness_goal,
            experienceLevel: user.profile.experience_level,
          }
        : null,
      workouts: workouts.map((w) => ({
        id: w.id,
        title: w.title,
        durationMin: w.duration_min,
        intensity: w.intensity,
        calories: w.calories,
        notes: w.notes,
        isPublic: w.is_public,
        workoutDate: w.workout_date,
        exercises: w.exercises.map((e) => ({
          name: e.exercise.name,
          muscle: e.exercise.primary_muscle,
          notes: e.notes,
        })),
      })),
      social: {
        following: following.map((f) => ({
          id: f.following.id,
          username: f.following.profile?.username,
          followedAt: f.created_at,
        })),
        followers: followers.map((f) => ({
          id: f.follower.id,
          username: f.follower.profile?.username,
          followingSince: f.created_at,
        })),
      },
      notifications: notifications.map((n) => ({
        type: n.type,
        title: n.title,
        body: n.body,
        isRead: n.is_read,
        createdAt: n.created_at,
      })),
    };

    const filename = `fitcommunity-export-${userId.slice(0, 8)}-${Date.now()}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).json(exportPayload);
  } catch (e) {
    next(e);
  }
}

/**
 * GET /api/users/check-username/:username — availability check
 */
export async function checkUsername(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { username } = req.params;
    const available = await usersService.checkUsernameAvailable(username, req.user?.userId);
    sendSuccess(res, { username, available });
  } catch (e) {
    next(e);
  }
}

/**
 * GET /api/users/:id — public profile (id or username)
 */
export async function getById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    // Look up by id or by username (treat non-uuid as username)
    const isUuid = /^[0-9a-f-]{36}$/i.test(id);
    const u = isUuid
      ? await usersService.findById(id)
      : await usersService.findByUsername(id);

    if (!u) throw new AppError('Usuario no encontrado', 404, 'NOT_FOUND');

    const isSelf = req.user?.userId === u.id;
    if (!isSelf && u.profile && !u.profile.is_profile_public) {
      throw new AppError('Perfil privado', 403, 'PROFILE_PRIVATE');
    }

    // Whether the viewer follows this user
    let isFollowing = false;
    if (req.user && !isSelf) {
      const follow = await prisma.socialFollow.findUnique({
        where: {
          follower_id_following_id: {
            follower_id: req.user.userId,
            following_id: u.id,
          },
        },
      });
      isFollowing = !!follow;
    }

    const data = serializeUser(u);
    sendSuccess(res, { ...data, isFollowing, isSelf });
  } catch (e) {
    next(e);
  }
}

/**
 * GET /api/users/:id/stats — public stats for a user (if allowed)
 */
export async function getUserStats(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const isUuid = /^[0-9a-f-]{36}$/i.test(id);
    const u = isUuid
      ? await usersService.findById(id)
      : await usersService.findByUsername(id);
    if (!u) throw new AppError('Usuario no encontrado', 404, 'NOT_FOUND');

    const isSelf = req.user?.userId === u.id;
    if (!isSelf && u.profile && (!u.profile.is_profile_public || !u.profile.show_stats)) {
      throw new AppError('Estadísticas privadas', 403, 'STATS_PRIVATE');
    }

    const stats = await workoutsService.stats(u.id);
    sendSuccess(res, {
      ...stats,
      recentWorkouts: stats.recentWorkouts.map((w) => ({
        id: w.id,
        title: w.title,
        durationMin: w.duration_min,
        intensity: w.intensity,
        calories: w.calories,
        workoutDate: w.workout_date,
        exercisesCount: w.exercises.length,
      })),
    });
  } catch (e) {
    next(e);
  }
}
