import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth';
import { authRateLimiter, sensitiveRateLimiter } from '../middleware/rateLimiter';

const router = Router();

/**
 * @openapi
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Registrar un nuevo usuario
 *     description: Crea una cuenta con email y contraseña. En desarrollo, marca el email como verificado automáticamente.
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email, example: usuario@example.com }
 *               password: { type: string, format: password, minLength: 8, example: SuperSecret123 }
 *               displayName: { type: string, example: Usuario Demo }
 *     responses:
 *       201:
 *         description: Usuario creado, devuelve access token + user
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       409:
 *         description: Email ya registrado
 *       429:
 *         $ref: '#/components/responses/RateLimit'
 */
router.post('/register', authRateLimiter, authController.register);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Iniciar sesión
 *     description: "Devuelve un access token JWT (15 min) y setea una cookie httpOnly con el refresh token (7 días). Si el usuario tiene 2FA activo, devuelve code TOTP_REQUIRED y hay que reintentar incluyendo el campo totpCode."
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string, format: password }
 *               totpCode: { type: string, example: "123456" }
 *     responses:
 *       200:
 *         description: Login OK
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 accessToken: "eyJhbGciOi..."
 *                 user: { id: "...", email: "user@example.com", role: "USER" }
 *       401:
 *         description: Credenciales inválidas o 2FA requerido
 *       429:
 *         $ref: '#/components/responses/RateLimit'
 */
router.post('/login', authRateLimiter, authController.login);

/**
 * @openapi
 * /auth/refresh-token:
 *   post:
 *     tags: [Auth]
 *     summary: Refrescar el access token
 *     description: Lee el refresh token de la cookie httpOnly y devuelve un nuevo access token.
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200: { description: Nuevo access token }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
router.post('/refresh-token', authController.refreshToken);

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Cerrar sesión
 *     description: Invalida el refresh token y limpia la cookie.
 *     responses:
 *       200: { description: Sesión cerrada }
 */
router.post('/logout', authController.logout);

/**
 * @openapi
 * /auth/verify-email/{token}:
 *   get:
 *     tags: [Auth]
 *     summary: Verificar email
 *     security: []
 *     parameters:
 *       - { name: token, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Email verificado }
 *       400: { description: Token inválido o caducado }
 */
router.get('/verify-email/:token', authController.verifyEmail);

/**
 * @openapi
 * /auth/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Solicitar restablecimiento de contraseña
 *     description: Envía un email con un enlace de reset. Por seguridad, devuelve 200 incluso si el email no existe.
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties: { email: { type: string, format: email } }
 *     responses:
 *       200: { description: Email enviado (si existe) }
 *       429: { $ref: '#/components/responses/RateLimit' }
 */
router.post('/forgot-password', sensitiveRateLimiter, authController.forgotPassword);

/**
 * @openapi
 * /auth/reset-password:
 *   post:
 *     tags: [Auth]
 *     summary: Resetear contraseña con token
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, password]
 *             properties:
 *               token: { type: string }
 *               password: { type: string, minLength: 8 }
 *     responses:
 *       200: { description: Contraseña actualizada }
 *       400: { description: Token inválido o caducado }
 */
router.post('/reset-password', sensitiveRateLimiter, authController.resetPassword);

/**
 * @openapi
 * /auth/2fa/setup:
 *   post:
 *     tags: [Auth]
 *     summary: Iniciar configuración de 2FA TOTP
 *     description: Genera un secret y devuelve el QR para escanear con la app autenticadora.
 *     responses:
 *       200:
 *         description: QR + secret
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data: { qrDataUrl: "data:image/png;base64,...", secret: "JBSWY3DPEHPK3PXP" }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
router.post('/2fa/setup', requireAuth, authController.setup2FA);

/**
 * @openapi
 * /auth/2fa/verify:
 *   post:
 *     tags: [Auth]
 *     summary: Verificar código TOTP y activar 2FA
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code]
 *             properties:
 *               code: { type: string, example: "123456" }
 *     responses:
 *       200: { description: 2FA activado }
 *       400: { description: Código inválido }
 */
router.post('/2fa/verify', requireAuth, authController.verify2FA);

/**
 * @openapi
 * /auth/2fa/disable:
 *   post:
 *     tags: [Auth]
 *     summary: Desactivar 2FA
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties: { password: { type: string } }
 *     responses:
 *       200: { description: 2FA desactivado }
 */
router.post('/2fa/disable', requireAuth, authController.disable2FA);

export default router;
