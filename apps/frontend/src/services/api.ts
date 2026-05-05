import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/authStore';

const API_URL = import.meta.env.VITE_API_URL ?? '/api';

/**
 * Cliente HTTP para la API.
 *
 * NOTA sobre el timeout: el backend corre en Render en plan free, que duerme
 * los servicios tras 15 min de inactividad. El "cold start" tarda 30-60 s en
 * la primera petición. Por eso el timeout es generoso (60 s) — pasados 60 s
 * Render ya tendría que estar listo o algo está roto de verdad.
 */
const COLD_START_TIMEOUT_MS = 60_000;
const WARM_TIMEOUT_MS = 15_000;

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
  timeout: COLD_START_TIMEOUT_MS,
});

/**
 * Una vez completada la primera petición exitosa sabemos que el backend está
 * caliente y podemos bajar el timeout para que peticiones lentas reales
 * (no cold starts) no se queden colgando un minuto.
 */
let backendIsWarm = false;

function markBackendWarm(): void {
  if (backendIsWarm) return;
  backendIsWarm = true;
  api.defaults.timeout = WARM_TIMEOUT_MS;
}

/**
 * Pinga el endpoint /health al cargar la app para que Render salga del sleep
 * antes de que el usuario haga login/register. Si falla, no pasa nada — la
 * propia petición de auth despertará al servicio.
 */
export async function warmupBackend(): Promise<void> {
  try {
    await api.get('/health', { timeout: COLD_START_TIMEOUT_MS });
    markBackendWarm();
  } catch {
    // ignoramos — no queremos romper la UI por un warmup fallido
  }
}

// ─── Request interceptor — attach access token ────────────────────────────────
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Response interceptor — handle 401 & token refresh ───────────────────────
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach((p) => {
    if (error) p.reject(error);
    else p.resolve(token!);
  });
  failedQueue = [];
}

api.interceptors.response.use(
  (response) => {
    markBackendWarm();
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
      _coldRetry?: boolean;
    };

    // ─── Reintento por timeout / cold start ──────────────────────────────────
    // Si la primera petición revienta por timeout o por error de red (típico
    // mientras Render está despertando), reintentamos UNA vez con timeout
    // largo. Esto evita que el usuario vea "timeout exceeded" la primera vez
    // que entra en la app tras un rato sin usarla.
    const isTimeoutOrNetwork =
      error.code === 'ECONNABORTED' ||
      error.code === 'ERR_NETWORK' ||
      error.message?.toLowerCase().includes('timeout') ||
      error.message?.toLowerCase().includes('network');

    if (isTimeoutOrNetwork && originalRequest && !originalRequest._coldRetry) {
      originalRequest._coldRetry = true;
      originalRequest.timeout = COLD_START_TIMEOUT_MS;
      // pequeño delay para dar tiempo a Render a terminar de bootear
      await new Promise((r) => setTimeout(r, 2_000));
      return api(originalRequest);
    }

    // ⚠️ NO reintentar si el propio endpoint de refresh devuelve 401
    // (evita bucle infinito)
    const isRefreshEndpoint = originalRequest?.url?.includes('/auth/refresh-token');
    if (isRefreshEndpoint) {
      useAuthStore.getState().logout();
      return Promise.reject(error);
    }

    // Si 401 y no hemos reintentado ya
    if (error.response?.status === 401 && !originalRequest?._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await api.post<{ success: boolean; data: { accessToken: string } }>(
          '/auth/refresh-token'
        );
        const newToken = data.data.accessToken;
        useAuthStore.getState().setAccessToken(newToken);
        processQueue(null, newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        useAuthStore.getState().logout();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
