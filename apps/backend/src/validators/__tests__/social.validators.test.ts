/**
 * Tests unitarios de los validadores zod del módulo social.
 *
 * Cubren:
 *  - commentSchema: contenido no vacío y máximo de longitud
 *  - feedQuerySchema: coerción de tipos, límites y valor por defecto del limit
 */

import { commentSchema, feedQuerySchema } from '../social.validators';

describe('commentSchema', () => {
  it('acepta un comentario válido', () => {
    expect(commentSchema.safeParse({ content: 'Buen entreno!' }).success).toBe(true);
  });

  it('rechaza un comentario vacío', () => {
    expect(commentSchema.safeParse({ content: '' }).success).toBe(false);
  });

  it('rechaza un comentario que supera 1000 caracteres', () => {
    const largo = 'a'.repeat(1001);
    expect(commentSchema.safeParse({ content: largo }).success).toBe(false);
  });

  it('acepta exactamente 1000 caracteres (límite incluido)', () => {
    const limite = 'a'.repeat(1000);
    expect(commentSchema.safeParse({ content: limite }).success).toBe(true);
  });
});

describe('feedQuerySchema', () => {
  it('aplica limit por defecto de 20 cuando no se envía', () => {
    const res = feedQuerySchema.safeParse({});
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.limit).toBe(20);
  });

  it('coacciona el limit de string a número', () => {
    const res = feedQuerySchema.safeParse({ limit: '30' });
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.limit).toBe(30);
  });

  it('rechaza un limit por encima del máximo (> 50)', () => {
    expect(feedQuerySchema.safeParse({ limit: '51' }).success).toBe(false);
  });

  it('rechaza un limit no positivo', () => {
    expect(feedQuerySchema.safeParse({ limit: '0' }).success).toBe(false);
  });

  it('acepta un cursor opcional', () => {
    const res = feedQuerySchema.safeParse({ cursor: 'abc123', limit: '10' });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.cursor).toBe('abc123');
      expect(res.data.limit).toBe(10);
    }
  });
});
