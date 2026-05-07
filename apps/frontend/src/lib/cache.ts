/**
 * Cache stale-while-revalidate sobre localStorage.
 *
 * Patrón: la app pinta inmediatamente con lo último que vio (`stale`) y, en
 * paralelo, refresca con datos frescos del servidor. Si el backend tarda 30
 * segundos (cold start de Render), el usuario sigue viendo datos válidos en
 * lugar de un spinner. Cuando llega la respuesta nueva, se actualiza en sitio.
 *
 * Esto es lo que hace que un panel admin se sienta "instantáneo" en Render
 * free tier en vez de "siempre cargando".
 */

interface CachedEntry<T> {
  value: T;
  /** Timestamp de creación, en ms desde epoch */
  ts: number;
}

const PREFIX = 'fc-cache:';
/**
 * Tiempo máximo que aceptamos servir cache "stale" sin haber visto nada
 * nuevo. Pasado ese tiempo, mejor mostrar spinner que datos potencialmente
 * muy desfasados (típico: dashboard que el admin no abre desde hace una
 * semana — no queremos engañarlo con cifras viejas).
 */
const MAX_STALE_AGE_MS = 24 * 60 * 60 * 1000; // 24h

export function readCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedEntry<T>;
    if (!parsed || typeof parsed.ts !== 'number') return null;
    if (Date.now() - parsed.ts > MAX_STALE_AGE_MS) {
      localStorage.removeItem(PREFIX + key);
      return null;
    }
    return parsed.value;
  } catch {
    return null;
  }
}

export function writeCache<T>(key: string, value: T): void {
  try {
    const entry: CachedEntry<T> = { value, ts: Date.now() };
    localStorage.setItem(PREFIX + key, JSON.stringify(entry));
  } catch {
    // localStorage lleno o no disponible → ignorar, la cache es opcional
  }
}

/**
 * Helper para usar dentro de useEffect. Devuelve el valor cacheado si existe,
 * y dispara la promesa para actualizar. El callback `onFresh` se llama cuando
 * llegan los datos nuevos para que el componente actualice su state.
 */
export async function staleWhileRevalidate<T>(
  key: string,
  fetcher: () => Promise<T>,
  onFresh: (value: T) => void,
): Promise<void> {
  try {
    const fresh = await fetcher();
    writeCache(key, fresh);
    onFresh(fresh);
  } catch {
    // Si el fetcher falla y no había nada en cache, dejamos que el caller
    // muestre su error/empty state. Si había cache, ya está pintada.
  }
}
