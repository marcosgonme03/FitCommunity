/**
 * Helpers para extraer mensajes de error de forma segura desde respuestas
 * del backend o errores de Axios.
 *
 * REGLA: cualquier valor que vaya a renderizarse en JSX como mensaje de error
 * DEBE pasar por aquí, para evitar que React intente renderizar un objeto y
 * lance el error #31 ("Objects are not valid as a React child").
 */

/**
 * Devuelve un string SIEMPRE, incluso si el valor que recibe es un objeto,
 * un null/undefined, un AxiosError o cualquier otra cosa rara.
 *
 * @param err — el error capturado en el catch
 * @param fallback — texto a usar si no podemos extraer nada legible
 */
export function getErrorMessage(err: unknown, fallback = 'Ha ocurrido un error'): string {
  if (err == null) return fallback;
  if (typeof err === 'string') return err;

  // Posibles formas: AxiosError, Error, objeto con response.data
  const e = err as {
    response?: {
      data?: unknown;
    };
    message?: unknown;
  };

  // 1) Backend → { error: 'string', code?, message? }
  const data = e?.response?.data as
    | { error?: unknown; message?: unknown; code?: unknown }
    | undefined;

  if (data) {
    if (typeof data.error === 'string' && data.error) return data.error;
    if (typeof data.message === 'string' && data.message) return data.message;
  }

  // 2) AxiosError u otro Error con .message
  if (typeof e.message === 'string' && e.message) return e.message;

  // 3) Si todo lo demás falla, no devolvemos nunca el objeto
  return fallback;
}

/**
 * Extrae el código de error que envía el backend (p. ej. TOTP_REQUIRED,
 * USERNAME_TAKEN). Devuelve null si no hay.
 */
export function getErrorCode(err: unknown): string | null {
  const e = err as { response?: { data?: { code?: unknown } } };
  const code = e?.response?.data?.code;
  return typeof code === 'string' ? code : null;
}

/**
 * Extrae el campo `data` de la respuesta de error del backend (lo usamos para
 * recuperar setupToken / challengeToken durante el flujo 2FA).
 */
export function getErrorData<T = Record<string, unknown>>(err: unknown): T | null {
  const e = err as { response?: { data?: { data?: unknown } } };
  const data = e?.response?.data?.data;
  return data && typeof data === 'object' ? (data as T) : null;
}
