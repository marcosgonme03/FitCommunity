import { api } from './api';
import {
  Exercise,
  MuscleGroup,
  Equipment,
  ExerciseCategory,
  ApiResponse,
} from '../types';

export interface ListExercisesFilters {
  search?: string;
  muscle?: MuscleGroup;
  equipment?: Equipment;
  category?: ExerciseCategory;
}

export interface CreateExercisePayload {
  name: string;
  description?: string;
  primaryMuscle: MuscleGroup;
  secondaryMuscles?: MuscleGroup[];
  equipment: Equipment;
  category: ExerciseCategory;
  instructions?: string;
}

export interface ExerciseHistoryItem {
  id: string;
  notes: string | null;
  workout: { id: string; title: string; workout_date: string };
  sets: Array<{
    id: string;
    set_number: number;
    reps: number;
    weight_kg: number | null;
    rpe: number | null;
    is_warmup: boolean;
    is_failure: boolean;
  }>;
}

const exercisesService = {
  async list(filters: ListExercisesFilters = {}): Promise<{ items: Exercise[] }> {
    const { data } = await api.get<ApiResponse<{ items: Exercise[] }>>('/exercises', {
      params: filters,
    });
    return data.data!;
  },

  async getById(id: string): Promise<Exercise> {
    const { data } = await api.get<ApiResponse<Exercise>>(`/exercises/${id}`);
    return data.data!;
  },

  async create(payload: CreateExercisePayload): Promise<Exercise> {
    const { data } = await api.post<ApiResponse<Exercise>>('/exercises', payload);
    return data.data!;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/exercises/${id}`);
  },

  async history(id: string, limit = 10): Promise<{ items: ExerciseHistoryItem[] }> {
    const { data } = await api.get<ApiResponse<{ items: ExerciseHistoryItem[] }>>(
      `/exercises/${id}/history`,
      { params: { limit } }
    );
    return data.data!;
  },
};

export default exercisesService;
