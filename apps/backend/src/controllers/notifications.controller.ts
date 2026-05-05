import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { notificationsService } from '../services/notifications.service';
import { sendSuccess, sendPaginated } from '../utils/apiResponse';
import { AppError } from '../middleware/errorHandler';
import { ListNotificationsQuery } from '../validators/notifications.validators';

export async function listNotifications(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError('No autenticado', 401, 'UNAUTHORIZED');
    const q = req.query as unknown as ListNotificationsQuery;
    const result = await notificationsService.list(req.user.userId, {
      page: q.page,
      limit: q.limit,
      unreadOnly: q.unreadOnly,
    });
    sendPaginated(res, result.items, result.pagination, { unreadCount: result.unreadCount });
  } catch (e) {
    next(e);
  }
}

export async function unreadCount(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError('No autenticado', 401, 'UNAUTHORIZED');
    const count = await notificationsService.unreadCount(req.user.userId);
    sendSuccess(res, { unreadCount: count });
  } catch (e) {
    next(e);
  }
}

export async function markAsRead(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError('No autenticado', 401, 'UNAUTHORIZED');
    const { id } = req.params;
    const ok = await notificationsService.markRead(req.user.userId, id);
    if (!ok) throw new AppError('Notificación no encontrada o ya leída', 404, 'NOT_FOUND');
    sendSuccess(res, { id, isRead: true });
  } catch (e) {
    next(e);
  }
}

export async function markAllAsRead(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError('No autenticado', 401, 'UNAUTHORIZED');
    const updated = await notificationsService.markAllRead(req.user.userId);
    sendSuccess(res, { updatedCount: updated }, { message: 'Todas las notificaciones marcadas como leídas' });
  } catch (e) {
    next(e);
  }
}

export async function deleteNotification(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError('No autenticado', 401, 'UNAUTHORIZED');
    const { id } = req.params;
    const ok = await notificationsService.delete(req.user.userId, id);
    if (!ok) throw new AppError('Notificación no encontrada', 404, 'NOT_FOUND');
    sendSuccess(res, { id }, { message: 'Notificación eliminada' });
  } catch (e) {
    next(e);
  }
}

export async function clearRead(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError('No autenticado', 401, 'UNAUTHORIZED');
    const deleted = await notificationsService.clearRead(req.user.userId);
    sendSuccess(res, { deletedCount: deleted }, { message: 'Notificaciones leídas eliminadas' });
  } catch (e) {
    next(e);
  }
}
