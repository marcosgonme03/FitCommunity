import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { adminService } from '../services/admin.service';
import { sendSuccess, sendPaginated } from '../utils/apiResponse';
import { AppError } from '../middleware/errorHandler';
import { prisma } from '../lib/prisma';
import { redis } from '../lib/redis';
import {
  BanUserInput,
  UpdateRoleInput,
  BroadcastInput,
  DirectMessageInput,
} from '../validators/admin.validators';
import { BroadcastSegment } from '@prisma/client';

const getIp = (req: AuthRequest) =>
  (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.ip;

// ─── System health ───────────────────────────────────────────────────────────

type ServiceStatus = { status: 'ok' | 'error'; latencyMs?: number; message?: string };

/**
 * GET /api/admin/health — real-time health check of all backing services.
 * Pings the database and Redis, returns per-service status + latency.
 */
export async function systemHealth(_req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const checks: Record<string, ServiceStatus> = {};

    // ── Database ──────────────────────────────────────────────────────────
    const dbStart = Date.now();
    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.database = { status: 'ok', latencyMs: Date.now() - dbStart };
    } catch (err) {
      checks.database = {
        status: 'error',
        latencyMs: Date.now() - dbStart,
        message: err instanceof Error ? err.message : 'Database unreachable',
      };
    }

    // ── Redis ─────────────────────────────────────────────────────────────
    const redisStart = Date.now();
    try {
      await redis.ping();
      checks.redis = { status: 'ok', latencyMs: Date.now() - redisStart };
    } catch {
      checks.redis = {
        status: 'error',
        latencyMs: Date.now() - redisStart,
        message: 'Redis unreachable',
      };
    }

    const allOk = Object.values(checks).every((c) => c.status === 'ok');
    const overallStatus = allOk ? 'ok' : 'degraded';

    res.status(allOk ? 200 : 503).json({
      success: true,
      data: {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
        checks,
      },
    });
  } catch (e) {
    next(e);
  }
}

// ─── Users ──────────────────────────────────────────────────────────────────

export async function listUsers(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const q = req.query as unknown as {
      page: number; limit: number;
      search?: string;
      status?: 'ACTIVE' | 'INACTIVE' | 'BANNED' | 'PENDING_VERIFICATION';
      role?: 'USER' | 'ADMIN';
      isPremium?: string | boolean;
    };
    let isPremium: boolean | undefined;
    if (q.isPremium === true || q.isPremium === 'true') isPremium = true;
    else if (q.isPremium === false || q.isPremium === 'false') isPremium = false;

    const result = await adminService.listUsers({
      page: q.page,
      limit: q.limit,
      search: q.search,
      status: q.status,
      role: q.role,
      isPremium,
    });
    sendPaginated(res, result.items, result.pagination);
  } catch (e) {
    next(e);
  }
}

export async function setPremium(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError('No autenticado', 401, 'UNAUTHORIZED');
    const { id } = req.params;
    const { isPremium } = req.body as { isPremium?: boolean };
    if (typeof isPremium !== 'boolean') {
      throw new AppError('Falta el campo isPremium (boolean)', 400, 'INVALID');
    }
    const result = await adminService.setPremium(req.user.userId, id, isPremium, getIp(req));
    if (result === 'not-found') throw new AppError('Usuario no encontrado', 404, 'NOT_FOUND');
    sendSuccess(
      res,
      { id, isPremium },
      { message: isPremium ? 'Premium activado' : 'Premium revocado' }
    );
  } catch (e) {
    next(e);
  }
}

export async function getUserDetails(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const result = await adminService.getUserDetails(id);
    if (!result) throw new AppError('Usuario no encontrado', 404, 'NOT_FOUND');
    sendSuccess(res, result);
  } catch (e) {
    next(e);
  }
}

export async function forceLogoutUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError('No autenticado', 401, 'UNAUTHORIZED');
    const { id } = req.params;
    const result = await adminService.forceLogoutUser(req.user.userId, id, getIp(req));
    if (result === 'not-found') throw new AppError('Usuario no encontrado', 404, 'NOT_FOUND');
    sendSuccess(res, result, { message: `${result.sessionsRevoked} sesiones cerradas` });
  } catch (e) {
    next(e);
  }
}

export async function forceVerifyEmail(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError('No autenticado', 401, 'UNAUTHORIZED');
    const { id } = req.params;
    const result = await adminService.forceVerifyEmail(req.user.userId, id, getIp(req));
    if (result === 'not-found') throw new AppError('Usuario no encontrado', 404, 'NOT_FOUND');
    if (result === 'already-verified') {
      sendSuccess(res, { alreadyVerified: true }, { message: 'El email ya estaba verificado' });
      return;
    }
    sendSuccess(res, { id }, { message: 'Email verificado manualmente' });
  } catch (e) {
    next(e);
  }
}

export async function usersSummary(_req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await adminService.usersSummary();
    sendSuccess(res, result);
  } catch (e) {
    next(e);
  }
}

export async function activityFeed(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 30;
    const result = await adminService.activityFeed(Number.isFinite(limit) ? limit : 30);
    sendSuccess(res, result);
  } catch (e) {
    next(e);
  }
}

export async function exportUsersCsv(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const q = req.query as {
      search?: string;
      status?: 'ACTIVE' | 'INACTIVE' | 'BANNED' | 'PENDING_VERIFICATION';
      role?: 'USER' | 'ADMIN';
      isPremium?: string | boolean;
    };
    let isPremium: boolean | undefined;
    if (q.isPremium === true || q.isPremium === 'true') isPremium = true;
    else if (q.isPremium === false || q.isPremium === 'false') isPremium = false;

    const csv = await adminService.exportUsersCsv({
      search: q.search,
      status: q.status,
      role: q.role,
      isPremium,
    });

    const filename = `fitcommunity-users-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-store');
    // BOM UTF-8 para que Excel detecte bien acentos
    res.write('﻿');
    res.end(csv);
  } catch (e) {
    next(e);
  }
}

export async function banUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError('No autenticado', 401, 'UNAUTHORIZED');
    const { id } = req.params;
    const { reason } = req.body as BanUserInput;
    const result = await adminService.banUser(req.user.userId, id, reason, getIp(req));
    if (result === 'self') throw new AppError('No puedes banearte a ti mismo', 400, 'INVALID');
    if (result === 'not-found') throw new AppError('Usuario no encontrado', 404, 'NOT_FOUND');
    if (result === 'cannot-ban-admin') throw new AppError('No puedes banear a otro admin', 403, 'FORBIDDEN');
    sendSuccess(res, { id }, { message: 'Usuario baneado' });
  } catch (e) {
    next(e);
  }
}

export async function unbanUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError('No autenticado', 401, 'UNAUTHORIZED');
    const { id } = req.params;
    const result = await adminService.unbanUser(req.user.userId, id, getIp(req));
    if (result === 'not-found') throw new AppError('Usuario no encontrado', 404, 'NOT_FOUND');
    sendSuccess(res, { id }, { message: 'Usuario desbaneado' });
  } catch (e) {
    next(e);
  }
}

export async function deleteUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError('No autenticado', 401, 'UNAUTHORIZED');
    const { id } = req.params;
    const result = await adminService.deleteUser(req.user.userId, id, getIp(req));
    if (result === 'self') throw new AppError('No puedes borrarte a ti mismo', 400, 'INVALID');
    if (result === 'not-found') throw new AppError('Usuario no encontrado', 404, 'NOT_FOUND');
    if (result === 'cannot-delete-admin') throw new AppError('No puedes borrar a otro admin', 403, 'FORBIDDEN');
    sendSuccess(res, { id }, { message: 'Usuario eliminado' });
  } catch (e) {
    next(e);
  }
}

export async function updateUserRole(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError('No autenticado', 401, 'UNAUTHORIZED');
    const { id } = req.params;
    const { role } = req.body as UpdateRoleInput;
    const result = await adminService.updateUserRole(req.user.userId, id, role, getIp(req));
    if (result === 'not-found') throw new AppError('Usuario no encontrado', 404, 'NOT_FOUND');
    sendSuccess(res, { id, role }, { message: 'Rol actualizado' });
  } catch (e) {
    next(e);
  }
}

// ─── Workouts moderation ────────────────────────────────────────────────────

export async function listWorkouts(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const q = req.query as unknown as { page: number; limit: number; search?: string };
    const result = await adminService.listWorkouts(q);
    sendPaginated(res, result.items, result.pagination);
  } catch (e) {
    next(e);
  }
}

export async function deleteWorkout(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError('No autenticado', 401, 'UNAUTHORIZED');
    const { id } = req.params;
    const result = await adminService.deleteWorkoutAdmin(req.user.userId, id, getIp(req));
    if (result === 'not-found') throw new AppError('Entrenamiento no encontrado', 404, 'NOT_FOUND');
    sendSuccess(res, { id }, { message: 'Entrenamiento eliminado' });
  } catch (e) {
    next(e);
  }
}

// ─── Analytics ──────────────────────────────────────────────────────────────

export async function overview(_req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await adminService.overview();
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
}

export async function usersGrowth(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const days = Math.min(365, Number(req.query.days ?? 30));
    const data = await adminService.usersGrowth(days);
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
}

export async function workoutsStats(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const days = Math.min(365, Number(req.query.days ?? 30));
    const data = await adminService.workoutsStats(days);
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
}

// ─── Subscriptions (Premium) ────────────────────────────────────────────────

export async function listSubscriptions(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const q = req.query as unknown as {
      page: number;
      limit: number;
      search?: string;
      status?: 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'INCOMPLETE' | 'INCOMPLETE_EXPIRED' | 'TRIALING' | 'UNPAID';
    };
    const result = await adminService.listSubscriptions({
      page: q.page,
      limit: q.limit,
      search: q.search,
      status: q.status,
    });
    sendPaginated(res, result.items, result.pagination);
  } catch (e) {
    next(e);
  }
}

export async function revenueGrowth(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const days = Math.min(365, Number(req.query.days ?? 30));
    const data = await adminService.revenueGrowth(days);
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
}

export async function adminLogs(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = Math.max(1, Number(req.query.page ?? 1));
    const limit = Math.min(100, Number(req.query.limit ?? 50));
    const data = await adminService.listAdminLogs(page, limit);
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
}

// ─── Broadcasts ─────────────────────────────────────────────────────────────

/**
 * GET /admin/broadcasts/preview?segment=INACTIVE_7D
 * Devuelve cuántos usuarios recibirán el mensaje antes de confirmar.
 */
export async function broadcastPreview(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const segment = req.query.segment as BroadcastSegment;
    const data = await adminService.previewBroadcast(segment);
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
}

/**
 * POST /admin/broadcasts
 * Envía una notificación masiva al segmento elegido.
 */
export async function sendBroadcast(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError('No autenticado', 401, 'UNAUTHORIZED');
    const { title, body, segment, templateKey } = req.body as BroadcastInput;
    const result = await adminService.sendBroadcast(
      req.user.userId,
      { title, body, segment: segment as BroadcastSegment, templateKey },
      getIp(req)
    );
    sendSuccess(res, result, {
      message: `Notificación enviada a ${result.recipients} usuario${result.recipients !== 1 ? 's' : ''}`,
    });
  } catch (e) {
    next(e);
  }
}

/**
 * GET /admin/broadcasts
 * Historial de campañas enviadas.
 */
export async function listCampaigns(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = Math.max(1, Number(req.query.page ?? 1));
    const limit = Math.min(100, Number(req.query.limit ?? 20));
    const result = await adminService.listCampaigns({ page, limit });
    sendPaginated(res, result.items, result.pagination);
  } catch (e) {
    next(e);
  }
}

/**
 * POST /admin/users/:id/message
 * Envía un mensaje directo (notificación SYSTEM) a un usuario específico.
 */
export async function sendDirectMessage(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError('No autenticado', 401, 'UNAUTHORIZED');
    const { id } = req.params;
    const { title, body } = req.body as DirectMessageInput;
    const result = await adminService.sendDirectMessage(req.user.userId, id, { title, body }, getIp(req));
    if (result === 'not-found') throw new AppError('Usuario no encontrado', 404, 'NOT_FOUND');
    sendSuccess(res, { userId: id }, { message: 'Mensaje enviado al usuario' });
  } catch (e) {
    next(e);
  }
}
