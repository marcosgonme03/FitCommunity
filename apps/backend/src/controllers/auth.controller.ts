import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../types';
import * as authService from '../services/auth.service';
import { sendSuccess } from '../utils/apiResponse';
import { AppError } from '../middleware/errorHandler';

// ─── Schemas de validación ────────────────────────────────────────────────────

const registerSchema = z.object({
  email: z.string().email('Email inválido').toLowerCase(),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  username: z
    .string()
    .min(3, 'El username debe tener al menos 3 caracteres')
    .max(30, 'El username no puede superar 30 caracteres')
    .regex(/^[a-zA-Z0-9_]+$/, 'El username solo puede contener letras, números y guiones bajos'),
  displayName: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(50, 'El nombre no puede superar 50 caracteres')
    .trim(),
});

const loginSchema = z.object({
  email: z.string().email('Email inválido').toLowerCase(),
  password: z.string().min(1, 'Contraseña requerida'),
  totpCode: z.string().optional(),
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Email inválido').toLowerCase(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token requerido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
});

const verify2FASchema = z.object({
  code: z.string().length(6, 'El código debe tener 6 dígitos').regex(/^\d+$/, 'Solo dígitos'),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

const REFRESH_COOKIE = 'refreshToken';

function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/api/auth',
  });
}

function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' });
}

// ─── Controllers ─────────────────────────────────────────────────────────────

/**
 * POST /api/auth/register
 */
export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const dto = registerSchema.parse(req.body);
    const result = await authService.register(dto);
    sendSuccess(res, result, {
      statusCode: 201,
      message: 'Cuenta creada. Revisa tu email para verificar tu cuenta.',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/login
 */
export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const dto = loginSchema.parse(req.body);
    const meta = {
      ipAddress: req.ip,
      deviceInfo: req.headers['user-agent'],
    };

    const { accessToken, refreshToken } = await authService.login(dto, meta);

    setRefreshCookie(res, refreshToken);

    sendSuccess(res, { accessToken });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/refresh-token
 */
export async function refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = req.cookies[REFRESH_COOKIE] as string | undefined;

    if (!token) {
      throw new AppError('Refresh token no encontrado', 401, 'TOKEN_MISSING');
    }

    const { accessToken, refreshToken: newRefreshToken } = await authService.refreshToken(token);

    setRefreshCookie(res, newRefreshToken);
    sendSuccess(res, { accessToken });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/logout
 */
export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = req.cookies[REFRESH_COOKIE] as string | undefined;

    if (token) {
      await authService.logout(token);
    }

    clearRefreshCookie(res);
    sendSuccess(res, null, { message: 'Sesión cerrada correctamente' });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/auth/verify-email/:token
 */
export async function verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { token } = req.params;
    if (!token) throw new AppError('Token requerido', 400, 'TOKEN_MISSING');

    await authService.verifyEmail(token);
    sendSuccess(res, null, { message: 'Email verificado correctamente. Ya puedes iniciar sesión.' });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/forgot-password
 */
export async function forgotPassword(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);
    await authService.forgotPassword(email);
    // Always return success (don't leak if email exists)
    sendSuccess(res, null, {
      message: 'Si el email existe, recibirás un enlace de recuperación en breve.',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/reset-password
 */
export async function resetPassword(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { token, password } = resetPasswordSchema.parse(req.body);
    await authService.resetPassword(token, password);
    clearRefreshCookie(res);
    sendSuccess(res, null, {
      message: 'Contraseña restablecida correctamente. Por favor inicia sesión de nuevo.',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/2fa/setup
 */
export async function setup2FA(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError('No autenticado', 401, 'UNAUTHORIZED');
    const result = await authService.setup2FA(req.user.userId);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/2fa/verify
 */
export async function verify2FA(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError('No autenticado', 401, 'UNAUTHORIZED');
    const { code } = verify2FASchema.parse(req.body);
    await authService.verify2FA(req.user.userId, code);
    sendSuccess(res, null, { message: '2FA activado correctamente' });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/2fa/disable
 */
export async function disable2FA(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) throw new AppError('No autenticado', 401, 'UNAUTHORIZED');
    const { code } = verify2FASchema.parse(req.body);
    await authService.disable2FA(req.user.userId, code);
    sendSuccess(res, null, { message: '2FA desactivado correctamente' });
  } catch (error) {
    next(error);
  }
}
