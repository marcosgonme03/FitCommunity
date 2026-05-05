import { Router } from 'express';
import * as ctrl from '../controllers/notifications.controller';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { listNotificationsQuerySchema } from '../validators/notifications.validators';

const router = Router();

router.use(requireAuth);

/**
 * @openapi
 * /notifications:
 *   get:
 *     tags: [Notifications]
 *     summary: Listar notificaciones del usuario
 *     parameters:
 *       - { name: page, in: query, schema: { type: integer, default: 1 } }
 *       - { name: limit, in: query, schema: { type: integer, default: 20 } }
 *       - { name: unreadOnly, in: query, schema: { type: boolean } }
 *     responses:
 *       200:
 *         description: Lista paginada con `meta.unreadCount` adicional
 *
 * /notifications/unread-count:
 *   get:
 *     tags: [Notifications]
 *     summary: Contador de no leídas (endpoint barato para polling)
 *     responses:
 *       200:
 *         description: "{ unreadCount: number }"
 *
 * /notifications/read-all:
 *   post:
 *     tags: [Notifications]
 *     summary: Marcar todas como leídas
 *     responses:
 *       200: { description: "Cantidad actualizada" }
 *
 * /notifications/clear-read:
 *   post:
 *     tags: [Notifications]
 *     summary: Eliminar todas las notificaciones leídas
 *     responses:
 *       200: { description: "Cantidad eliminada" }
 *
 * /notifications/{id}/read:
 *   post:
 *     tags: [Notifications]
 *     summary: Marcar una como leída
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string, format: uuid } }
 *     responses:
 *       200: { description: "Marcada como leída" }
 *
 * /notifications/{id}:
 *   delete:
 *     tags: [Notifications]
 *     summary: Eliminar notificación
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string, format: uuid } }
 *     responses:
 *       200: { description: "Eliminada" }
 */
router.get('/', validate(listNotificationsQuerySchema, 'query'), ctrl.listNotifications);
router.get('/unread-count', ctrl.unreadCount);
router.post('/read-all', ctrl.markAllAsRead);
router.post('/clear-read', ctrl.clearRead);
router.post('/:id/read', ctrl.markAsRead);
router.delete('/:id', ctrl.deleteNotification);

export default router;
