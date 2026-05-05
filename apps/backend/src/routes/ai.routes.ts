import { Router } from 'express';
import * as ctrl from '../controllers/ai.controller';
import { requireAuth, requirePremium } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  chatMessageSchema,
  generateRoutineSchema,
  generateNutritionSchema,
} from '../validators/ai.validators';

const router = Router();

router.use(requireAuth, requirePremium);

/**
 * @openapi
 * /ai/chat:
 *   post:
 *     tags: [AI]
 *     summary: "Coach IA: enviar mensaje al chat"
 *     description: "Requiere Premium. Multi-turn conversation persistida en BD. Usa Llama 3.3 70B vía Groq."
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [message]
 *             properties:
 *               conversationId: { type: string, format: uuid, description: "Si se omite, crea una nueva conversación" }
 *               message: { type: string, maxLength: 2000 }
 *     responses:
 *       200: { description: "Respuesta del coach + conversationId" }
 *       402: { description: "Sin Premium activo" }
 *
 * /ai/conversations:
 *   get:
 *     tags: [AI]
 *     summary: Listar mis conversaciones con el coach
 *
 * /ai/conversations/{id}:
 *   get:
 *     tags: [AI]
 *     summary: Obtener una conversación con todos sus mensajes
 *   delete:
 *     tags: [AI]
 *     summary: Eliminar conversación
 *
 * /ai/routines/generate:
 *   post:
 *     tags: [AI]
 *     summary: Generar rutina personalizada
 *     description: "Requiere Premium. Devuelve un JSON estructurado con `weekly_plan` y la persiste en BD."
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [goal, daysPerWeek, sessionMinutes, experienceLevel]
 *             properties:
 *               goal: { type: string, enum: [LOSE_WEIGHT, GAIN_MUSCLE, IMPROVE_STRENGTH, STAY_HEALTHY, RECOMP, POWERLIFTING, HYPERTROPHY] }
 *               daysPerWeek: { type: integer, minimum: 1, maximum: 7 }
 *               sessionMinutes: { type: integer, minimum: 15, maximum: 180 }
 *               experienceLevel: { type: string, enum: [BEGINNER, INTERMEDIATE, ADVANCED, PROFESSIONAL] }
 *               equipment:
 *                 type: array
 *                 items: { type: string, enum: [FULL_GYM, DUMBBELLS, BANDS, BODYWEIGHT_ONLY] }
 *               notes: { type: string, maxLength: 500 }
 *     responses:
 *       200: { description: "Rutina generada y guardada" }
 *       502: { description: "La IA devolvió formato inválido" }
 *
 * /ai/routines:
 *   get:
 *     tags: [AI]
 *     summary: Mis rutinas generadas
 *
 * /ai/routines/{id}:
 *   get:
 *     tags: [AI]
 *     summary: Detalle de rutina
 *   delete:
 *     tags: [AI]
 *     summary: Eliminar rutina
 *
 * /ai/routines/{id}/favorite:
 *   post:
 *     tags: [AI]
 *     summary: Marcar/desmarcar como favorita
 *
 * /ai/nutrition/generate:
 *   post:
 *     tags: [AI]
 *     summary: Generar plan nutricional personalizado
 *     description: "Calcula kcal con Mifflin-St Jeor + factor actividad y devuelve plan semanal."
 *
 * /ai/nutrition:
 *   get:
 *     tags: [AI]
 *     summary: Mis planes nutricionales
 *
 * /ai/nutrition/{id}:
 *   get:
 *     tags: [AI]
 *     summary: Detalle de plan
 *   delete:
 *     tags: [AI]
 *     summary: Eliminar plan
 *
 * /ai/analyze-progress:
 *   post:
 *     tags: [AI]
 *     summary: Análisis de mi progreso (últimos 30 días)
 *     description: "Resume datos de los últimos 30d (workouts, minutos, kcal, distribución muscular) y devuelve markdown con recomendaciones."
 *     responses:
 *       200: { description: "Análisis en markdown + stats numéricas" }
 *       400: { description: "NOT_ENOUGH_DATA — sin entrenamientos suficientes" }
 */

// Chat
router.post('/chat', validate(chatMessageSchema), ctrl.chat);
router.get('/conversations', ctrl.listConversations);
router.get('/conversations/:id', ctrl.getConversation);
router.delete('/conversations/:id', ctrl.deleteConversation);

// Routines
router.post('/routines/generate', validate(generateRoutineSchema), ctrl.generateRoutine);
router.get('/routines', ctrl.listRoutines);

// ─── Active routine (sesión del día pre-rellenada) ─────────────────────────
// IMPORTANTE: estas rutas van ANTES de /routines/:id para que Express no
// interprete "active" como un id.
router.get('/routines/active/today', ctrl.getActiveRoutineToday);
router.post('/routines/active/advance', ctrl.advanceActiveRoutine);
router.post('/routines/active/deactivate', ctrl.deactivateRoutine);
router.post('/routines/:id/activate', ctrl.activateRoutine);

router.get('/routines/:id', ctrl.getRoutine);
router.get('/routines/:id/pdf', ctrl.exportRoutinePdf);
router.post('/routines/:id/favorite', ctrl.toggleRoutineFavorite);
router.delete('/routines/:id', ctrl.deleteRoutine);

// Nutrition
router.post('/nutrition/generate', validate(generateNutritionSchema), ctrl.generateNutrition);
router.get('/nutrition', ctrl.listNutritionPlans);
router.get('/nutrition/:id', ctrl.getNutritionPlan);
router.get('/nutrition/:id/pdf', ctrl.exportNutritionPdf);
router.delete('/nutrition/:id', ctrl.deleteNutritionPlan);

// Progress analysis
router.post('/analyze-progress', ctrl.analyzeProgress);

export default router;
