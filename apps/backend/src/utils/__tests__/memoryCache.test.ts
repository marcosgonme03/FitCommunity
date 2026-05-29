/**
 * Tests unitarios del cache en memoria (memoryCache).
 *
 * Cubren la lógica con TTL sin depender de Redis ni de la BD:
 *  - cached: miss (ejecuta fn y guarda) vs hit (devuelve sin re-ejecutar)
 *  - expiración por TTL usando fake timers
 *  - invalidate / invalidatePrefix
 *  - sweepExpired
 *
 * Usamos jest.useFakeTimers() para controlar el paso del tiempo de forma
 * determinista, así no hay esperas reales ni tests "flaky".
 */

import {
  cached,
  invalidate,
  invalidatePrefix,
  sweepExpired,
} from '../memoryCache';

describe('memoryCache · cached', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    // Cada test arranca con claves únicas, pero limpiamos por si acaso.
    invalidatePrefix('');
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('en un MISS ejecuta la función y devuelve su valor', async () => {
    const fn = jest.fn().mockResolvedValue('valor-fresco');

    const result = await cached('k1', 30, fn);

    expect(result).toBe('valor-fresco');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('en un HIT (dentro del TTL) NO vuelve a ejecutar la función', async () => {
    const fn = jest.fn().mockResolvedValue('valor');

    await cached('k2', 30, fn); // miss -> ejecuta
    const second = await cached('k2', 30, fn); // hit -> no ejecuta

    expect(second).toBe('valor');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('vuelve a ejecutar la función cuando el TTL expira', async () => {
    const fn = jest
      .fn()
      .mockResolvedValueOnce('primero')
      .mockResolvedValueOnce('segundo');

    const first = await cached('k3', 10, fn); // TTL de 10s
    expect(first).toBe('primero');

    // Avanzamos 11s: la entrada ha caducado.
    jest.advanceTimersByTime(11_000);

    const second = await cached('k3', 10, fn);
    expect(second).toBe('segundo');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('cachea valores por clave de forma independiente', async () => {
    const fnA = jest.fn().mockResolvedValue('A');
    const fnB = jest.fn().mockResolvedValue('B');

    expect(await cached('alpha', 30, fnA)).toBe('A');
    expect(await cached('beta', 30, fnB)).toBe('B');
    // Re-pedir alpha no debe devolver B ni re-ejecutar.
    expect(await cached('alpha', 30, fnA)).toBe('A');
    expect(fnA).toHaveBeenCalledTimes(1);
  });
});

describe('memoryCache · invalidate', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    invalidatePrefix('');
  });
  afterEach(() => jest.useRealTimers());

  it('invalidate fuerza un MISS en la siguiente llamada', async () => {
    const fn = jest
      .fn()
      .mockResolvedValueOnce('v1')
      .mockResolvedValueOnce('v2');

    await cached('user:1', 60, fn);
    invalidate('user:1');
    const after = await cached('user:1', 60, fn);

    expect(after).toBe('v2');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('invalidate sobre una clave inexistente no lanza error', () => {
    expect(() => invalidate('no-existe')).not.toThrow();
  });
});

describe('memoryCache · invalidatePrefix', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    invalidatePrefix('');
  });
  afterEach(() => jest.useRealTimers());

  it('invalida solo las claves que empiezan por el prefijo', async () => {
    const fnDash = jest.fn().mockResolvedValue('dash');
    const fnOther = jest.fn().mockResolvedValue('other');

    await cached('dashboard:1', 60, fnDash);
    await cached('dashboard:2', 60, fnDash);
    await cached('profile:1', 60, fnOther);

    invalidatePrefix('dashboard:');

    // Las dashboard:* deben re-ejecutarse (miss).
    await cached('dashboard:1', 60, fnDash);
    // profile:1 sigue cacheado (hit, no re-ejecuta).
    await cached('profile:1', 60, fnOther);

    expect(fnDash).toHaveBeenCalledTimes(3); // 2 iniciales + 1 tras invalidar
    expect(fnOther).toHaveBeenCalledTimes(1);
  });
});

describe('memoryCache · sweepExpired', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    invalidatePrefix('');
  });
  afterEach(() => jest.useRealTimers());

  it('elimina entradas caducadas y conserva las vigentes', async () => {
    const corto = jest.fn().mockResolvedValue('corto');
    const largo = jest.fn().mockResolvedValue('largo');

    await cached('corto', 5, corto); // caduca a los 5s
    await cached('largo', 600, largo); // caduca a los 600s

    jest.advanceTimersByTime(10_000); // 10s después
    sweepExpired();

    // "corto" fue barrida -> miss; "largo" sigue -> hit.
    await cached('corto', 5, corto);
    await cached('largo', 600, largo);

    expect(corto).toHaveBeenCalledTimes(2);
    expect(largo).toHaveBeenCalledTimes(1);
  });
});
