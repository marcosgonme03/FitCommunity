/**
 * Tests unitarios del validador zod de notificaciones.
 *
 * Cubren la query de listado:
 *  - valores por defecto de page y limit
 *  - coerción de string a número
 *  - límite máximo de limit
 *  - transformación de unreadOnly ('true'/'false' -> boolean)
 */

import { listNotificationsQuerySchema } from '../notifications.validators';

describe('listNotificationsQuerySchema', () => {
  it('aplica page=1 y limit=20 por defecto', () => {
    const res = listNotificationsQuerySchema.safeParse({});
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.page).toBe(1);
      expect(res.data.limit).toBe(20);
    }
  });

  it('coacciona page y limit de string a número', () => {
    const res = listNotificationsQuerySchema.safeParse({ page: '3', limit: '50' });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.page).toBe(3);
      expect(res.data.limit).toBe(50);
    }
  });

  it('rechaza un limit por encima del máximo (> 100)', () => {
    expect(listNotificationsQuerySchema.safeParse({ limit: '101' }).success).toBe(false);
  });

  it("transforma unreadOnly 'true' a boolean true", () => {
    const res = listNotificationsQuerySchema.safeParse({ unreadOnly: 'true' });
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.unreadOnly).toBe(true);
  });

  it("transforma unreadOnly 'false' a boolean false", () => {
    const res = listNotificationsQuerySchema.safeParse({ unreadOnly: 'false' });
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.unreadOnly).toBe(false);
  });

  it('rechaza un unreadOnly que no sea "true" ni "false"', () => {
    expect(listNotificationsQuerySchema.safeParse({ unreadOnly: 'maybe' }).success).toBe(false);
  });
});
