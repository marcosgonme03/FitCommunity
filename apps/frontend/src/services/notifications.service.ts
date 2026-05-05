import { api } from './api';
import { ApiResponse, PaginatedResponse } from '../types';

export type NotificationType = 'LIKE' | 'COMMENT' | 'FOLLOW' | 'PR_ACHIEVED' | 'BADGE_EARNED' | 'SYSTEM';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  entity_id: string | null;
  entity_type: string | null;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
  sender: {
    id: string;
    profile: {
      username: string | null;
      display_name: string | null;
      avatar_url: string | null;
    } | null;
  } | null;
}

export interface ListNotificationsResult {
  items: NotificationItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  unreadCount: number;
}

const notificationsService = {
  async list(params: { page?: number; limit?: number; unreadOnly?: boolean } = {}): Promise<ListNotificationsResult> {
    const { data } = await api.get<PaginatedResponse<NotificationItem>>('/notifications', { params });
    const meta = data.meta as { pagination: ListNotificationsResult['pagination']; unreadCount?: number };
    return {
      items: data.data ?? [],
      pagination: meta.pagination,
      unreadCount: meta.unreadCount ?? 0,
    };
  },

  async unreadCount(): Promise<number> {
    const { data } = await api.get<ApiResponse<{ unreadCount: number }>>('/notifications/unread-count');
    return data.data!.unreadCount;
  },

  async markRead(id: string): Promise<void> {
    await api.post(`/notifications/${id}/read`);
  },

  async markAllRead(): Promise<{ updatedCount: number }> {
    const { data } = await api.post<ApiResponse<{ updatedCount: number }>>('/notifications/read-all');
    return data.data!;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/notifications/${id}`);
  },

  async clearRead(): Promise<{ deletedCount: number }> {
    const { data } = await api.post<ApiResponse<{ deletedCount: number }>>('/notifications/clear-read');
    return data.data!;
  },
};

export default notificationsService;
