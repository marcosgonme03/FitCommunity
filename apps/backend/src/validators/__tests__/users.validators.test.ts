/**
 * Tests unitarios de los validadores zod de usuarios.
 *
 * Validan reglas de negocio del perfil sin tocar la BD:
 *  - username: longitud y caracteres permitidos
 *  - rangos físicos (altura/peso)
 *  - enums de objetivo y nivel de experiencia
 *  - onboarding: campos obligatorios
 */

import {
  updateProfileSchema,
  completeOnboardingSchema,
} from '../users.validators';

describe('updateProfileSchema', () => {
  it('acepta un perfil parcial válido', () => {
    const res = updateProfileSchema.safeParse({
      displayName: 'Marcos',
      bio: 'Atleta amateur',
      heightCm: 180,
      weightKg: 78,
      fitnessGoal: 'GAIN_MUSCLE',
      experienceLevel: 'INTERMEDIATE',
    });
    expect(res.success).toBe(true);
  });

  it('acepta un objeto vacío (todos los campos son opcionales)', () => {
    expect(updateProfileSchema.safeParse({}).success).toBe(true);
  });

  it('rechaza username con caracteres no permitidos', () => {
    const res = updateProfileSchema.safeParse({ username: 'mar cos!' });
    expect(res.success).toBe(false);
  });

  it('rechaza username demasiado corto (< 3)', () => {
    expect(updateProfileSchema.safeParse({ username: 'ab' }).success).toBe(false);
  });

  it('acepta username con guion bajo, letras y números', () => {
    expect(updateProfileSchema.safeParse({ username: 'marcos_03' }).success).toBe(true);
  });

  it('rechaza altura fuera de rango (> 250)', () => {
    expect(updateProfileSchema.safeParse({ heightCm: 300 }).success).toBe(false);
  });

  it('rechaza peso por debajo del mínimo (< 20)', () => {
    expect(updateProfileSchema.safeParse({ weightKg: 10 }).success).toBe(false);
  });

  it('permite bio y avatarUrl en null (campos nullable)', () => {
    expect(
      updateProfileSchema.safeParse({ bio: null, avatarUrl: null }).success
    ).toBe(true);
  });

  it('rechaza una URL de avatar inválida', () => {
    expect(updateProfileSchema.safeParse({ avatarUrl: 'no-es-url' }).success).toBe(false);
  });

  it('rechaza un fitnessGoal no permitido', () => {
    expect(
      updateProfileSchema.safeParse({ fitnessGoal: 'BECOME_BATMAN' }).success
    ).toBe(false);
  });
});

describe('completeOnboardingSchema', () => {
  const base = {
    displayName: 'Marcos',
    username: 'marcos_03',
    fitnessGoal: 'STAY_HEALTHY',
    experienceLevel: 'BEGINNER',
  };

  it('acepta los campos obligatorios mínimos', () => {
    expect(completeOnboardingSchema.safeParse(base).success).toBe(true);
  });

  it('rechaza si falta el objetivo (fitnessGoal obligatorio)', () => {
    const { fitnessGoal, ...sinObjetivo } = base;
    expect(completeOnboardingSchema.safeParse(sinObjetivo).success).toBe(false);
  });

  it('rechaza si falta displayName', () => {
    const { displayName, ...sinNombre } = base;
    expect(completeOnboardingSchema.safeParse(sinNombre).success).toBe(false);
  });

  it('acepta campos físicos opcionales dentro de rango', () => {
    const res = completeOnboardingSchema.safeParse({
      ...base,
      heightCm: 175,
      weightKg: 70,
    });
    expect(res.success).toBe(true);
  });
});
