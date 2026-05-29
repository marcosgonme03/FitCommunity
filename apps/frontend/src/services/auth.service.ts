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

  // ─── Flujo 2FA obligatorio durante login (admin) ──────────────────────────

  /**
   * Intercambia el `setupToken` por un QR + secret + pendingToken (JWT corto
   * que el frontend devuelve en /verify-setup). Sólo se usa cuando un admin
   * sin 2FA inicia sesión.
   */
  async setup2FAChallenge(
    setupToken: string
  ): Promise<{ qrCodeUrl: string; secret: string; pendingToken: string }> {
    const { data } = await api.post<{
      success: true;
      data: { qrCodeUrl: string; secret: string; pendingToken: string };
    }>('/auth/2fa/challenge/setup', { setupToken });
    return data.data;
  },

  /**
   * Verifica el TOTP del setup obligatorio. Recibe el `pendingToken` devuelto
   * por /challenge/setup (que contiene el secret firmado). Si el código es
   * correcto, el backend activa 2FA y emite los tokens de sesión definitivos.
   */
  async verify2FAChallengeSetup(
    pendingToken: string,
    code: string
  ): Promise<{ accessToken: string }> {
    const { data } = await api.post<{ success: true; data: AuthTokens }>(
      '/auth/2fa/challenge/verify-setup',
      { pendingToken, code }
    );
    return data.data;
  },

  /**
   * Verifica el TOTP en login normal cuando el admin ya tiene 2FA activo.
   * El frontend recibe el `challengeToken` desde la respuesta de /login.
   */
  async verify2FAChallengeLogin(
    challengeToken: string,
    code: string
  ): Promise<{ accessToken: string }> {
    const { data } = await api.post<{ success: true; data: AuthTokens }>(
      '/auth/2fa/challenge/verify-login',
      { challengeToken, code }
    );
    return data.data;
  },
};

export default authService;
