import { api } from './api';
import { User } from '../types';

export interface LoginPayload {
  email: string;
  password: string;
  totpCode?: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  username: string;
  displayName: string;
}

export interface AuthTokens {
  accessToken: string;
}

const authService = {
  async login(payload: LoginPayload): Promise<{ accessToken: string }> {
    const { data } = await api.post<{ success: true; data: AuthTokens }>('/auth/login', payload);
    return data.data;
  },

  async register(payload: RegisterPayload): Promise<void> {
    await api.post('/auth/register', payload);
  },

  async logout(): Promise<void> {
    await api.post('/auth/logout');
  },

  async refreshToken(): Promise<{ accessToken: string }> {
    const { data } = await api.post<{ success: true; data: AuthTokens }>('/auth/refresh-token');
    return data.data;
  },

  async verifyEmail(token: string): Promise<void> {
    await api.get(`/auth/verify-email/${token}`);
  },

  async forgotPassword(email: string): Promise<void> {
    await api.post('/auth/forgot-password', { email });
  },

  async resetPassword(token: string, password: string): Promise<void> {
    await api.post('/auth/reset-password', { token, password });
  },

  async getMe(): Promise<User> {
    const { data } = await api.get<{ success: true; data: User }>('/users/me');
    return data.data;
  },

  async setup2FA(): Promise<{ qrCodeUrl: string; secret: string }> {
    const { data } = await api.post<{ success: true; data: { qrCodeUrl: string; secret: string } }>(
      '/auth/2fa/setup'
    );
    return data.data;
  },

  async verify2FA(code: string): Promise<void> {
    await api.post('/auth/2fa/verify', { code });
  },

  async disable2FA(code: string): Promise<void> {
    await api.post('/auth/2fa/disable', { code });
  },
};

export default authService;
