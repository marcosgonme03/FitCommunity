import { Router } from 'express';
import * as social from '../controllers/social.controller';
import { requireAuth, optionalAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { feedQuerySchema } from '../validators/social.validators';

const router = Router();

/**
 * @openapi
 * /feed:
 *   get:
 *     tags: [Social]
 *     summary: Feed personalizado (propios + usuarios seguidos)
 *     description: "Cursor-based pagination. Usa `nextCursor` de la respuesta para pedir la siguiente página."
 *     parameters:
 *       - { name: cursor, in: query, schema: { type: string }, description: "ID del último workout de la página anterior" }
 *       - { name: limit, in: query, schema: { type: integer, default: 10, maximum: 50 } }
 *     responses:
 *       200:
 *         description: Feed con flag `viewerLiked` por workout
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 items: [{ id: "...", title: "Push Day", viewerLiked: true }]
 *                 nextCursor: "uuid-del-último"
 *
 * /feed/explore:
 *   get:
 *     tags: [Social]
 *     summary: Feed global público (explore)
 *     security: []
 *     parameters:
 *       - { name: cursor, in: query, schema: { type: string } }
 *       - { name: limit, in: query, schema: { type: integer, default: 10 } }
 *     responses:
 *       200: { description: Workouts públicos de todos los usuarios }
 */

// Personalized feed (own + following)
router.get('/', requireAuth, validate(feedQuerySchema, 'query'), social.feed);

// Global explore feed
router.get('/explore', optionalAuth, validate(feedQuerySchema, 'query'), social.explore);

export default router;
