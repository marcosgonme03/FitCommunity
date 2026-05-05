import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { aiService } from '../services/ai.service';
import { activeRoutineService } from '../services/activeRoutine.service';
import { buildRoutinePdf, buildNutritionPdf } from '../services/pdf.service';
import { sendSuccess } from '../utils/apiResponse';
import { AppError } from '../middleware/errorHandler';
import {
  ChatMessageInput,
  GenerateRoutineInput,
  GenerateNutritionInput,
} from '../validators/ai.validators';

// ─── Chat ───────────────────────────────────────────────────────────────────

export async function chat(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError('No autenticado', 401, 'UNAUTHORIZED');
    const { conversationId, message } = req.body as ChatMessageInput;
    const result = await aiService.chat(req.user.userId, { conversationId, message });
    sendSuccess(res, result);
  } catch (e) {
    next(e);
  }
}

export async function listConversations(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError('No autenticado', 401, 'UNAUTHORIZED');
    const items = await aiService.listConversations(req.user.userId);
    sendSuccess(res, { items });
  } catch (e) {
    next(e);
  }
}

export async function getConversation(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError('No autenticado', 401, 'UNAUTHORIZED');
    const conv = await aiService.getConversation(req.user.userId, req.params.id);
    if (!conv) throw new AppError('Conversación no encontrada', 404, 'NOT_FOUND');
    sendSuccess(res, conv);
  } catch (e) {
    next(e);
  }
}

export async function deleteConversation(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError('No autenticado', 401, 'UNAUTHORIZED');
    const ok = await aiService.deleteConversation(req.user.userId, req.params.id);
    if (!ok) throw new AppError('Conversación no encontrada', 404, 'NOT_FOUND');
    sendSuccess(res, { deleted: true });
  } catch (e) {
    next(e);
  }
}

// ─── Routines ───────────────────────────────────────────────────────────────

export async function generateRoutine(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError('No autenticado', 401, 'UNAUTHORIZED');
    const data = req.body as GenerateRoutineInput;
    const routine = await aiService.generateRoutine(req.user.userId, data);
    sendSuccess(res, routine, { statusCode: 201, message: 'Rutina generada' });
  } catch (e) {
    next(e);
  }
}

export async function listRoutines(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError('No autenticado', 401, 'UNAUTHORIZED');
    const items = await aiService.listRoutines(req.user.userId);
    sendSuccess(res, { items });
  } catch (e) {
    next(e);
  }
}

export async function getRoutine(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError('No autenticado', 401, 'UNAUTHORIZED');
    const r = await aiService.getRoutine(req.user.userId, req.params.id);
    if (!r) throw new AppError('Rutina no encontrada', 404, 'NOT_FOUND');
    sendSuccess(res, r);
  } catch (e) {
    next(e);
  }
}

export async function toggleRoutineFavorite(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError('No autenticado', 401, 'UNAUTHORIZED');
    const r = await aiService.toggleRoutineFavorite(req.user.userId, req.params.id);
    if (!r) throw new AppError('Rutina no encontrada', 404, 'NOT_FOUND');
    sendSuccess(res, r);
  } catch (e) {
    next(e);
  }
}

export async function deleteRoutine(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError('No autenticado', 401, 'UNAUTHORIZED');
    const ok = await aiService.deleteRoutine(req.user.userId, req.params.id);
    if (!ok) throw new AppError('Rutina no encontrada', 404, 'NOT_FOUND');
    sendSuccess(res, { deleted: true });
  } catch (e) {
    next(e);
  }
}

// ─── Active routine ─────────────────────────────────────────────────────────

export async function activateRoutine(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError('No autenticado', 401, 'UNAUTHORIZED');
    const result = await activeRoutineService.activate(req.user.userId, req.params.id);
    if (!result.activated) throw new AppError('Rutina no encontrada', 404, 'NOT_FOUND');
    sendSuccess(res, { active: true }, { message: 'Rutina activada' });
  } catch (e) {
    next(e);
  }
}

export async function deactivateRoutine(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError('No autenticado', 401, 'UNAUTHORIZED');
    const result = await activeRoutineService.deactivate(req.user.userId);
    sendSuccess(res, result);
  } catch (e) {
    next(e);
  }
}

export async function getActiveRoutineToday(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError('No autenticado', 401, 'UNAUTHORIZED');
    const session = await activeRoutineService.getTodaySession(req.user.userId);
    sendSuccess(res, session); // null si no hay rutina activa (el frontend lo gestiona)
  } catch (e) {
    next(e);
  }
}

export async function advanceActiveRoutine(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError('No autenticado', 401, 'UNAUTHORIZED');
    const result = await activeRoutineService.advance(req.user.userId);
    if (!result) throw new AppError('No hay rutina activa', 404, 'NO_ACTIVE_ROUTINE');
    sendSuccess(res, result);
  } catch (e) {
    next(e);
  }
}

// ─── Nutrition ──────────────────────────────────────────────────────────────

export async function generateNutrition(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError('No autenticado', 401, 'UNAUTHORIZED');
    const data = req.body as GenerateNutritionInput;
    const plan = await aiService.generateNutrition(req.user.userId, data);
    sendSuccess(res, plan, { statusCode: 201, message: 'Plan nutricional generado' });
  } catch (e) {
    next(e);
  }
}

export async function listNutritionPlans(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError('No autenticado', 401, 'UNAUTHORIZED');
    const items = await aiService.listNutritionPlans(req.user.userId);
    sendSuccess(res, { items });
  } catch (e) {
    next(e);
  }
}

export async function getNutritionPlan(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError('No autenticado', 401, 'UNAUTHORIZED');
    const p = await aiService.getNutritionPlan(req.user.userId, req.params.id);
    if (!p) throw new AppError('Plan no encontrado', 404, 'NOT_FOUND');
    sendSuccess(res, p);
  } catch (e) {
    next(e);
  }
}

export async function deleteNutritionPlan(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError('No autenticado', 401, 'UNAUTHORIZED');
    const ok = await aiService.deleteNutritionPlan(req.user.userId, req.params.id);
    if (!ok) throw new AppError('Plan no encontrado', 404, 'NOT_FOUND');
    sendSuccess(res, { deleted: true });
  } catch (e) {
    next(e);
  }
}

// ─── PDF exports ────────────────────────────────────────────────────────────

function safeFilename(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || 'fitcommunity';
}

export async function exportRoutinePdf(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError('No autenticado', 401, 'UNAUTHORIZED');
    const routine = await aiService.getRoutine(req.user.userId, req.params.id);
    if (!routine) throw new AppError('Rutina no encontrada', 404, 'NOT_FOUND');

    const filename = `rutina-${safeFilename(routine.title)}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-store');

    // Incrementa contador (sin esperar — no debe bloquear la descarga)
    aiService.incrementRoutineDownload(routine.id).catch(() => undefined);

    const pdf = buildRoutinePdf(routine);
    pdf.pipe(res);
    pdf.end();
  } catch (e) {
    next(e);
  }
}

export async function exportNutritionPdf(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError('No autenticado', 401, 'UNAUTHORIZED');
    const plan = await aiService.getNutritionPlan(req.user.userId, req.params.id);
    if (!plan) throw new AppError('Plan no encontrado', 404, 'NOT_FOUND');

    const filename = `dieta-${safeFilename(plan.title)}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-store');

    aiService.incrementNutritionDownload(plan.id).catch(() => undefined);

    const pdf = buildNutritionPdf(plan);
    pdf.pipe(res);
    pdf.end();
  } catch (e) {
    next(e);
  }
}

// ─── Progress ───────────────────────────────────────────────────────────────

export async function analyzeProgress(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError('No autenticado', 401, 'UNAUTHORIZED');
    const body = (req.body ?? {}) as {
      periodDays?: number;
      focus?: 'GENERAL' | 'STRENGTH' | 'HYPERTROPHY' | 'WEIGHT_LOSS' | 'RECOVERY' | 'MUSCLE_BALANCE' | 'INJURY_PREVENTION';
      muscleFocus?: string;
      customQuestion?: string;
    };
    const result = await aiService.analyzeProgress(req.user.userId, {
      periodDays: body.periodDays,
      focus: body.focus,
      muscleFocus: body.muscleFocus,
      customQuestion: body.customQuestion,
    });
    sendSuccess(res, result);
  } catch (e) {
    next(e);
  }
}
