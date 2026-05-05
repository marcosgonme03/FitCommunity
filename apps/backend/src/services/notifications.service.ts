import { NotificationType, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';

/**
 * Notification service.
 *
 * Crea notificaciones cuando:
 *  - Un usuario recibe un like en su workout (LIKE)
 *  - Un usuario recibe un comentario en su workout (COMMENT)
 *  - Un usuario es seguido por otro (FOLLOW)
 *  - Un usuario consigue un nuevo PR (PR_ACHIEVED) — disparado desde workouts
 *  - Un usuario gana un badge (BADGE_EARNED) — futuro
 *  - El admin envía un broadcast (SYSTEM)
 *
 * Las notificaciones nunca se crean para uno mismo (autoacciones).
 * Los errores al crear notifs se loggean pero no rompen el flujo principal,
 * para que un fallo aquí no tumbe un like/comment.
 */
export const notificationsService = {
  /**
   * Crea una notificación de forma "fire and forget" — atrapa errores y los loggea.
   */
  async safeCreate(input: {
    userId: string;
    senderId?: string | null;
    type: NotificationType;
    title: string;
    body?: string;
    entityId?: string;
    entityType?: string;
  }) {
    // Nunca notificar al propio usuario (e.g. like de tu propio workout)
    if (input.senderId && input.senderId === input.userId) return null;

    try {
      return await prisma.notification.create({
        data: {
          user_id: input.userId,
          sender_id: input.senderId ?? null,
          type: input.type,
          title: input.title,
          body: input.body ?? null,
          entity_id: input.entityId ?? null,
          entity_type: input.entityType ?? null,
        },
      });
    } catch (e) {
      logger.warn('Notification create failed:', { input, error: (e as Error).message });
      return null;
    }
  },

  /**
   * Lista paginada de notificaciones para el usuario.
   */
  async list(userId: string, opts: { page: number; limit: number; unreadOnly?: boolean }) {
    const where: Prisma.NotificationWhereInput = { user_id: userId };
    if (opts.unreadOnly) where.is_read = false;

    const skip = (opts.page - 1) * opts.limit;
    const [items, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        select: {
          id: true,
          type: true,
          title: true,
          body: true,
          entity_id: true,
          entity_type: true,
          is_read: true,
          created_at: true,
          read_at: true,
          sender: {
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
        take: opts.limit,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { user_id: userId, is_read: false } }),
    ]);

    return {
      items,
      pagination: {
        page: opts.page,
        limit: opts.limit,
        total,
        totalPages: Math.ceil(total / opts.limit) || 1,
        hasNextPage: skip + items.length < total,
        hasPrevPage: opts.page > 1,
      },
      unreadCount,
    };
  },

  /**
   * Cuenta de no leídas (usado por el badge de la campana — endpoint barato).
   */
  async unreadCount(userId: string): Promise<number> {
    return prisma.notification.count({
      where: { user_id: userId, is_read: false },
    });
  },

  /**
   * Marca una notificación como leída. Solo permite marcar las propias.
   */
  async markRead(userId: string, notificationId: string) {
    const result = await prisma.notification.updateMany({
      where: { id: notificationId, user_id: userId, is_read: false },
      data: { is_read: true, read_at: new Date() },
    });
    return result.count > 0;
  },

  /**
   * Marca todas las notificaciones del usuario como leídas.
   */
  async markAllRead(userId: string): Promise<number> {
    const result = await prisma.notification.updateMany({
      where: { user_id: userId, is_read: false },
      data: { is_read: true, read_at: new Date() },
    });
    return result.count;
  },

  /**
   * Borra una notificación propia.
   */
  async delete(userId: string, notificationId: string): Promise<boolean> {
    const result = await prisma.notification.deleteMany({
      where: { id: notificationId, user_id: userId },
    });
    return result.count > 0;
  },

  /**
   * Borra todas las notificaciones leídas del usuario (limpieza).
   */
  async clearRead(userId: string): Promise<number> {
    const result = await prisma.notification.deleteMany({
      where: { user_id: userId, is_read: true },
    });
    return result.count;
  },
};
