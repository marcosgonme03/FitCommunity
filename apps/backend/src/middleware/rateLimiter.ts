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
 * Strict auth rate limiter (register, login, forgot-password)
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: config.AUTH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  skipSuccessfulRequests: false,
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
