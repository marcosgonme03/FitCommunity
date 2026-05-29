import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { Prisma } from '@prisma/client';
import { logger } from '../utils/logger';

export class AppError extends Error {
  constructor(
    public readonly message: string,
    public readonly statusCode: number = 400,
    public readonly code?: string,
    public readonly data?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Centralized error handler middleware
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Known application error
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      ...(err.code && { code: err.code }),
      ...(err.data && { data: err.data }),
    });
    return;
  }

  // Zod validation error
  if (err instanceof ZodError) {
    const messages = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
    res.status(422).json({
      success: false,
      error: 'Datos de entrada inválidos',
      code: 'VALIDATION_ERROR',
      details: err.errors,
      message: messages,
    });
    return;
  }

  // JWT errors
  if (err instanceof TokenExpiredError) {
    res.status(401).json({
      success: false,
      error: 'Token expirado',
      code: 'TOKEN_EXPIRED',
    });
    return;
  }

  if (err instanceof JsonWebTokenError) {
    res.status(401).json({
      success: false,
      error: 'Token inválido',
      code: 'TOKEN_INVALID',
    });
    return;
  }

  // Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const field = (err.meta?.target as string[])?.join(', ') ?? 'campo';
      res.status(409).json({
        success: false,
        error: `Ya existe un registro con ese ${field}`,
        code: 'DUPLICATE_ENTRY',
      });
      return;
    }

    if (err.code === 'P2025') {
      res.status(404).json({
        success: false,
        error: 'Registro no encontrado',
        code: 'NOT_FOUND',
      });
      return;
    }
  }

  // Unexpected error — log it
  logger.error('Unhandled error:', err);

  res.status(500).json({
    success: false,
    error: 'Error interno del servidor',
    code: 'INTERNAL_ERROR',
  });
}

/**
 * 404 handler
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: `Ruta no encontrada: ${req.method} ${req.path}`,
    code: 'NOT_FOUND',
  });
}
