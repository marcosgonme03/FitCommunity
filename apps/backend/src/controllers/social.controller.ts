import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { socialService, FeedItem } from '../services/social.service';
import { sendSuccess } from '../utils/apiResponse';
import { AppError } from '../middleware/errorHandler';
import { CommentInput, FeedQuery } from '../validators/social.validators';

function serializeFeedItem(w: FeedItem) {
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
    exercisesCount: w._count.exercises,
    exercisesPreview: w.exercises.map((we) => ({
      name: we.exercise.name,
      primaryMuscle: we.exercise.primary_muscle,
      setsCount: we._count.sets,
    })),
    viewerLiked: w.viewerLiked,
    user: {
      id: w.user.id,
      isPremium: w.user.is_premium,
      username: w.user.profile?.username ?? null,
      displayName: w.user.profile?.display_name ?? null,
      avatarUrl: w.user.profile?.avatar_url ?? null,
    },
  };
}

// ─── Follows ─────────────────────────────────────────────────────────────────

export async function followUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError('No autenticado', 401, 'UNAUTHORIZED');
    const { id } = req.params;
    const result = await socialService.follow(req.user.userId, id);
    if (result === 'self') throw new AppError('No puedes seguirte a ti mismo', 400, 'INVALID_FOLLOW');
    if (result === 'not-found') throw new AppError('Usuario no encontrado', 404, 'NOT_FOUND');
    sendSuccess(res, { followingId: id }, { message: 'Ahora sigues a este usuario' });
  } catch (e) {
    next(e);
  }
}

export async function unfollowUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError('No autenticado', 401, 'UNAUTHORIZED');
    const { id } = req.params;
    await socialService.unfollow(req.user.userId, id);
    sendSuccess(res, { followingId: id }, { message: 'Has dejado de seguir' });
  } catch (e) {
    next(e);
  }
}

export async function listFollowers(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const page = Number(req.query.page ?? 1);
    const limit = Math.min(50, Number(req.query.limit ?? 20));
    const result = await socialService.listFollowers(id, page, limit);
    sendSuccess(res, {
      items: result.items.map((f) => ({
        id: f.follower.id,
        username: f.follower.profile?.username ?? null,
        displayName: f.follower.profile?.display_name ?? null,
        avatarUrl: f.follower.profile?.avatar_url ?? null,
        bio: f.follower.profile?.bio ?? null,
        followedAt: f.created_at,
      })),
      total: result.total,
    });
  } catch (e) {
    next(e);
  }
}

export async function listFollowing(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const page = Number(req.query.page ?? 1);
    const limit = Math.min(50, Number(req.query.limit ?? 20));
    const result = await socialService.listFollowing(id, page, limit);
    sendSuccess(res, {
      items: result.items.map((f) => ({
        id: f.following.id,
        username: f.following.profile?.username ?? null,
        displayName: f.following.profile?.display_name ?? null,
        avatarUrl: f.following.profile?.avatar_url ?? null,
        bio: f.following.profile?.bio ?? null,
        followedAt: f.created_at,
      })),
      total: result.total,
    });
  } catch (e) {
    next(e);
  }
}

// ─── Likes ───────────────────────────────────────────────────────────────────

export async function likeWorkout(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError('No autenticado', 401, 'UNAUTHORIZED');
    const { id } = req.params;
    const result = await socialService.like(req.user.userId, id);
    if (result === 'not-found') throw new AppError('Entrenamiento no encontrado', 404, 'NOT_FOUND');
    sendSuccess(res, { workoutId: id, liked: true });
  } catch (e) {
    next(e);
  }
}

export async function unlikeWorkout(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError('No autenticado', 401, 'UNAUTHORIZED');
    const { id } = req.params;
    await socialService.unlike(req.user.userId, id);
    sendSuccess(res, { workoutId: id, liked: false });
  } catch (e) {
    next(e);
  }
}

export async function listLikes(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const page = Number(req.query.page ?? 1);
    const limit = Math.min(50, Number(req.query.limit ?? 30));
    const result = await socialService.listLikes(id, page, limit);
    sendSuccess(res, {
      items: result.items.map((l) => ({
        id: l.user.id,
        username: l.user.profile?.username ?? null,
        displayName: l.user.profile?.display_name ?? null,
        avatarUrl: l.user.profile?.avatar_url ?? null,
        likedAt: l.created_at,
      })),
      total: result.total,
    });
  } catch (e) {
    next(e);
  }
}

// ─── Comments ────────────────────────────────────────────────────────────────

export async function addComment(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError('No autenticado', 401, 'UNAUTHORIZED');
    const { id } = req.params;
    const { content } = req.body as CommentInput;
    const result = await socialService.addComment(req.user.userId, id, content);
    if (result === 'not-found') throw new AppError('Entrenamiento no encontrado', 404, 'NOT_FOUND');
    sendSuccess(res, {
      id: result.id,
      content: result.content,
      createdAt: result.created_at,
      user: {
        id: result.user.id,
        username: result.user.profile?.username ?? null,
        displayName: result.user.profile?.display_name ?? null,
        avatarUrl: result.user.profile?.avatar_url ?? null,
      },
    }, { statusCode: 201 });
  } catch (e) {
    next(e);
  }
}

export async function listComments(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const page = Number(req.query.page ?? 1);
    const limit = Math.min(50, Number(req.query.limit ?? 30));
    const result = await socialService.listComments(id, page, limit);
    sendSuccess(res, {
      items: result.items.map((c) => ({
        id: c.id,
        content: c.content,
        createdAt: c.created_at,
        user: {
          id: c.user.id,
          username: c.user.profile?.username ?? null,
          displayName: c.user.profile?.display_name ?? null,
          avatarUrl: c.user.profile?.avatar_url ?? null,
        },
      })),
      total: result.total,
    });
  } catch (e) {
    next(e);
  }
}

export async function deleteComment(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError('No autenticado', 401, 'UNAUTHORIZED');
    const { commentId } = req.params;
    const result = await socialService.deleteComment(commentId, req.user.userId, req.user.role === 'ADMIN');
    if (result === 'not-found') throw new AppError('Comentario no encontrado', 404, 'NOT_FOUND');
    if (result === 'forbidden') throw new AppError('No puedes borrar este comentario', 403, 'FORBIDDEN');
    sendSuccess(res, { id: commentId }, { message: 'Comentario eliminado' });
  } catch (e) {
    next(e);
  }
}

// ─── Feed ────────────────────────────────────────────────────────────────────

export async function feed(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError('No autenticado', 401, 'UNAUTHORIZED');
    const { cursor, limit } = req.query as unknown as FeedQuery;
    const result = await socialService.feed(req.user.userId, cursor, limit);
    sendSuccess(res, {
      items: result.items.map(serializeFeedItem),
      nextCursor: result.nextCursor,
    });
  } catch (e) {
    next(e);
  }
}

export async function explore(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { cursor, limit } = req.query as unknown as FeedQuery;
    const result = await socialService.explore(req.user?.userId, cursor, limit);
    sendSuccess(res, {
      items: result.items.map(serializeFeedItem),
      nextCursor: result.nextCursor,
    });
  } catch (e) {
    next(e);
  }
}

export async function suggestedUsers(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError('No autenticado', 401, 'UNAUTHORIZED');
    const limit = Math.min(20, Number(req.query.limit ?? 6));
    const items = await socialService.suggestedUsers(req.user.userId, limit);
    sendSuccess(res, {
      items: items.map((u) => ({
        id: u.id,
        isPremium: u.is_premium,
        username: u.profile?.username ?? null,
        displayName: u.profile?.display_name ?? null,
        avatarUrl: u.profile?.avatar_url ?? null,
        bio: u.profile?.bio ?? null,
        experienceLevel: u.profile?.experience_level ?? null,
        followersCount: u._count.followers,
        workoutsCount: u._count.workouts,
      })),
    });
  } catch (e) {
    next(e);
  }
}
