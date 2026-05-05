import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import authService from '../services/auth.service';
import { warmupBackend } from '../services/api';

/**
 * Initialize auth state on app start.
 * Tries to refresh the token silently. If it fails for any reason
 * (no cookie, backend unreachable, timeout), marks user as unauthenticated.
 */
export function useInitAuth() {
  const { setAuth, logout } = useAuthStore();

  useEffect(() => {
    let cancelled = false;

    async function init() {
      // Warmup: dispara un GET /health para que Render salga del cold start
      // antes de que el usuario intente autenticarse. No bloqueante: si falla,
      // la propia petición de refresh lo despertará igualmente.
      void warmupBackend();

      try {
        // Try silent refresh — will fail fast if no cookie or backend is down
        const { accessToken } = await authService.refreshToken();
        const user = await authService.getMe();
        if (!cancelled) {
          setAuth(user, accessToken);
        }
      } catch {
        // Any error (401, timeout, network) → not authenticated
        if (!cancelled) {
          logout();
        }
      }
    }

    void init();
    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/**
 * Access the current auth state and main auth actions.
 */
export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const accessToken = useAuthStore((s) => s.accessToken);
  const storeLogout = useAuthStore((s) => s.logout);

  async function logout() {
    try {
      await authService.logout();
    } catch {
      // ignore — even if it fails, clear local state
    }
    storeLogout();
  }

  return { user, isAuthenticated, isLoading, accessToken, logout };
}
