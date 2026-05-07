import { create } from 'zustand';
import { User } from '../types';

/**
 * Estado de autenticación.
 *
 * Hidratación optimista: leemos el último `user` que vimos del localStorage
 * para que la app pueda renderizar el layout y la página actual al instante,
 * sin esperar al refresh-token. En segundo plano, useInitAuth verifica que
 * la sesión sigue siendo válida; si lo es, simplemente se queda — el usuario
 * no vio nunca una pantalla de carga. Si no, se hace logout y se redirige.
 *
 * Esto es lo que diferencia una app que "tarda 30-60 segundos en cargar"
 * (que es lo que pasa cuando el backend está en cold start) de una app que
 * arranca en milisegundos y luego, a lo sumo, te saca al login si la sesión
 * ya no vale.
 */

const STORAGE_KEY_USER = 'fc-auth-user';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  /**
   * `isLoading` ahora arranca como `false` cuando hay user cacheado: la UI
   * se pinta de inmediato. Solo es `true` para visitantes nuevos sin sesión
   * conocida, donde sí queremos esperar al refresh antes de decidir.
   */
  isLoading: boolean;
  /** Verificación inicial de sesión completada (usuario o anónimo decidido) */
  isInitialized: boolean;

  // Actions
  setUser: (user: User) => void;
  setAccessToken: (token: string) => void;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
  setInitialized: (v: boolean) => void;
}

function readCachedUser(): User | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USER);
    if (!raw) return null;
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

function writeCachedUser(user: User | null): void {
  try {
    if (user) localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
    else localStorage.removeItem(STORAGE_KEY_USER);
  } catch {
    // localStorage no disponible (incógnito en Safari) — ignorar
  }
}

const cachedUser = readCachedUser();

export const useAuthStore = create<AuthState>((set) => ({
  // Render optimista: si hay user cacheado, asumimos autenticado de entrada
  // y la UI aparece al instante. La verificación real corre en background.
  user: cachedUser,
  accessToken: null,
  isAuthenticated: !!cachedUser,
  isLoading: !cachedUser, // solo "loading" si NO hay datos previos
  isInitialized: false,

  setUser: (user) => {
    writeCachedUser(user);
    set({ user });
  },

  setAccessToken: (accessToken) => set({ accessToken }),

  setAuth: (user, accessToken) => {
    writeCachedUser(user);
    set({
      user,
      accessToken,
      isAuthenticated: true,
      isLoading: false,
      isInitialized: true,
    });
  },

  logout: () => {
    writeCachedUser(null);
    set({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
      isInitialized: true,
    });
  },

  setLoading: (isLoading) => set({ isLoading }),
  setInitialized: (isInitialized) => set({ isInitialized }),
}));
