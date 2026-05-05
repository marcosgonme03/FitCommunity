import { api } from './api';
import {
  Workout,
  WorkoutStats,
  CalendarMonth,
  Comment,
  IntensityLevel,
  PersonalRecord,
  ExerciseProgressPoint,
  PaginatedResponse,
  ApiResponse,
} from '../types';

export interface CreateWorkoutSetPayload {
  setNumber: number;
  reps: number;
  weightKg?: number | null;
  rpe?: number | null;
  isWarmup?: boolean;
  isFailure?: boolean;
  restSec?: number | null;
  notes?: string | null;
}

export interface CreateWorkoutExercisePayload {
  exerciseId: string;
  orderIdx: number;
  notes?: string | null;
  sets: CreateWorkoutSetPayload[];
}

export interface CreateWorkoutPayload {
  title: string;
  notes?: string | null;
  durationMin: number;
  intensity: IntensityLevel;
  isPublic?: boolean;
  workoutDate?: string;
  photoUrl?: string | null;
  exercises: CreateWorkoutExercisePayload[];
}

export interface UpdateWorkoutPayload extends Partial<CreateWorkoutPayload> {}

export interface ListWorkoutsFilters {
  page?: number;
  limit?: number;
  intensity?: IntensityLevel;
  search?: string;
  startDate?: string;
  endDate?: string;
  userId?: string;
}

export interface HeatmapDay {
  /** YYYY-MM-DD */
  date: string;
  count: number;
  totalMinutes: number;
  totalCalories: number;
  maxIntensity: string;
}

export interface HeatmapResponse {
  year: number;
  days: HeatmapDay[];
  totals: {
    workouts: number;
    minutes: number;
    calories: number;
    activeDays: number;
    longestStreak: number;
  };
}

const workoutsService = {
  async list(filters: ListWorkoutsFilters = {}) {
    const { data } = await api.get<PaginatedResponse<Workout>>('/workouts', { params: filters });
    return { items: data.data ?? [], pagination: data.meta.pagination };
  },

  async getById(id: string): Promise<Workout> {
    const { data } = await api.get<ApiResponse<Workout>>(`/workouts/${id}`);
    return data.data!;
  },

  async create(payload: CreateWorkoutPayload): Promise<Workout> {
    const { data } = await api.post<ApiResponse<Workout>>('/workouts', payload);
    return data.data!;
  },

  async update(id: string, payload: UpdateWorkoutPayload): Promise<Workout> {
    const { data } = await api.put<ApiResponse<Workout>>(`/workouts/${id}`, payload);
    return data.data!;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/workouts/${id}`);
  },

  async stats(): Promise<WorkoutStats> {
    const { data } = await api.get<ApiResponse<WorkoutStats>>('/workouts/stats');
    return data.data!;
  },

  async personalRecords(limit?: number): Promise<{ items: PersonalRecord[] }> {
    const { data } = await api.get<ApiResponse<{ items: PersonalRecord[] }>>(
      '/workouts/personal-records',
      limit ? { params: { limit } } : undefined
    );
    return data.data!;
  },

  async exerciseProgress(exerciseId: string): Promise<{ items: ExerciseProgressPoint[] }> {
    const { data } = await api.get<ApiResponse<{ items: ExerciseProgressPoint[] }>>(
      `/workouts/exercise-progress/${exerciseId}`
    );
    return data.data!;
  },

  async calendar(year: number, month: number): Promise<CalendarMonth> {
    const { data } = await api.get<ApiResponse<CalendarMonth>>(`/workouts/calendar/${year}/${month}`);
    return data.data!;
  },

  async heatmap(year: number): Promise<HeatmapResponse> {
    const { data } = await api.get<ApiResponse<HeatmapResponse>>(`/workouts/heatmap/${year}`);
    return data.data!;
  },

  async like(workoutId: string): Promise<void> {
    await api.post(`/workouts/${workoutId}/like`);
  },

  async unlike(workoutId: string): Promise<void> {
    await api.delete(`/workouts/${workoutId}/like`);
  },

  async listComments(workoutId: string): Promise<{ items: Comment[]; total: number }> {
    const { data } = await api.get<ApiResponse<{ items: Comment[]; total: number }>>(
      `/workouts/${workoutId}/comments`
    );
    return data.data!;
  },

  async addComment(workoutId: string, content: string): Promise<Comment> {
    const { data } = await api.post<ApiResponse<Comment>>(
      `/workouts/${workoutId}/comments`,
      { content }
    );
    return data.data!;
  },

  async deleteComment(workoutId: string, commentId: string): Promise<void> {
    await api.delete(`/workouts/${workoutId}/comments/${commentId}`);
  },
};

export default workoutsService;
