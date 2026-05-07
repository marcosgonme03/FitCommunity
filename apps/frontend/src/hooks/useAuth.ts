import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import authService from '../services/auth.service';
import { warmupBackend } from '../services/api';

/**
 * Inicializa el estado de autenticación al arrancar la app.
 *
 * Comportamiento:
 *   - Si hay un user cacheado en localStorage, la UI YA está pintada con esos
 *     datos (ver authStore). Aquí lanzamos el refresh-token en silencio para
 *     validar la sesión y conseguir un accessToken vivo. Si todo va bien, no
 *     pasa nada visible. Si la sesión no vale, hacemos logout y router lleva
 *     al login.
 *   - Si NO hay user cacheado (visitante nuevo), `isLoading=true` desde el
 *     store y se muestra el LoadingScreen hasta que el refresh decida.
 *
 * Esta diferencia es la clave de que la app "arranque rápido": en lugar de
 * esperar 30-60 s al backend cold start de Render, el usuario ve la pantalla
 * que estaba viendo y, como mucho, se entera al final si su sesión expiró.
 */
export function useInitAuth() {
  const { setAuth, setUser, logout, setInitialized, setLoading, isInitialized } = useAuthStore();

  useEffect(() => {
    if (isInitialized) return;
    let cancelled = false;

    async function init() {
      // Warmup: dispara un GET /health para que Render salga del cold start
      // antes de que el usuario haga la próxima acción que requiera backend.
      void warmupBackend();

      try {
        const { accessToken } = await authService.refreshToken();
        if (cancelled) return;
        // Tenemos token vivo — pedimos /me para refrescar datos por si han
        // cambiado (rol, premium, etc.) pero NO bloqueamos la UI por ello.
        try {
          const user = await authService.getMe();
          if (!cancelled) setAuth(user, accessToken);
        } catch {
          // /me falla pero el token es válido — al menos guardamos el token
          if (!cancelled) {
            // mantenemos el user cacheado, solo actualizamos el token
            useAuthStore.getState().setAccessToken(accessToken);
            setLoading(false);
            setInitialized(true);
          }
        }
      } catch {
        // Refresh falló: o no hay cookie, o backend caído, o sesión expirada.
        // Limpiamos el user cacheado para que el siguiente PrivateRoute saque
        // al usuario al login en lugar de pintar UI con datos sin token.
        if (!cancelled) logout();
      }
    }

    void init();
    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refrescamos /me también cuando el documento vuelve a primer plano —
  // si el usuario tuvo la pestaña en background un rato, sus datos pueden
  // estar desactualizados.
  useEffect(() => {
    function onFocus() {
      authService.getMe().then((u) => setUser(u)).catch(() => undefined);
    }
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') onFocus();
    });
    return () => {
      document.removeEventListener('visibilitychange', onFocus);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/**
 * Acceso al estado de auth y acciones principales.
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
      // ignore — incluso si falla, limpiamos estado local
    }
    storeLogout();
  }

  return { user, isAuthenticated, isLoading, accessToken, logout };
}
