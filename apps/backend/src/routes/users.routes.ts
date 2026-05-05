import { Router, Response, NextFunction } from 'express';
import * as usersCtrl from '../controllers/users.controller';
import * as social from '../controllers/social.controller';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { AuthRequest } from '../types';
import {
  updateProfileSchema,
  completeOnboardingSchema,
} from '../validators/users.validators';

const router = Router();

/**
 * @openapi
 * /users/me:
 *   get:
 *     tags: [Users]
 *     summary: Obtener perfil propio
 *     responses:
 *       200: { description: "Perfil completo del usuario autenticado" }
 *   put:
 *     tags: [Users]
 *     summary: Actualizar perfil propio
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               displayName: { type: string }
 *               bio: { type: string }
 *               heightCm: { type: integer }
 *               weightKg: { type: number }
 *               fitnessGoal: { type: string }
 *               experienceLevel: { type: string }
 *               location: { type: string }
 *
 * /users/me/onboarding:
 *   post:
 *     tags: [Users]
 *     summary: Completar onboarding inicial
 *
 * /users/me/stats:
 *   get:
 *     tags: [Users]
 *     summary: Estadísticas personales
 *
 * /users/me/following:
 *   get:
 *     tags: [Users]
 *     summary: Usuarios a los que sigo
 *
 * /users/me/followers:
 *   get:
 *     tags: [Users]
 *     summary: Mis seguidores
 *
 * /users/check-username/{username}:
 *   get:
 *     tags: [Users]
 *     summary: Comprobar disponibilidad de username
 *     parameters:
 *       - { name: username, in: path, required: true, schema: { type: string } }
 *
 * /users/suggestions:
 *   get:
 *     tags: [Users]
 *     summary: Sugerencias de usuarios a seguir
 *
 * /users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Perfil público (id o username)
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *
 * /users/{id}/follow:
 *   post:
 *     tags: [Users]
 *     summary: Seguir a un usuario
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string, format: uuid } }
 *   delete:
 *     tags: [Users]
 *     summary: Dejar de seguir
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string, format: uuid } }
 */

// Self
router.get('/me', requireAuth, usersCtrl.getMe);
router.put('/me', requireAuth, validate(updateProfileSchema), usersCtrl.updateMe);
router.post('/me/onboarding', requireAuth, validate(completeOnboardingSchema), usersCtrl.completeOnboarding);
router.get('/me/stats', requireAuth, usersCtrl.getMyStats);
/** @openapi
 * /users/me/export:
 *   get:
 *     tags: [Users]
 *     summary: Exportar todos mis datos (GDPR)
 *     description: Devuelve un fichero JSON con todos los datos personales, entrenamientos, notificaciones y social del usuario autenticado.
 *     responses:
 *       200:
 *         description: JSON descargable con todos los datos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
router.get('/me/export', requireAuth, usersCtrl.exportMyData);
router.get('/me/following', requireAuth, (req: AuthRequest, res: Response, next: NextFunction) => {
  req.params.id = req.user!.userId;
  return social.listFollowing(req, res, next);
});
router.get('/me/followers', requireAuth, (req: AuthRequest, res: Response, next: NextFunction) => {
  req.params.id = req.user!.userId;
  return social.listFollowers(req, res, next);
});
router.get('/check-username/:username', requireAuth, usersCtrl.checkUsername);

// Suggestions for who-to-follow
router.get('/suggestions', requireAuth, social.suggestedUsers);

// Public profile
router.get('/:id', requireAuth, usersCtrl.getById);
router.get('/:id/stats', requireAuth, usersCtrl.getUserStats);
router.get('/:id/followers', requireAuth, social.listFollowers);
router.get('/:id/following', requireAuth, social.listFollowing);

// Follow / unfollow
router.post('/:id/follow', requireAuth, social.followUser);
router.delete('/:id/follow', requireAuth, social.unfollowUser);

export default router;
