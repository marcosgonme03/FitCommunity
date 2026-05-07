import { Router } from 'express';
import * as ctrl from '../controllers/admin.controller';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  banUserSchema,
  updateRoleSchema,
  listUsersQuerySchema,
  listWorkoutsAdminQuerySchema,
  listSubscriptionsQuerySchema,
  broadcastSchema,
  broadcastPreviewQuerySchema,
  directMessageSchema,
  listCampaignsQuerySchema,
} from '../validators/admin.validators';

const router = Router();

router.use(requireAuth, requireAdmin);

/**
 * @openapi
 * /admin/health:
 *   get:
 *     tags: [Admin]
 *     summary: Estado real de los servicios (DB + Redis)
 *     description: Pinga la base de datos y Redis y devuelve latencias y estado de cada servicio.
 *     responses:
 *       200:
 *         description: Todos los servicios operativos
 *       503:
 *         description: Uno o más servicios degradados
 */
router.get('/health', ctrl.systemHealth);

/**
 * @openapi
 * /admin/analytics/overview:
 *   get:
 *     tags: [Admin]
 *     summary: KPIs globales (usuarios, workouts, premium, IA, sistema)
 *     description: "Devuelve total/activos/baneados, MRR, conversión, churn, uso IA, configuración del sistema."
 *
 * /admin/analytics/users-growth:
 *   get:
 *     tags: [Admin]
 *     summary: Crecimiento de usuarios por día
 *     parameters:
 *       - { name: days, in: query, schema: { type: integer, default: 30, maximum: 365 } }
 *
 * /admin/analytics/workouts-stats:
 *   get:
 *     tags: [Admin]
 *     summary: Stats de workouts (por día y por grupo muscular)
 *     parameters:
 *       - { name: days, in: query, schema: { type: integer, default: 30 } }
 *
 * /admin/analytics/revenue:
 *   get:
 *     tags: [Admin]
 *     summary: Crecimiento de ingresos por día (MRR diario)
 *     parameters:
 *       - { name: days, in: query, schema: { type: integer, default: 30 } }
 *
 * /admin/logs:
 *   get:
 *     tags: [Admin]
 *     summary: Audit log de acciones admin
 *
 * /admin/users:
 *   get:
 *     tags: [Admin]
 *     summary: Listar usuarios (paginado + filtros)
 *
 * /admin/users/{id}/ban:
 *   post:
 *     tags: [Admin]
 *     summary: Banear usuario
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string, format: uuid } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [reason]
 *             properties: { reason: { type: string, minLength: 3 } }
 *
 * /admin/users/{id}/unban:
 *   post:
 *     tags: [Admin]
 *     summary: Desbanear
 *
 * /admin/users/{id}:
 *   delete:
 *     tags: [Admin]
 *     summary: Eliminar usuario (cascade)
 *
 * /admin/users/{id}/role:
 *   put:
 *     tags: [Admin]
 *     summary: Cambiar rol (USER/ADMIN)
 *
 * /admin/subscriptions:
 *   get:
 *     tags: [Admin]
 *     summary: Listar suscripciones Premium con filtros
 *     parameters:
 *       - { name: status, in: query, schema: { type: string, enum: [ACTIVE, PAST_DUE, CANCELED, INCOMPLETE, INCOMPLETE_EXPIRED, TRIALING, UNPAID] } }
 *
 * /admin/workouts:
 *   get:
 *     tags: [Admin]
 *     summary: Moderación de entrenamientos
 *
 * /admin/workouts/{id}:
 *   delete:
 *     tags: [Admin]
 *     summary: Eliminar entrenamiento como admin
 *
 * /admin/broadcasts:
 *   get:
 *     tags: [Admin]
 *     summary: Historial de campañas de broadcast enviadas
 *   post:
 *     tags: [Admin]
 *     summary: Enviar notificación masiva a un segmento de usuarios
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, body, segment]
 *             properties:
 *               title: { type: string }
 *               body: { type: string }
 *               segment: { type: string, enum: [ALL, PREMIUM, INACTIVE_7D, INACTIVE_14D, NEW_USERS_7D] }
 *               templateKey: { type: string }
 *
 * /admin/broadcasts/preview:
 *   get:
 *     tags: [Admin]
 *     summary: Preview de cuántos usuarios recibirán el mensaje
 *     parameters:
 *       - { name: segment, in: query, required: true, schema: { type: string } }
 *
 * /admin/users/{id}/message:
 *   post:
 *     tags: [Admin]
 *     summary: Enviar mensaje directo a un usuario específico
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string, format: uuid } }
 */

// Analytics
router.get('/analytics/overview', ctrl.overview);
router.get('/analytics/users-growth', ctrl.usersGrowth);
router.get('/analytics/workouts-stats', ctrl.workoutsStats);
router.get('/analytics/revenue', ctrl.revenueGrowth);
router.get('/logs', ctrl.adminLogs);

// Subscriptions (Premium)
router.get(
  '/subscriptions',
  validate(listSubscriptionsQuerySchema, 'query'),
  ctrl.listSubscriptions
);

// Live activity feed (mezcla cronológica de eventos recientes de la plataforma)
router.get('/activity-feed', ctrl.activityFeed);

// User management
router.get('/users', validate(listUsersQuerySchema, 'query'), ctrl.listUsers);
router.get('/users/summary', ctrl.usersSummary);
router.get('/users/export', ctrl.exportUsersXlsx);
router.get('/users/export/xlsx', ctrl.exportUsersXlsx);
router.get('/users/export/pdf', ctrl.exportUsersPdf);
router.get('/users/:id/details', ctrl.getUserDetails);
router.post('/users/:id/ban', validate(banUserSchema), ctrl.banUser);
router.post('/users/:id/unban', ctrl.unbanUser);
router.post('/users/:id/force-logout', ctrl.forceLogoutUser);
router.post('/users/:id/verify-email', ctrl.forceVerifyEmail);
router.delete('/users/:id', ctrl.deleteUser);
router.put('/users/:id/role', validate(updateRoleSchema), ctrl.updateUserRole);
/**
 * @openapi
 * /admin/users/{id}/premium:
 *   put:
 *     tags: [Admin]
 *     summary: Activar/desactivar Premium manualmente
 *     description: Cambia el flag is_premium del usuario sin afectar a su suscripción Stripe
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string, format: uuid } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [isPremium]
 *             properties:
 *               isPremium: { type: boolean }
 *     responses:
 *       200: { description: Flag actualizado }
 */
router.put('/users/:id/premium', ctrl.setPremium);

// Content moderation
router.get('/workouts', validate(listWorkoutsAdminQuerySchema, 'query'), ctrl.listWorkouts);
router.delete('/workouts/:id', ctrl.deleteWorkout);

// User communication
router.post('/users/:id/message', validate(directMessageSchema), ctrl.sendDirectMessage);

// Broadcasts
router.get('/broadcasts/preview', validate(broadcastPreviewQuerySchema, 'query'), ctrl.broadcastPreview);
router.get('/broadcasts', validate(listCampaignsQuerySchema, 'query'), ctrl.listCampaigns);
router.post('/broadcasts', validate(broadcastSchema), ctrl.sendBroadcast);

export default router;
