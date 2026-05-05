import { Router } from 'express';
import * as ctrl from '../controllers/workouts.controller';
import * as social from '../controllers/social.controller';
import { requireAuth, optionalAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  createWorkoutSchema,
  updateWorkoutSchema,
  listWorkoutsQuerySchema,
} from '../validators/workouts.validators';
import { commentSchema } from '../validators/social.validators';

const router = Router();

/**
 * @openapi
 * /workouts:
 *   get:
 *     tags: [Workouts]
 *     summary: Listar mis entrenamientos
 *     description: Devuelve los entrenamientos del usuario autenticado, paginados.
 *     parameters:
 *       - { name: page, in: query, schema: { type: integer, default: 1 } }
 *       - { name: limit, in: query, schema: { type: integer, default: 20, maximum: 100 } }
 *       - { name: search, in: query, schema: { type: string }, description: "Filtra por título o notas" }
 *       - { name: muscle, in: query, schema: { type: string }, description: "Grupo muscular primario" }
 *       - { name: intensity, in: query, schema: { type: string, enum: [LOW, MEDIUM, HIGH, MAX] } }
 *       - { name: dateFrom, in: query, schema: { type: string, format: date } }
 *       - { name: dateTo, in: query, schema: { type: string, format: date } }
 *     responses:
 *       200:
 *         description: Lista paginada de entrenamientos
 *   post:
 *     tags: [Workouts]
 *     summary: Crear un nuevo entrenamiento
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, durationMin, intensity, exercises]
 *             properties:
 *               title: { type: string, example: "Push Day" }
 *               notes: { type: string }
 *               durationMin: { type: integer, minimum: 1, example: 60 }
 *               intensity: { type: string, enum: [LOW, MEDIUM, HIGH, MAX] }
 *               workoutDate: { type: string, format: date-time }
 *               isPublic: { type: boolean, default: true }
 *               exercises:
 *                 type: array
 *                 items: { $ref: '#/components/schemas/WorkoutExercise' }
 *     responses:
 *       201: { description: Entrenamiento creado }
 *       400: { $ref: '#/components/responses/ValidationError' }
 */
router.get('/', requireAuth, validate(listWorkoutsQuerySchema, 'query'), ctrl.list);

/**
 * @openapi
 * /workouts/stats:
 *   get:
 *     tags: [Workouts]
 *     summary: Estadísticas personales
 *     description: Total de entrenamientos, minutos, calorías, racha actual, top 3 grupos musculares.
 *     responses:
 *       200: { description: Stats agregadas del usuario }
 */
router.get('/stats', requireAuth, ctrl.stats);

/**
 * @openapi
 * /workouts/personal-records:
 *   get:
 *     tags: [Workouts]
 *     summary: Mis récords personales (PRs)
 *     description: |
 *       Devuelve el peso máximo levantado por ejercicio (excluyendo calentamientos),
 *       junto con el 1RM estimado por la fórmula de Epley:
 *       `1RM ≈ peso × (1 + reps/30)`.
 *     parameters:
 *       - { name: limit, in: query, schema: { type: integer, maximum: 100 } }
 *     responses:
 *       200:
 *         description: Lista de PRs ordenada por 1RM estimado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     items:
 *                       type: array
 *                       items: { $ref: '#/components/schemas/PersonalRecord' }
 */
router.get('/personal-records', requireAuth, ctrl.personalRecords);

/**
 * @openapi
 * /workouts/exercise-progress/{exerciseId}:
 *   get:
 *     tags: [Workouts]
 *     summary: Evolución del peso máximo por ejercicio
 *     description: Devuelve hasta 60 puntos cronológicos para graficar la progresión.
 *     parameters:
 *       - { name: exerciseId, in: path, required: true, schema: { type: string, format: uuid } }
 *     responses:
 *       200: { description: Puntos de evolución }
 */
router.get('/exercise-progress/:exerciseId', requireAuth, ctrl.exerciseProgress);

/**
 * @openapi
 * /workouts/calendar/{year}/{month}:
 *   get:
 *     tags: [Workouts]
 *     summary: Calendario de entrenamientos
 *     parameters:
 *       - { name: year, in: path, required: true, schema: { type: integer } }
 *       - { name: month, in: path, required: true, schema: { type: integer, minimum: 1, maximum: 12 } }
 *     responses:
 *       200: { description: Días del mes con número de workouts y músculos trabajados }
 */
router.get('/calendar/:year/:month', requireAuth, ctrl.calendar);

/**
 * @openapi
 * /workouts/heatmap/{year}:
 *   get:
 *     tags: [Workouts]
 *     summary: Heatmap anual de actividad (estilo GitHub contributions)
 *     parameters:
 *       - { name: year, in: path, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Días del año con número de sesiones, minutos y calorías }
 */
router.get('/heatmap/:year', requireAuth, ctrl.heatmap);

router.post('/', requireAuth, validate(createWorkoutSchema), ctrl.create);

/**
 * @openapi
 * /workouts/{id}:
 *   get:
 *     tags: [Workouts]
 *     summary: Detalle de entrenamiento
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string, format: uuid } }
 *     responses:
 *       200: { description: Workout completo con ejercicios y sets }
 *       404: { $ref: '#/components/responses/NotFound' }
 *   put:
 *     tags: [Workouts]
 *     summary: Editar entrenamiento (solo autor)
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string, format: uuid } }
 *     responses:
 *       200: { description: Workout actualizado }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *   delete:
 *     tags: [Workouts]
 *     summary: Eliminar entrenamiento (autor o admin)
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string, format: uuid } }
 *     responses:
 *       200: { description: Eliminado }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
router.get('/:id', optionalAuth, ctrl.getById);
router.put('/:id', requireAuth, validate(updateWorkoutSchema), ctrl.update);
router.delete('/:id', requireAuth, ctrl.remove);

/**
 * @openapi
 * /workouts/{id}/like:
 *   post:
 *     tags: [Social]
 *     summary: Dar like a un entrenamiento
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string, format: uuid } }
 *     responses:
 *       200: { description: Like registrado }
 *   delete:
 *     tags: [Social]
 *     summary: Quitar like
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string, format: uuid } }
 *     responses:
 *       200: { description: Like eliminado }
 *
 * /workouts/{id}/comments:
 *   get:
 *     tags: [Social]
 *     summary: Listar comentarios
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string, format: uuid } }
 *       - { name: page, in: query, schema: { type: integer } }
 *     responses:
 *       200: { description: Comentarios paginados }
 *   post:
 *     tags: [Social]
 *     summary: Comentar entrenamiento
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string, format: uuid } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties: { content: { type: string, maxLength: 1000 } }
 *     responses:
 *       201: { description: Comentario creado }
 */
router.post('/:id/like', requireAuth, social.likeWorkout);
router.delete('/:id/like', requireAuth, social.unlikeWorkout);
router.get('/:id/likes', requireAuth, social.listLikes);
router.get('/:id/comments', requireAuth, social.listComments);
router.post('/:id/comments', requireAuth, validate(commentSchema), social.addComment);
router.delete('/:id/comments/:commentId', requireAuth, social.deleteComment);

export default router;
