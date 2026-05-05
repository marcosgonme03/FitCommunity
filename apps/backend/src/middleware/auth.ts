import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { verifyAccessToken } from '../utils/jwt';
import { AppError } from './errorHandler';
import { UserRole } from '@prisma/client';
import { prisma } from '../lib/prisma';

/**
 * Require a valid JWT access token
 */
export function requireAuth(req: AuthRequest, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    throw new AppError('Token de autenticación requerido', 401, 'UNAUTHORIZED');
  }

  const token = authHeader.slice(7);

  try {
    const payload = verifyAccessToken(token);
    req.user = {
      userId: payload.userId,
      email: payload.email,
      role: payload.role as UserRole,
    };
    next();
  } catch {
    throw new AppError('Token inválido o expirado', 401, 'TOKEN_INVALID');
  }
}

/**
 * Require admin role
 */
export function requireAdmin(req: AuthRequest, _res: Response, next: NextFunction): void {
  if (!req.user) {
    throw new AppError('No autenticado', 401, 'UNAUTHORIZED');
  }

  if (req.user.role !== UserRole.ADMIN) {
    throw new AppError('Acceso denegado — se requiere rol admin', 403, 'FORBIDDEN');
  }

  next();
}

/**
 * Require an active Premium subscription (or ADMIN bypass).
 * Reads the current is_premium flag from the DB so revoked subscriptions
 * are enforced even if the JWT is still valid.
 */
export async function requirePremium(
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('No autenticado', 401, 'UNAUTHORIZED');
    }
    if (req.user.role === UserRole.ADMIN) {
      return next();
    }
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { is_premium: true },
    });
    if (!user?.is_premium) {
      throw new AppError(
        'Esta función está disponible solo para usuarios Premium',
        402,
        'PREMIUM_REQUIRED'
      );
    }
    next();
  } catch (e) {
    next(e);
  }
}

/**
 * Optional auth — attaches user if token is present but doesn't require it
 */
export function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const payload = verifyAccessToken(token);
      req.user = {
        userId: payload.userId,
        email: payload.email,
        role: payload.role as UserRole,
      };
    } catch {
      // Ignore — optional auth
    }
  }

  next();
}
