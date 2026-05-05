import { Router } from 'express';
import * as ctrl from '../controllers/exercises.controller';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  listExercisesQuerySchema,
  createCustomExerciseSchema,
} from '../validators/exercises.validators';

const router = Router();

router.use(requireAuth);

/**
 * @openapi
 * /exercises:
 *   get:
 *     tags: [Exercises]
 *     summary: Listar ejercicios del catálogo + personalizados del usuario
 *     parameters:
 *       - { name: search, in: query, schema: { type: string } }
 *       - { name: muscle, in: query, schema: { type: string }, description: "Filtrar por grupo muscular primario" }
 *       - { name: equipment, in: query, schema: { type: string } }
 *       - { name: page, in: query, schema: { type: integer, default: 1 } }
 *       - { name: limit, in: query, schema: { type: integer, default: 50 } }
 *     responses:
 *       200: { description: Lista de ejercicios }
 *   post:
 *     tags: [Exercises]
 *     summary: Crear ejercicio personalizado
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, primaryMuscle, equipment]
 *             properties:
 *               name: { type: string }
 *               primaryMuscle: { type: string, enum: [CHEST, BACK, SHOULDERS, BICEPS, TRICEPS, FOREARMS, QUADS, HAMSTRINGS, GLUTES, CALVES, CORE, TRAPS, LATS, FULL_BODY, CARDIO] }
 *               secondaryMuscles: { type: array, items: { type: string } }
 *               equipment: { type: string, enum: [BARBELL, DUMBBELL, MACHINE, CABLE, BODYWEIGHT, KETTLEBELL, BAND, SMITH_MACHINE, CARDIO_MACHINE, OTHER] }
 *               category: { type: string, enum: [COMPOUND, ISOLATION, OLYMPIC, ACCESSORY, CARDIO, STRETCH] }
 *               instructions: { type: string }
 *
 * /exercises/{id}:
 *   get:
 *     tags: [Exercises]
 *     summary: Detalle de ejercicio
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string, format: uuid } }
 *   delete:
 *     tags: [Exercises]
 *     summary: Eliminar ejercicio personalizado (solo el creador)
 *
 * /exercises/{id}/history:
 *   get:
 *     tags: [Exercises]
 *     summary: Historial del ejercicio para el usuario (últimos sets registrados)
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string, format: uuid } }
 */
router.get('/', validate(listExercisesQuerySchema, 'query'), ctrl.list);
router.post('/', validate(createCustomExerciseSchema), ctrl.create);
router.get('/:id', ctrl.getById);
router.delete('/:id', ctrl.remove);
router.get('/:id/history', ctrl.history);

export default router;
