/**
 * Tests unitarios de los validadores zod del módulo de IA (coach/nutrición).
 *
 * Cubren:
 *  - chatMessageSchema: mensaje no vacío / longitud máxima / conversationId UUID
 *  - generateRoutineSchema: rangos de días y minutos, equipamiento por defecto
 *  - generateNutritionSchema: rangos antropométricos y enums
 */

import {
  chatMessageSchema,
  generateRoutineSchema,
  generateNutritionSchema,
} from '../ai.validators';

describe('chatMessageSchema', () => {
  it('acepta un mensaje válido sin conversationId', () => {
    expect(chatMessageSchema.safeParse({ message: 'Hola coach' }).success).toBe(true);
  });

  it('rechaza un mensaje vacío', () => {
    expect(chatMessageSchema.safeParse({ message: '' }).success).toBe(false);
  });

  it('rechaza un conversationId que no es UUID', () => {
    const res = chatMessageSchema.safeParse({
      message: 'hola',
      conversationId: '123',
    });
    expect(res.success).toBe(false);
  });

  it('acepta un conversationId UUID válido', () => {
    const res = chatMessageSchema.safeParse({
      message: 'hola',
      conversationId: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(res.success).toBe(true);
  });
});

describe('generateRoutineSchema', () => {
  const base = {
    goal: 'GAIN_MUSCLE',
    daysPerWeek: 4,
    sessionMinutes: 60,
    experienceLevel: 'INTERMEDIATE',
  };

  it('acepta una rutina válida y aplica equipment por defecto', () => {
    const res = generateRoutineSchema.safeParse(base);
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.equipment).toEqual(['FULL_GYM']);
  });

  it('rechaza daysPerWeek fuera de rango (> 7)', () => {
    expect(generateRoutineSchema.safeParse({ ...base, daysPerWeek: 8 }).success).toBe(false);
  });

  it('rechaza sessionMinutes por debajo del mínimo (< 15)', () => {
    expect(generateRoutineSchema.safeParse({ ...base, sessionMinutes: 10 }).success).toBe(false);
  });

  it('acepta un equipment explícito válido', () => {
    const res = generateRoutineSchema.safeParse({
      ...base,
      equipment: ['DUMBBELLS', 'BANDS'],
    });
    expect(res.success).toBe(true);
  });
});

describe('generateNutritionSchema', () => {
  const base = {
    goal: 'LOSE_WEIGHT',
    heightCm: 180,
    weightKg: 80,
    age: 23,
    sex: 'MALE',
    activityLevel: 'MODERATE',
  };

  it('acepta datos antropométricos válidos', () => {
    expect(generateNutritionSchema.safeParse(base).success).toBe(true);
  });

  it('rechaza una edad por debajo del mínimo (< 14)', () => {
    expect(generateNutritionSchema.safeParse({ ...base, age: 10 }).success).toBe(false);
  });

  it('rechaza un peso fuera de rango (> 250)', () => {
    expect(generateNutritionSchema.safeParse({ ...base, weightKg: 300 }).success).toBe(false);
  });

  it('rechaza un nivel de actividad no válido', () => {
    expect(
      generateNutritionSchema.safeParse({ ...base, activityLevel: 'SUPERSAIYAN' }).success
    ).toBe(false);
  });
});
