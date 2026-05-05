import crypto from 'crypto';
import { authenticator } from 'otplib';
import qrcode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../lib/prisma';
import { redis } from '../lib/redis';
import { hashPassword, comparePassword, validatePasswordStrength } from '../utils/password';
import { signAccessToken } from '../utils/jwt';
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
} from './email.service';
import { AppError } from '../middleware/errorHandler';
import { config } from '../config';
import { logger } from '../utils/logger';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RegisterDto {
  email: string;
  password: string;
  username: string;
  displayName: string;
}

export interface LoginDto {
  email: string;
  password: string;
  totpCode?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

async function createRefreshToken(
  userId: string,
  meta?: { deviceInfo?: string; ipAddress?: string }
): Promise<string> {
  const tokenId = uuidv4();
  const rawToken = `${tokenId}.${generateSecureToken()}`;
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

  await prisma.refreshToken.create({
    data: {
      id: tokenId,
      user_id: userId,
      token_hash: tokenHash,
      device_info: meta?.deviceInfo,
      ip_address: meta?.ipAddress,
      expires_at: expiresAt,
    },
  });

  return rawToken;
}

// ─── Auth Service ─────────────────────────────────────────────────────────────

/**
 * Register a new user
 */
export async function register(dto: RegisterDto): Promise<{ userId: string }> {
  // Validate password strength
  const passwordError = validatePasswordStrength(dto.password);
  if (passwordError) throw new AppError(passwordError, 400, 'WEAK_PASSWORD');

  // Check uniqueness
  const existingEmail = await prisma.user.findUnique({ where: { email: dto.email } });
  if (existingEmail) throw new AppError('El email ya está en uso', 409, 'EMAIL_TAKEN');

  const existingUsername = await prisma.userProfile.findUnique({
    where: { username: dto.username },
  });
  if (existingUsername) throw new AppError('El nombre de usuario ya está en uso', 409, 'USERNAME_TAKEN');

  // Create user + profile in transaction
  const passwordHash = await hashPassword(dto.password);

  // In development we skip email verification entirely so test accounts
  // (with fake emails) can log in immediately. In production users still
  // need to click the verification link.
  const isDev = config.NODE_ENV === 'development';

  const user = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        email: dto.email,
        password_hash: passwordHash,
        is_email_verified: isDev,
        status: isDev ? 'ACTIVE' : 'PENDING_VERIFICATION',
        profile: {
          create: {
            username: dto.username,
            display_name: dto.displayName,
          },
        },
      },
      include: { profile: true },
    });

    // Email verification token (still created so the flow works in production)
    const token = generateSecureToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    await tx.emailVerification.create({
      data: {
        user_id: newUser.id,
        token,
        expires_at: expiresAt,
      },
    });

    return { user: newUser, verificationToken: token };
  });

  // Send verification email (non-blocking)
  const verificationUrl = `${config.FRONTEND_URL}/verify-email/${user.verificationToken}`;
  sendVerificationEmail(dto.email, dto.displayName, verificationUrl).catch((err) =>
    logger.error('Verification email failed:', err)
  );

  logger.info(`New user registered: ${dto.email}`);
  return { userId: user.user.id };
}

/**
 * Login with email + password (+ optional 2FA)
 */
export async function login(
  dto: LoginDto,
  meta?: { deviceInfo?: string; ipAddress?: string }
): Promise<TokenPair> {
  const user = await prisma.user.findUnique({
    where: { email: dto.email },
    include: { profile: true },
  });

  if (!user) throw new AppError('Credenciales inválidas', 401, 'INVALID_CREDENTIALS');

  const isPasswordValid = await comparePassword(dto.password, user.password_hash);
  if (!isPasswordValid) throw new AppError('Credenciales inválidas', 401, 'INVALID_CREDENTIALS');

  if (user.status === 'BANNED') {
    throw new AppError(
      `Tu cuenta está suspendida. Motivo: ${user.banned_reason ?? 'infracción de normas'}`,
      403,
      'ACCOUNT_BANNED'
    );
  }

  // In development we don't enforce email verification so test accounts
  // with fake emails can log in. In production this check is mandatory.
  if (!user.is_email_verified && config.NODE_ENV !== 'development') {
    throw new AppError('Verifica tu email antes de iniciar sesión', 403, 'EMAIL_NOT_VERIFIED');
  }

  // 2FA check
  if (user.two_fa_enabled) {
    if (!dto.totpCode) {
      throw new AppError('Código 2FA requerido', 403, 'TOTP_REQUIRED');
    }
    if (!user.two_fa_secret) {
      throw new AppError('Error en configuración 2FA', 500, 'TOTP_ERROR');
    }
    const isValid = authenticator.verify({ token: dto.totpCode, secret: user.two_fa_secret });
    if (!isValid) throw new AppError('Código 2FA inválido', 401, 'TOTP_INVALID');
  }

  // Generate tokens
  const accessToken = signAccessToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  const refreshToken = await createRefreshToken(user.id, meta);

  // Update last login
  await prisma.user.update({
    where: { id: user.id },
    data: { last_login_at: new Date() },
  });

  logger.info(`User logged in: ${dto.email}`);
  return { accessToken, refreshToken };
}

/**
 * Refresh access token using a valid refresh token
 */
export async function refreshToken(rawRefreshToken: string): Promise<TokenPair> {
  if (!rawRefreshToken) {
    throw new AppError('Refresh token requerido', 401, 'TOKEN_MISSING');
  }

  // Hash the incoming token to look it up in DB
  const tokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');

  const stored = await prisma.refreshToken.findUnique({
    where: { token_hash: tokenHash },
    include: { user: true },
  });

  if (!stored || stored.is_revoked || stored.expires_at < new Date()) {
    throw new AppError('Refresh token inválido o expirado', 401, 'TOKEN_EXPIRED');
  }

  // Rotate: revoke old, issue new
  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { is_revoked: true },
  });

  const newRefreshToken = await createRefreshToken(stored.user_id);
  const newAccessToken = signAccessToken({
    userId: stored.user.id,
    email: stored.user.email,
    role: stored.user.role,
  });

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
}

/**
 * Logout — revoke refresh token
 */
export async function logout(rawRefreshToken: string): Promise<void> {
  const tokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');

  await prisma.refreshToken.updateMany({
    where: { token_hash: tokenHash },
    data: { is_revoked: true },
  });
}

/**
 * Verify email with token
 */
export async function verifyEmail(token: string): Promise<void> {
  const verification = await prisma.emailVerification.findUnique({
    where: { token },
    include: { user: { include: { profile: true } } },
  });

  if (!verification) throw new AppError('Token de verificación inválido', 400, 'TOKEN_INVALID');
  if (verification.used_at) throw new AppError('Token ya utilizado', 400, 'TOKEN_USED');
  if (verification.expires_at < new Date()) {
    throw new AppError('Token de verificación expirado', 400, 'TOKEN_EXPIRED');
  }

  await prisma.$transaction([
    prisma.emailVerification.update({
      where: { id: verification.id },
      data: { used_at: new Date() },
    }),
    prisma.user.update({
      where: { id: verification.user_id },
      data: { is_email_verified: true, status: 'ACTIVE' },
    }),
  ]);

  // Send welcome email
  const displayName = verification.user.profile?.display_name ?? verification.user.email;
  sendWelcomeEmail(verification.user.email, displayName).catch((err) =>
    logger.error('Welcome email failed:', err)
  );
}

/**
 * Request password reset
 */
export async function forgotPassword(email: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { profile: true },
  });

  // Always return success (prevent email enumeration)
  if (!user) return;

  // Invalidate previous reset tokens
  await prisma.passwordReset.updateMany({
    where: { user_id: user.id, used_at: null },
    data: { used_at: new Date() },
  });

  const token = generateSecureToken();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.passwordReset.create({
    data: {
      user_id: user.id,
      token,
      expires_at: expiresAt,
    },
  });

  const resetUrl = `${config.FRONTEND_URL}/reset-password/${token}`;
  const displayName = user.profile?.display_name ?? email;

  sendPasswordResetEmail(email, displayName, resetUrl).catch((err) =>
    logger.error('Password reset email failed:', err)
  );
}

/**
 * Reset password with token
 */
export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const passwordError = validatePasswordStrength(newPassword);
  if (passwordError) throw new AppError(passwordError, 400, 'WEAK_PASSWORD');

  const reset = await prisma.passwordReset.findUnique({ where: { token } });

  if (!reset) throw new AppError('Token de recuperación inválido', 400, 'TOKEN_INVALID');
  if (reset.used_at) throw new AppError('Token ya utilizado', 400, 'TOKEN_USED');
  if (reset.expires_at < new Date()) {
    throw new AppError('Token de recuperación expirado', 400, 'TOKEN_EXPIRED');
  }

  const newHash = await hashPassword(newPassword);

  await prisma.$transaction([
    prisma.passwordReset.update({
      where: { id: reset.id },
      data: { used_at: new Date() },
    }),
    prisma.user.update({
      where: { id: reset.user_id },
      data: { password_hash: newHash },
    }),
    // Revoke all refresh tokens (security measure)
    prisma.refreshToken.updateMany({
      where: { user_id: reset.user_id },
      data: { is_revoked: true },
    }),
  ]);

  // Cache token as used in Redis for immediate effect
  await redis.set(`pwd_reset_used:${token}`, '1', 'EX', 3600);
}

/**
 * Setup 2FA TOTP — returns QR code URL and backup codes
 */
export async function setup2FA(userId: string): Promise<{ qrCodeUrl: string; secret: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true },
  });

  if (!user) throw new AppError('Usuario no encontrado', 404, 'NOT_FOUND');
  if (user.two_fa_enabled) throw new AppError('2FA ya está activado', 400, '2FA_ALREADY_ENABLED');

  const secret = authenticator.generateSecret();
  const email = user.email;
  const otpAuthUrl = authenticator.keyuri(email, config.TOTP_APP_NAME, secret);
  const qrCodeUrl = await qrcode.toDataURL(otpAuthUrl);

  // Store secret temporarily in Redis (confirmed after verification)
  await redis.set(`2fa_pending:${userId}`, secret, 'EX', 600); // 10 min

  return { qrCodeUrl, secret };
}

/**
 * Verify and activate 2FA
 */
export async function verify2FA(userId: string, totpCode: string): Promise<void> {
  const secret = await redis.get(`2fa_pending:${userId}`);

  if (!secret) {
    throw new AppError('Sesión de configuración 2FA expirada. Reinicia el proceso.', 400, '2FA_SESSION_EXPIRED');
  }

  const isValid = authenticator.verify({ token: totpCode, secret });
  if (!isValid) throw new AppError('Código 2FA inválido', 400, 'TOTP_INVALID');

  await prisma.user.update({
    where: { id: userId },
    data: { two_fa_enabled: true, two_fa_secret: secret },
  });

  await redis.del(`2fa_pending:${userId}`);
}

/**
 * Disable 2FA
 */
export async function disable2FA(userId: string, totpCode: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) throw new AppError('Usuario no encontrado', 404, 'NOT_FOUND');
  if (!user.two_fa_enabled) throw new AppError('2FA no está activado', 400, '2FA_NOT_ENABLED');
  if (!user.two_fa_secret) throw new AppError('Error en configuración 2FA', 500, 'TOTP_ERROR');

  const isValid = authenticator.verify({ token: totpCode, secret: user.two_fa_secret });
  if (!isValid) throw new AppError('Código 2FA inválido', 401, 'TOTP_INVALID');

  await prisma.user.update({
    where: { id: userId },
    data: { two_fa_enabled: false, two_fa_secret: null },
  });
}
