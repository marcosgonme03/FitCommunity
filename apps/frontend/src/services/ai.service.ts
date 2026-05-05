import { api } from './api';
import {
  AiConversation,
  GeneratedRoutine,
  NutritionPlan,
  FitnessGoal,
  ExperienceLevel,
  ApiResponse,
} from '../types';

/**
 * Dispara la descarga de un blob como archivo en el navegador.
 * Usa Object URLs y anchor invisible (técnica estándar).
 */
function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Liberar memoria del object URL al final del tick
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export interface ChatPayload {
  conversationId?: string;
  message: string;
}

export interface GenerateRoutinePayload {
  goal: FitnessGoal;
  daysPerWeek: number;
  sessionMinutes: number;
  experienceLevel: ExperienceLevel;
  equipment: Array<'FULL_GYM' | 'DUMBBELLS' | 'BANDS' | 'BODYWEIGHT_ONLY'>;
  notes?: string;
}

export interface GenerateNutritionPayload {
  goal: FitnessGoal;
  heightCm: number;
  weightKg: number;
  age: number;
  sex: 'MALE' | 'FEMALE' | 'OTHER';
  activityLevel: 'SEDENTARY' | 'LIGHT' | 'MODERATE' | 'INTENSE' | 'EXTREME';
  dietaryRestrictions?: string[];
  notes?: string;
}

export type AnalysisFocus =
  | 'GENERAL'
  | 'STRENGTH'
  | 'HYPERTROPHY'
  | 'WEIGHT_LOSS'
  | 'RECOVERY'
  | 'MUSCLE_BALANCE'
  | 'INJURY_PREVENTION';

export interface AnalysisOptions {
  periodDays?: number;
  focus?: AnalysisFocus;
  muscleFocus?: string;
  customQuestion?: string;
}

export interface ProgressAnalysis {
  analysis: string;
  stats: {
    totalWorkouts: number;
    totalMinutes: number;
    totalCalories: number;
    avgMinutes: number;
    muscleDistribution?: Array<{ muscle: string; count: number }>;
    /** Soporte legacy para versiones previas del backend */
    sportsDistribution?: Array<{ sport: string; count: number }>;
    totalVolume?: number;
    totalSets?: number;
    prCount?: number;
    periodDays?: number;
    workoutsPerWeek?: number;
    trainedDays?: number;
    restDays?: number;
    maxConsecDays?: number;
  };
  params?: {
    periodDays: number;
    focus: AnalysisFocus;
    muscleFocus: string | null;
    customQuestion: string | null;
  };
  /** Entidades detectadas en la pregunta libre (útil para debug y para mostrar al usuario) */
  detectedIntent?: {
    matchedExerciseName: string | null;
    matchedMuscle: string | null;
    mentionsProgress: boolean;
    mentionsRest: boolean;
    mentionsBalance: boolean;
  } | null;
}

// ─── Active routine: tipos compartidos con el backend ──────────────────────
export interface PrefilledSet {
  setNumber: number;
  reps: number;
  weightKg: number | null;
  rpe: number | null;
  isWarmup: boolean;
  isFailure: boolean;
  restSec: number | null;
  notes: string | null;
}

export interface PrefilledExercise {
  exerciseId: string;
  exerciseName: string;
  primaryMuscle: string;
  equipment: string;
  notes: string | null;
  sets: PrefilledSet[];
  fromHistory: boolean;
}

export interface UnmatchedExercise {
  name: string;
  sets: number;
  reps: string | number;
  notes?: string;
  suggestions: Array<{ id: string; name: string; primary_muscle: string }>;
}

export interface TodaySession {
  routineId: string;
  routineTitle: string;
  totalDays: number;
  dayIdx: number;
  day: {
    day: number;
    focus: string;
    warmup?: string;
    cooldown?: string;
    exercises: Array<{ name: string; sets: number; reps: string | number; rest_sec?: number; notes?: string }>;
  };
  suggestedTitle: string;
  estimatedMinutes: number;
  exercises: PrefilledExercise[];
  unmatched: UnmatchedExercise[];
}

const aiService = {
  // Chat
  async chat(payload: ChatPayload) {
    const { data } = await api.post<ApiResponse<{
      conversationId: string;
      message: { id: string; role: string; content: string; createdAt: string };
    }>>('/ai/chat', payload);
    return data.data!;
  },

  async listConversations(): Promise<{ items: AiConversation[] }> {
    const { data } = await api.get<ApiResponse<{ items: AiConversation[] }>>('/ai/conversations');
    return data.data!;
  },

  async getConversation(id: string): Promise<AiConversation> {
    const { data } = await api.get<ApiResponse<AiConversation>>(`/ai/conversations/${id}`);
    return data.data!;
  },

  async deleteConversation(id: string): Promise<void> {
    await api.delete(`/ai/conversations/${id}`);
  },

  // Routines
  async generateRoutine(payload: GenerateRoutinePayload): Promise<GeneratedRoutine> {
    const { data } = await api.post<ApiResponse<GeneratedRoutine>>(
      '/ai/routines/generate',
      payload
    );
    return data.data!;
  },

  async listRoutines(): Promise<{ items: GeneratedRoutine[] }> {
    const { data } = await api.get<ApiResponse<{ items: GeneratedRoutine[] }>>('/ai/routines');
    return data.data!;
  },

  async getRoutine(id: string): Promise<GeneratedRoutine> {
    const { data } = await api.get<ApiResponse<GeneratedRoutine>>(`/ai/routines/${id}`);
    return data.data!;
  },

  async toggleRoutineFavorite(id: string): Promise<GeneratedRoutine> {
    const { data } = await api.post<ApiResponse<GeneratedRoutine>>(
      `/ai/routines/${id}/favorite`
    );
    return data.data!;
  },

  async deleteRoutine(id: string): Promise<void> {
    await api.delete(`/ai/routines/${id}`);
  },

  /**
   * Descarga el PDF de una rutina. Devuelve el blob para que el caller decida
   * cómo manejarlo (normalmente: crear un object URL y disparar download).
   */
  async downloadRoutinePdf(id: string, filenameHint?: string): Promise<void> {
    const res = await api.get(`/ai/routines/${id}/pdf`, { responseType: 'blob' });
    triggerBlobDownload(res.data as Blob, filenameHint ?? `rutina-${id}.pdf`);
  },

  // ─── Active routine (sesión del día pre-rellenada) ───────────────────────
  async activateRoutine(id: string): Promise<{ active: boolean }> {
    const { data } = await api.post<ApiResponse<{ active: boolean }>>(
      `/ai/routines/${id}/activate`
    );
    return data.data!;
  },

  async deactivateRoutine(): Promise<{ deactivated: boolean }> {
    const { data } = await api.post<ApiResponse<{ deactivated: boolean }>>(
      '/ai/routines/active/deactivate'
    );
    return data.data!;
  },

  async getActiveRoutineToday(): Promise<TodaySession | null> {
    const { data } = await api.get<ApiResponse<TodaySession | null>>(
      '/ai/routines/active/today'
    );
    return data.data ?? null;
  },

  async advanceActiveRoutine(): Promise<{ newDayIdx: number }> {
    const { data } = await api.post<ApiResponse<{ newDayIdx: number }>>(
      '/ai/routines/active/advance'
    );
    return data.data!;
  },

  // Nutrition
  async generateNutrition(payload: GenerateNutritionPayload): Promise<NutritionPlan> {
    const { data } = await api.post<ApiResponse<NutritionPlan>>(
      '/ai/nutrition/generate',
      payload
    );
    return data.data!;
  },

  async listNutritionPlans(): Promise<{ items: NutritionPlan[] }> {
    const { data } = await api.get<ApiResponse<{ items: NutritionPlan[] }>>('/ai/nutrition');
    return data.data!;
  },

  async getNutritionPlan(id: string): Promise<NutritionPlan> {
    const { data } = await api.get<ApiResponse<NutritionPlan>>(`/ai/nutrition/${id}`);
    return data.data!;
  },

  async deleteNutritionPlan(id: string): Promise<void> {
    await api.delete(`/ai/nutrition/${id}`);
  },

  async downloadNutritionPdf(id: string, filenameHint?: string): Promise<void> {
    const res = await api.get(`/ai/nutrition/${id}/pdf`, { responseType: 'blob' });
    triggerBlobDownload(res.data as Blob, filenameHint ?? `dieta-${id}.pdf`);
  },

  // Progress analysis
  async analyzeProgress(options: AnalysisOptions = {}): Promise<ProgressAnalysis> {
    const { data } = await api.post<ApiResponse<ProgressAnalysis>>('/ai/analyze-progress', options);
    return data.data!;
  },
};

export default aiService;
