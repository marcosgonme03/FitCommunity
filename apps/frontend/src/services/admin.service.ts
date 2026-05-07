import { api } from './api';
import {
  AdminUserListItem,
  AdminWorkoutListItem,
  AdminOverview,
  AdminSubscription,
  SubscriptionStatus,
  PaginatedResponse,
  ApiResponse,
  UserStatus,
} from '../types';

/**
 * Dispara la descarga de un blob como fichero local. Encapsula el truco de
 * crear un <a download> oculto, simular el clic y revocar el ObjectURL para
 * que ningún consumidor tenga que repetir esta plumbing.
 */
function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export type BroadcastSegment = 'ALL' | 'PREMIUM' | 'INACTIVE_7D' | 'INACTIVE_14D' | 'NEW_USERS_7D';

export interface BroadcastCampaign {
  id: string;
  title: string;
  body: string;
  segment: BroadcastSegment;
  recipients: number;
  template_key: string | null;
  created_at: string;
  admin: {
    id: string;
    email: string;
    profile: { username: string | null; display_name: string | null } | null;
  };
}

export type ExperienceLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'PROFESSIONAL';

export interface ListUsersFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: UserStatus;
  role?: 'USER' | 'ADMIN';
  isPremium?: boolean;
  /** Ciudad / location del perfil (contiene, case-insensitive) */
  location?: string;
  experienceLevel?: ExperienceLevel;
  sortBy?: 'createdAt' | 'workouts' | 'lastLogin';
  sortDir?: 'asc' | 'desc';
}

export interface UsersSummary {
  total: number;
  premium: number;
  banned: number;
  pending: number;
  active7d: number;
}

export type ActivityEventType =
  | 'USER_REGISTERED'
  | 'WORKOUT_CREATED'
  | 'SUBSCRIPTION_CREATED'
  | 'SUBSCRIPTION_CANCELED'
  | 'LIKE'
  | 'COMMENT';

export interface ActivityFeedEvent {
  id: string;
  type: ActivityEventType;
  timestamp: string;
  actor: {
    id: string;
    displayName: string | null;
    username: string | null;
    avatarUrl: string | null;
  };
  meta: Record<string, unknown>;
}

export interface UserDetailsResponse {
  user: {
    id: string;
    email: string;
    role: 'USER' | 'ADMIN';
    status: UserStatus;
    is_email_verified: boolean;
    two_fa_enabled: boolean;
    is_premium: boolean;
    created_at: string;
    updated_at: string;
    last_login_at: string | null;
    banned_at: string | null;
    banned_reason: string | null;
    profile: {
      username: string | null;
      display_name: string | null;
      avatar_url: string | null;
      bio: string | null;
      experience_level: string | null;
      location: string | null;
      fitness_goal: string | null;
      weight_kg: number | null;
      height_cm: number | null;
      is_profile_public: boolean;
      onboarding_completed: boolean;
    } | null;
    _count: { workouts: number; followers: number; following: number };
  };
  subscriptions: Array<{
    id: string;
    stripe_subscription_id: string | null;
    stripe_customer_id: string | null;
    status: 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'INCOMPLETE' | 'INCOMPLETE_EXPIRED' | 'TRIALING' | 'UNPAID';
    current_period_start: string | null;
    current_period_end: string | null;
    cancel_at_period_end: boolean;
    canceled_at: string | null;
    created_at: string;
  }>;
  activeSessionsCount: number;
  recentWorkouts: Array<{
    id: string;
    title: string;
    intensity: string;
    duration_min: number;
    calories: number | null;
    workout_date: string;
  }>;
  auditTrail: Array<{
    id: string;
    action: string;
    target_type: string | null;
    target_id: string | null;
    metadata: unknown;
    ip_address: string | null;
    created_at: string;
    admin: {
      id: string;
      email: string;
      profile: { display_name: string | null } | null;
    };
  }>;
  totals: {
    workoutsCount: number;
    totalMinutes: number;
    totalCalories: number;
    followersCount: number;
    followingCount: number;
  };
}

export interface ListWorkoutsFilters {
  page?: number;
  limit?: number;
  search?: string;
}

export interface ListSubscriptionsFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: SubscriptionStatus;
}

export interface SystemHealthCheck {
  status: 'ok' | 'error';
  latencyMs?: number;
  message?: string;
}

export interface SystemHealth {
  status: 'ok' | 'degraded';
  timestamp: string;
  uptime: number;
  checks: {
    database: SystemHealthCheck;
    redis: SystemHealthCheck;
  };
}

export interface UsersGrowthPoint {
  date: string;
  count: number;
}

export interface WorkoutsStatsBucket {
  date: string;
  count: number;
  minutes: number;
  calories: number;
}

export interface RevenueGrowthPoint {
  date: string;
  newSubs: number;
  canceled: number;
  revenueEur: number;
}

const adminService = {
  // ─── Analytics ─────────────────────────────────────────────────────────
  async overview(): Promise<AdminOverview> {
    const { data } = await api.get<ApiResponse<AdminOverview>>('/admin/analytics/overview');
    return data.data!;
  },

  async usersGrowth(days = 30): Promise<{ points: UsersGrowthPoint[] }> {
    const { data } = await api.get<ApiResponse<{ points: UsersGrowthPoint[] }>>(
      '/admin/analytics/users-growth',
      { params: { days } }
    );
    return data.data!;
  },

  async workoutsStats(days = 30) {
    const { data } = await api.get<ApiResponse<{
      byMuscle: Array<{ muscle: string; count: number }>;
      byDay: WorkoutsStatsBucket[];
    }>>('/admin/analytics/workouts-stats', { params: { days } });
    return data.data!;
  },

  async revenueGrowth(days = 30): Promise<{ points: RevenueGrowthPoint[] }> {
    const { data } = await api.get<ApiResponse<{ points: RevenueGrowthPoint[] }>>(
      '/admin/analytics/revenue',
      { params: { days } }
    );
    return data.data!;
  },

  // ─── Subscriptions (Premium) ───────────────────────────────────────────
  async listSubscriptions(filters: ListSubscriptionsFilters = {}) {
    const { data } = await api.get<PaginatedResponse<AdminSubscription>>('/admin/subscriptions', {
      params: filters,
    });
    return {
      items: data.data ?? [],
      pagination: data.meta.pagination,
    };
  },

  // ─── Users ─────────────────────────────────────────────────────────────
  async listUsers(filters: ListUsersFilters = {}) {
    const { data } = await api.get<PaginatedResponse<AdminUserListItem>>('/admin/users', {
      params: filters,
    });
    return {
      items: data.data ?? [],
      pagination: data.meta.pagination,
    };
  },

  async banUser(userId: string, reason: string): Promise<void> {
    await api.post(`/admin/users/${userId}/ban`, { reason });
  },

  async unbanUser(userId: string): Promise<void> {
    await api.post(`/admin/users/${userId}/unban`);
  },

  async deleteUser(userId: string): Promise<void> {
    await api.delete(`/admin/users/${userId}`);
  },

  async updateUserRole(userId: string, role: 'USER' | 'ADMIN'): Promise<void> {
    await api.put(`/admin/users/${userId}/role`, { role });
  },

  /** Activa o desactiva el flag is_premium del usuario manualmente (no afecta a Stripe) */
  async setUserPremium(userId: string, isPremium: boolean): Promise<void> {
    await api.put(`/admin/users/${userId}/premium`, { isPremium });
  },

  /** Resumen agregado de usuarios para banda superior del listado */
  async getUsersSummary(): Promise<UsersSummary> {
    const { data } = await api.get<ApiResponse<UsersSummary>>('/admin/users/summary');
    return data.data!;
  },

  /** Live activity feed: eventos recientes mezclados de toda la plataforma */
  async getActivityFeed(limit = 30): Promise<{ items: ActivityFeedEvent[] }> {
    const { data } = await api.get<ApiResponse<{ items: ActivityFeedEvent[] }>>(
      '/admin/activity-feed',
      { params: { limit } }
    );
    return data.data!;
  },

  /** Detalle completo de un usuario para el drawer admin */
  async getUserDetails(userId: string): Promise<UserDetailsResponse> {
    const { data } = await api.get<ApiResponse<UserDetailsResponse>>(`/admin/users/${userId}/details`);
    return data.data!;
  },

  /** Cierra todas las sesiones activas del usuario (revoca refresh tokens) */
  async forceLogoutUser(userId: string): Promise<{ sessionsRevoked: number }> {
    const { data } = await api.post<ApiResponse<{ sessionsRevoked: number }>>(
      `/admin/users/${userId}/force-logout`
    );
    return data.data!;
  },

  /** Marca el email del usuario como verificado a mano */
  async forceVerifyEmail(userId: string): Promise<void> {
    await api.post(`/admin/users/${userId}/verify-email`);
  },

  /**
   * Descarga la lista filtrada de usuarios como XLSX profesional (cabeceras
   * en negrita, anchos automáticos, banded rows). Sustituye al antiguo CSV
   * que se abría todo en una columna en Excel español.
   */
  async exportUsersXlsx(filters: Omit<ListUsersFilters, 'page' | 'limit'> = {}): Promise<void> {
    const res = await api.get('/admin/users/export/xlsx', {
      params: filters,
      responseType: 'blob',
    });
    triggerDownload(
      res.data as Blob,
      `fitcommunity-users-${new Date().toISOString().slice(0, 10)}.xlsx`,
    );
  },

  /** Descarga la lista filtrada de usuarios como PDF tabulado A4 horizontal. */
  async exportUsersPdf(filters: Omit<ListUsersFilters, 'page' | 'limit'> = {}): Promise<void> {
    const res = await api.get('/admin/users/export/pdf', {
      params: filters,
      responseType: 'blob',
    });
    triggerDownload(
      res.data as Blob,
      `fitcommunity-users-${new Date().toISOString().slice(0, 10)}.pdf`,
    );
  },

  /** @deprecated usa exportUsersXlsx — el servidor ahora siempre devuelve XLSX */
  async exportUsersCsv(filters: Omit<ListUsersFilters, 'page' | 'limit'> = {}): Promise<void> {
    return this.exportUsersXlsx(filters);
  },

  // ─── Workouts moderation ───────────────────────────────────────────────
  async listWorkouts(filters: ListWorkoutsFilters = {}) {
    const { data } = await api.get<PaginatedResponse<AdminWorkoutListItem>>(
      '/admin/workouts',
      { params: filters }
    );
    return {
      items: data.data ?? [],
      pagination: data.meta.pagination,
    };
  },

  async deleteWorkout(workoutId: string): Promise<void> {
    await api.delete(`/admin/workouts/${workoutId}`);
  },

  // ─── Broadcasts ────────────────────────────────────────────────────────
  async broadcastPreview(segment: BroadcastSegment): Promise<{ count: number }> {
    const { data } = await api.get<ApiResponse<{ count: number }>>(
      '/admin/broadcasts/preview',
      { params: { segment } }
    );
    return data.data!;
  },

  async sendBroadcast(input: {
    title: string;
    body: string;
    segment: BroadcastSegment;
    templateKey?: string;
  }): Promise<{ recipients: number; campaignId: string | null }> {
    const { data } = await api.post<ApiResponse<{ recipients: number; campaignId: string | null }>>(
      '/admin/broadcasts',
      input
    );
    return data.data!;
  },

  async listCampaigns(page = 1, limit = 20) {
    const { data } = await api.get<PaginatedResponse<BroadcastCampaign>>(
      '/admin/broadcasts',
      { params: { page, limit } }
    );
    return {
      items: data.data ?? [],
      pagination: data.meta.pagination,
    };
  },

  async sendDirectMessage(userId: string, title: string, body: string): Promise<void> {
    await api.post(`/admin/users/${userId}/message`, { title, body });
  },

  // ─── Logs ──────────────────────────────────────────────────────────────
  async logs(page = 1, limit = 50) {
    const { data } = await api.get<ApiResponse<{
      items: Array<{
        id: string;
        action: string;
        target_type: string | null;
        target_id: string | null;
        metadata: unknown;
        ip_address: string | null;
        created_at: string;
        admin: {
          id: string;
          email: string;
          profile: { username: string | null; display_name: string | null } | null;
        };
      }>;
      total: number;
    }>>('/admin/logs', { params: { page, limit } });
    return data.data!;
  },

  async systemHealth(): Promise<SystemHealth> {
    const { data } = await api.get<ApiResponse<SystemHealth>>('/admin/health');
    return data.data!;
  },
};

export default adminService;
