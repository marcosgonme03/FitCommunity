import { config } from '../config';
import { logger } from './logger';

/**
 * Keep-alive contra el sleep agresivo de Render free tier.
 *
 * Render duerme cualquier servicio web tras 15 min sin tráfico. La primera
 * petición tras el sueño tarda 30-60 s en arrancar, lo que se traduce en una
 * pésima experiencia: el usuario ve "Cargando…" un minuto entero.
 *
 * Solución: cada 14 min hacemos un GET a la URL pública del propio servicio.
 * Render solo cuenta como "tráfico" las peticiones HTTP externas — no los
 * timers internos — así que el ping debe salir y volver a entrar por la URL
 * pública. Como el servidor ya estaba caliente, el ping responde en <100 ms.
 *
 * Salvaguardas:
 *   - Solo se activa si `KEEP_ALIVE_URL` está configurada — en local no hace
 *     nada, así que no inunda los logs en dev.
 *   - El ping no requiere autenticación (apunta a /api/health, que es público).
 *   - Si falla, lo logueamos como warning pero no rompemos nada.
 */

const KEEP_ALIVE_INTERVAL_MS = 14 * 60 * 1000; // 14 min — bajo el threshold de Render

let intervalHandle: NodeJS.Timeout | null = null;

export function startKeepAlive(): void {
  // En dev no queremos hacer self-ping — solo en producción cuando hay URL
  if (config.NODE_ENV !== 'production') return;

  // Lee la URL del propio servicio. Cuando se despliega en Render ya viene
  // como variable de entorno RENDER_EXTERNAL_URL automáticamente; si no, el
  // operador puede setear KEEP_ALIVE_URL a mano.
  const url =
    process.env.KEEP_ALIVE_URL ?? process.env.RENDER_EXTERNAL_URL ?? null;

  if (!url) {
    logger.info(
      'Keep-alive deshabilitado: no hay KEEP_ALIVE_URL ni RENDER_EXTERNAL_URL',
    );
    return;
  }

  const target = url.replace(/\/$/, '') + '/api/health';
  logger.info(`Keep-alive activo: ping a ${target} cada 14 min`);

  // Primer ping a los 30 s para no competir con el bootstrap
  setTimeout(() => void ping(target), 30_000);

  intervalHandle = setInterval(() => void ping(target), KEEP_ALIVE_INTERVAL_MS);
}

export function stopKeepAlive(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
}

async function ping(url: string): Promise<void> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) {
      logger.warn(`Keep-alive ping respondió ${res.status}`);
    }
  } catch (err) {
    logger.warn('Keep-alive ping falló:', err instanceof Error ? err.message : err);
  }
}
