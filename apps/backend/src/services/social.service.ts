import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { notificationsService } from './notifications.service';

/**
 * Devuelve el nombre legible del que dispara la acción para el cuerpo
 * de la notificación. Cae a "Alguien" si no hay perfil.
 */
async function senderName(senderId: string): Promise<string> {
  const profile = await prisma.userProfile.findUnique({
    where: { user_id: senderId },
    select: { display_name: true, username: true },
  });
  return profile?.display_name ?? profile?.username ?? 'Alguien';
}

const workoutFeedSelect = {
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
  user: {
    select: {
      id: true,
      is_premium: true,
      profile: {
        select: {
          username: true,
          display_name: true,
          avatar_url: true,
        },
      },
    },
  },
  exercises: {
    select: {
      exercise: {
        select: {
          id: true,
          name: true,
          primary_muscle: true,
        },
      },
      _count: { select: { sets: true } },
    },
    orderBy: { order_idx: 'asc' as const },
    take: 8,
  },
  _count: { select: { likes: true, comments: true, exercises: true } },
} satisfies Prisma.WorkoutSelect;

export const socialService = {
  async follow(followerId: string, followingId: string) {
    if (followerId === followingId) return 'self' as const;
    const target = await prisma.user.findUnique({ where: { id: followingId } });
    if (!target) return 'not-found' as const;

    // Solo notificar si es un follow nuevo, no un re-upsert
    const existing = await prisma.socialFollow.findUnique({
      where: { follower_id_following_id: { follower_id: followerId, following_id: followingId } },
    });

    const result = await prisma.socialFollow.upsert({
      where: {
        follower_id_following_id: {
          follower_id: followerId,
          following_id: followingId,
        },
      },
      create: { follower_id: followerId, following_id: followingId },
      update: {},
    });

    if (!existing) {
      const name = await senderName(followerId);
      await notificationsService.safeCreate({
        userId: followingId,
        senderId: followerId,
        type: 'FOLLOW',
        title: `${name} te ha empezado a seguir`,
        entityId: followerId,
        entityType: 'user',
      });
    }

    return result;
  },

  async unfollow(followerId: string, followingId: string) {
    try {
      await prisma.socialFollow.delete({
        where: {
          follower_id_following_id: {
            follower_id: followerId,
            following_id: followingId,
          },
        },
      });
      return true;
    } catch {
      return false;
    }
  },

  async listFollowers(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      prisma.socialFollow.findMany({
        where: { following_id: userId },
        select: {
          created_at: true,
          follower: {
            select: {
              id: true,
              profile: {
                select: {
                  username: true,
                  display_name: true,
                  avatar_url: true,
                  bio: true,
                },
              },
            },
          },
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      prisma.socialFollow.count({ where: { following_id: userId } }),
    ]);
    return { items, total, page, limit };
  },

  async listFollowing(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      prisma.socialFollow.findMany({
        where: { follower_id: userId },
        select: {
          created_at: true,
          following: {
            select: {
              id: true,
              profile: {
                select: {
                  username: true,
                  display_name: true,
                  avatar_url: true,
                  bio: true,
                },
              },
            },
          },
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      prisma.socialFollow.count({ where: { follower_id: userId } }),
    ]);
    return { items, total, page, limit };
  },

  async like(userId: string, workoutId: string) {
    const workout = await prisma.workout.findUnique({
      where: { id: workoutId },
      select: { id: true, user_id: true, title: true },
    });
    if (!workout) return 'not-found' as const;

    const existing = await prisma.socialLike.findUnique({
      where: { user_id_workout_id: { user_id: userId, workout_id: workoutId } },
    });

    const result = await prisma.socialLike.upsert({
      where: { user_id_workout_id: { user_id: userId, workout_id: workoutId } },
      create: { user_id: userId, workout_id: workoutId },
      update: {},
    });

    if (!existing) {
      const name = await senderName(userId);
      await notificationsService.safeCreate({
        userId: workout.user_id,
        senderId: userId,
        type: 'LIKE',
        title: `${name} dio like a tu entrenamiento`,
        body: workout.title,
        entityId: workout.id,
        entityType: 'workout',
      });
    }

    return result;
  },

  async unlike(userId: string, workoutId: string) {
    try {
      await prisma.socialLike.delete({
        where: { user_id_workout_id: { user_id: userId, workout_id: workoutId } },
      });
      return true;
    } catch {
      return false;
    }
  },

  async listLikes(workoutId: string, page = 1, limit = 30) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      prisma.socialLike.findMany({
        where: { workout_id: workoutId },
        select: {
          created_at: true,
          user: {
            select: {
              id: true,
              profile: {
                select: { username: true, display_name: true, avatar_url: true },
              },
            },
          },
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      prisma.socialLike.count({ where: { workout_id: workoutId } }),
    ]);
    return { items, total };
  },

  async addComment(userId: string, workoutId: string, content: string) {
    const workout = await prisma.workout.findUnique({
      where: { id: workoutId },
      select: { id: true, user_id: true, title: true },
    });
    if (!workout) return 'not-found' as const;

    const created = await prisma.socialComment.create({
      data: { user_id: userId, workout_id: workoutId, content },
      select: {
        id: true,
        content: true,
        created_at: true,
        user: {
          select: {
            id: true,
            profile: { select: { username: true, display_name: true, avatar_url: true } },
          },
        },
      },
    });

    const name = await senderName(userId);
    await notificationsService.safeCreate({
      userId: workout.user_id,
      senderId: userId,
      type: 'COMMENT',
      title: `${name} comentó en tu entrenamiento`,
      body: content.length > 100 ? content.slice(0, 100) + '…' : content,
      entityId: workout.id,
      entityType: 'workout',
    });

    return created;
  },

  async listComments(workoutId: string, page = 1, limit = 30) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      prisma.socialComment.findMany({
        where: { workout_id: workoutId },
        select: {
          id: true,
          content: true,
          created_at: true,
          user: {
            select: {
              id: true,
              profile: { select: { username: true, display_name: true, avatar_url: true } },
            },
          },
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      prisma.socialComment.count({ where: { workout_id: workoutId } }),
    ]);
    return { items, total };
  },

  async deleteComment(commentId: string, userId: string, isAdmin = false) {
    const comment = await prisma.socialComment.findUnique({ where: { id: commentId } });
    if (!comment) return 'not-found' as const;
    if (!isAdmin && comment.user_id !== userId) return 'forbidden' as const;
    await prisma.socialComment.delete({ where: { id: commentId } });
    return true;
  },

  async feed(userId: string, cursor: string | undefined, limit: number, viewerLikes = true) {
    const following = await prisma.socialFollow.findMany({
      where: { follower_id: userId },
      select: { following_id: true },
    });
    const followingIds = following.map((f) => f.following_id);
    const userIds = Array.from(new Set([userId, ...followingIds]));

    const where: Prisma.WorkoutWhereInput = {
      user_id: { in: userIds },
      is_public: true,
    };

    let cursorObj: Prisma.WorkoutWhereUniqueInput | undefined;
    if (cursor) cursorObj = { id: cursor };

    const items = await prisma.workout.findMany({
      where,
      select: workoutFeedSelect,
      orderBy: [{ workout_date: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(cursorObj && { cursor: cursorObj, skip: 1 }),
    });

    const hasMore = items.length > limit;
    const slice = hasMore ? items.slice(0, limit) : items;

    let likedIds = new Set<string>();
    if (viewerLikes && slice.length > 0) {
      const likes = await prisma.socialLike.findMany({
        where: { user_id: userId, workout_id: { in: slice.map((w) => w.id) } },
        select: { workout_id: true },
      });
      likedIds = new Set(likes.map((l) => l.workout_id));
    }

    return {
      items: slice.map((w) => ({ ...w, viewerLiked: likedIds.has(w.id) })),
      nextCursor: hasMore ? slice[slice.length - 1].id : null,
    };
  },

  async explore(viewerId: string | undefined, cursor: string | undefined, limit: number) {
    const where: Prisma.WorkoutWhereInput = { is_public: true };
    let cursorObj: Prisma.WorkoutWhereUniqueInput | undefined;
    if (cursor) cursorObj = { id: cursor };

    const items = await prisma.workout.findMany({
      where,
      select: workoutFeedSelect,
      orderBy: [{ workout_date: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(cursorObj && { cursor: cursorObj, skip: 1 }),
    });

    const hasMore = items.length > limit;
    const slice = hasMore ? items.slice(0, limit) : items;

    let likedIds = new Set<string>();
    if (viewerId && slice.length > 0) {
      const likes = await prisma.socialLike.findMany({
        where: { user_id: viewerId, workout_id: { in: slice.map((w) => w.id) } },
        select: { workout_id: true },
      });
      likedIds = new Set(likes.map((l) => l.workout_id));
    }

    return {
      items: slice.map((w) => ({ ...w, viewerLiked: likedIds.has(w.id) })),
      nextCursor: hasMore ? slice[slice.length - 1].id : null,
    };
  },

  async suggestedUsers(viewerId: string, limit = 6) {
    const alreadyFollowing = await prisma.socialFollow.findMany({
      where: { follower_id: viewerId },
      select: { following_id: true },
    });
    const exclude = [viewerId, ...alreadyFollowing.map((f) => f.following_id)];

    return prisma.user.findMany({
      where: {
        id: { notIn: exclude },
        status: 'ACTIVE',
        profile: { is_profile_public: true, onboarding_completed: true },
      },
      select: {
        id: true,
        is_premium: true,
        profile: {
          select: {
            username: true,
            display_name: true,
            avatar_url: true,
            bio: true,
            experience_level: true,
          },
        },
        _count: { select: { followers: true, workouts: true } },
      },
      orderBy: { followers: { _count: 'desc' } },
      take: limit,
    });
  },
};

export type FeedItem = Awaited<ReturnType<typeof socialService.feed>>['items'][number];
