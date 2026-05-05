import rateLimit from 'express-rate-limit';
import { config } from '../config';
import { Request, Response } from 'express';

const rateLimitHandler = (_req: Request, res: Response) => {
  res.status(429).json({
    success: false,
    error: 'Demasiadas peticiones. Por favor espera antes de intentarlo de nuevo.',
    code: 'RATE_LIMIT_EXCEEDED',
  });
};

/**
 * General API rate limiter
 */
export const generalRateLimiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

/**
 * Rate limiter para endpoints de autenticación (register, login).
 *
 * Sólo cuenta peticiones que terminan en error (4xx/5xx) — un login correcto
 * no penaliza, así un usuario legítimo que recuerda mal una contraseña no se
 * queda fuera tras un par de intentos exitosos previos.
 *
 * El máximo es generoso (20 fallos / 15 min / IP) porque en redes con NAT
 * (oficinas, móvil 4G) muchos usuarios comparten IP, y queremos proteger contra
 * fuerza bruta sin lockear a usuarios legítimos.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: Math.max(config.AUTH_RATE_LIMIT_MAX, 20),
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => req.ip ?? 'unknown',
});

/**
 * Very strict limiter for sensitive endpoints (password reset, 2FA)
 */
export const sensitiveRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});
