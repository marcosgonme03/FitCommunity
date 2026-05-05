import { api } from './api';
import {
  User,
  UserProfile,
  WorkoutStats,
  SimpleUser,
  SuggestedUser,
  FitnessGoal,
  ExperienceLevel,
  ApiResponse,
} from '../types';

export interface UpdateProfilePayload {
  username?: string;
  displayName?: string;
  bio?: string | null;
  avatarUrl?: string | null;
  coverUrl?: string | null;
  heightCm?: number | null;
  weightKg?: number | null;
  birthDate?: string | null;
  location?: string | null;
  website?: string | null;
  fitnessGoal?: FitnessGoal | null;
  experienceLevel?: ExperienceLevel | null;
  isProfilePublic?: boolean;
  showWorkouts?: boolean;
  showStats?: boolean;
}

export interface CompleteOnboardingPayload {
  displayName: string;
  username: string;
  bio?: string;
  heightCm?: number;
  weightKg?: number;
  fitnessGoal: FitnessGoal;
  experienceLevel: ExperienceLevel;
}

const usersService = {
  async getById(idOrUsername: string): Promise<User> {
    const { data } = await api.get<ApiResponse<User>>(`/users/${idOrUsername}`);
    return data.data!;
  },

  async getStats(idOrUsername: string): Promise<WorkoutStats> {
    const { data } = await api.get<ApiResponse<WorkoutStats>>(
      `/users/${idOrUsername}/stats`
    );
    return data.data!;
  },

  async getMyStats(): Promise<WorkoutStats> {
    const { data } = await api.get<ApiResponse<WorkoutStats>>('/users/me/stats');
    return data.data!;
  },

  async updateMe(payload: UpdateProfilePayload): Promise<User> {
    const { data } = await api.put<ApiResponse<User>>('/users/me', payload);
    return data.data!;
  },

  async completeOnboarding(payload: CompleteOnboardingPayload): Promise<User> {
    const { data } = await api.post<ApiResponse<User>>('/users/me/onboarding', payload);
    return data.data!;
  },

  async checkUsername(username: string): Promise<{ available: boolean }> {
    const { data } = await api.get<ApiResponse<{ available: boolean }>>(
      `/users/check-username/${username}`
    );
    return data.data!;
  },

  // ─── Follow ────────────────────────────────────────────────────────────
  async follow(userId: string): Promise<void> {
    await api.post(`/users/${userId}/follow`);
  },

  async unfollow(userId: string): Promise<void> {
    await api.delete(`/users/${userId}/follow`);
  },

  async getFollowers(userId: string): Promise<{ items: SimpleUser[]; total: number }> {
    const { data } = await api.get<ApiResponse<{ items: SimpleUser[]; total: number }>>(
      `/users/${userId}/followers`
    );
    return data.data!;
  },

  async getFollowing(userId: string): Promise<{ items: SimpleUser[]; total: number }> {
    const { data } = await api.get<ApiResponse<{ items: SimpleUser[]; total: number }>>(
      `/users/${userId}/following`
    );
    return data.data!;
  },

  async getMyFollowing(): Promise<{ items: SimpleUser[]; total: number }> {
    const { data } = await api.get<ApiResponse<{ items: SimpleUser[]; total: number }>>(
      '/users/me/following'
    );
    return data.data!;
  },

  async getSuggestions(limit = 6): Promise<{ items: SuggestedUser[] }> {
    const { data } = await api.get<ApiResponse<{ items: SuggestedUser[] }>>(
      '/users/suggestions',
      { params: { limit } }
    );
    return data.data!;
  },

  /**
   * GDPR data export — triggers a browser download of the JSON file.
   */
  async exportMyData(): Promise<void> {
    const response = await api.get('/users/me/export', { responseType: 'blob' });
    const contentDisposition = response.headers['content-disposition'] as string | undefined;
    const filenameMatch = contentDisposition?.match(/filename="?([^"]+)"?/);
    const filename = filenameMatch?.[1] ?? `fitcommunity-export-${Date.now()}.json`;

    const url = URL.createObjectURL(new Blob([response.data as BlobPart], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
};

export default usersService;
export type { User, UserProfile };
