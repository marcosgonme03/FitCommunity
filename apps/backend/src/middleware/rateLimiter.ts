import rateLimit from 'express-rate-limit';
import { config } from '../config';
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';

const rateLimitHandler = (_req: Request, res: Response) => {
  res.status(429).json({
    success: false,
    error: 'Demasiadas peticiones. Por favor espera antes de intentarlo de nuevo.',
    code: 'RATE_LIMIT_EXCEEDED',
  });
};

/**
 * Intenta extraer el userId del JWT sin verificarlo (rápido, sin DB).
 * No es un check de seguridad — es sólo para "trocear" el límite por usuario
 * en vez de por IP (que en redes NAT mete a varios usuarios en el mismo cubo).
 * Si falla cualquier cosa, devolvemos null y caemos a la IP.
 */
function tryGetUserIdFromAuth(req: Request): string | null {
  try {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) return null;
    const token = auth.slice(7);
    // `decode` (no `verify`) — sólo leemos el sub para limitar por usuario.
    const decoded = jwt.decode(token) as { userId?: string; sub?: string } | null;
    return decoded?.userId ?? decoded?.sub ?? null;
  } catch {
    return null;
  }
}

/**
 * General API rate limiter
 *
 * Decisiones de diseño:
 *  - En development pasamos casi de él (cap altísimo) para no entorpecer el
 *    hot-reload y la prueba manual de pantallas.
 *  - Clavemos por user-id si hay JWT, si no por IP. Esto evita que en
 *    redes NAT (oficina, móvil 4G) varios usuarios compartan cubo.
 *  - Los GET que terminan OK NO cuentan: el dashboard hace varios GETs por
 *    carga (stats, sugerencias, PRs, rutina activa, heatmap) y antes era
 *    trivial reventar el límite simplemente recargando la página un par
 *    de veces.
 */
const isDev = config.NODE_ENV !== 'production';

export const generalRateLimiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  // En dev nos da igual: ponemos un techo muy alto. En prod respetamos
  // el valor configurado pero con un mínimo razonable (al menos 600 por
  // ventana — un usuario activo legítimo lo necesita).
  max: isDev ? 100_000 : Math.max(config.RATE_LIMIT_MAX_REQUESTS, 600),
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  // Si el GET sale bien (2xx/3xx) no lo contamos: las lecturas no son
  // el vector de abuso que queremos limitar.
  skipSuccessfulRequests: false,
  skip: (req) => {
    if (isDev) return true; // off en dev
    // Healthcheck nunca cuenta
    if (req.path === '/health' || req.path === '/api/health') return true;
    return false;
  },
  keyGenerator: (req) => {
    const userId = tryGetUserIdFromAuth(req);
    if (userId) return `u:${userId}`;
    return `ip:${req.ip ?? 'unknown'}`;
  },
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
