/**
 * Cache en memoria con TTL.
 *
 * Pensado para resultados de queries pesadas (dashboards, analytics) donde
 * un retraso de 30-60s entre actualizaciones es perfectamente aceptable.
 *
 * Es **in-process**: si tienes varias instancias del backend, cada una tendrá
 * su propio cache. Para una sola instancia (caso TFG / dev / producción
 * single-node) es la opción más simple y rápida.
 *
 * No requiere Redis: si Redis está caído, esto sigue funcionando.
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const store = new Map<string, CacheEntry<unknown>>();

/**
 * Devuelve el valor cacheado si existe y no ha expirado, o ejecuta `fn`,
 * cachea el resultado y lo devuelve.
 *
 * @example
 *   const stats = await cached(`dashboard:${userId}`, 30, () => buildStats(userId));
 */
export async function cached<T>(
  key: string,
  ttlSeconds: number,
  fn: () => Promise<T>
): Promise<T> {
  const now = Date.now();
  const hit = store.get(key) as CacheEntry<T> | undefined;
  if (hit && hit.expiresAt > now) {
    return hit.value;
  }
  const value = await fn();
  store.set(key, { value, expiresAt: now + ttlSeconds * 1000 });
  return value;
}

/**
 * Invalida una entrada concreta del cache. Llamar cuando cambian los datos
 * (ej: tras crear un entrenamiento, invalidar `dashboard:${userId}`).
 */
export function invalidate(key: string): void {
  store.delete(key);
}

/**
 * Invalida todas las entradas cuya clave empiece por `prefix`.
 * Útil para invalidaciones masivas (ej: todas las analytics admin).
 */
export function invalidatePrefix(prefix: string): void {
  for (const k of store.keys()) {
    if (k.startsWith(prefix)) store.delete(k);
  }
}

/**
 * Limpia entradas caducadas. Llamar periódicamente (no es crítico: las
 * entradas caducadas no se devuelven, solo ocupan memoria).
 */
export function sweepExpired(): void {
  const now = Date.now();
  for (const [k, v] of store.entries()) {
    if (v.expiresAt <= now) store.delete(k);
  }
}

// Sweep automático cada 5 minutos para evitar que el Map crezca indefinidamente
setInterval(sweepExpired, 5 * 60 * 1000).unref?.();
