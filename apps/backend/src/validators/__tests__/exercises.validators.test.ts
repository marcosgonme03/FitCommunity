/**
 * Tests unitarios de los validadores zod de ejercicios.
 *
 * Cubren el filtro de listado y la creación de ejercicios personalizados:
 *  - enums de grupo muscular, equipamiento y categoría
 *  - longitudes de nombre/descripción
 *  - máximo de músculos secundarios
 */

import {
  listExercisesQuerySchema,
  createCustomExerciseSchema,
} from '../exercises.validators';

describe('listExercisesQuerySchema', () => {
  it('acepta un query vacío (todos los filtros opcionales)', () => {
    expect(listExercisesQuerySchema.safeParse({}).success).toBe(true);
  });

  it('acepta filtros válidos combinados', () => {
    const res = listExercisesQuerySchema.safeParse({
      search: 'press',
      muscle: 'CHEST',
      equipment: 'BARBELL',
      category: 'COMPOUND',
    });
    expect(res.success).toBe(true);
  });

  it('rechaza un grupo muscular no válido', () => {
    expect(listExercisesQuerySchema.safeParse({ muscle: 'TAIL' }).success).toBe(false);
  });

  it('rechaza un equipamiento no válido', () => {
    expect(
      listExercisesQuerySchema.safeParse({ equipment: 'LIGHTSABER' }).success
    ).toBe(false);
  });
});

describe('createCustomExerciseSchema', () => {
  const base = {
    name: 'Press inclinado con mancuernas',
    primaryMuscle: 'CHEST',
    equipment: 'DUMBBELL',
    category: 'COMPOUND',
  };

  it('acepta un ejercicio válido mínimo', () => {
    expect(createCustomExerciseSchema.safeParse(base).success).toBe(true);
  });

  it('rechaza un nombre demasiado corto (< 2)', () => {
    expect(createCustomExerciseSchema.safeParse({ ...base, name: 'A' }).success).toBe(false);
  });

  it('acepta hasta 5 músculos secundarios', () => {
    const res = createCustomExerciseSchema.safeParse({
      ...base,
      secondaryMuscles: ['TRICEPS', 'SHOULDERS', 'CORE', 'BACK', 'TRAPS'],
    });
    expect(res.success).toBe(true);
  });

  it('rechaza más de 5 músculos secundarios', () => {
    const res = createCustomExerciseSchema.safeParse({
      ...base,
      secondaryMuscles: ['TRICEPS', 'SHOULDERS', 'CORE', 'BACK', 'TRAPS', 'LATS'],
    });
    expect(res.success).toBe(false);
  });

  it('rechaza si falta el músculo principal', () => {
    const { primaryMuscle, ...sinMusculo } = base;
    expect(createCustomExerciseSchema.safeParse(sinMusculo).success).toBe(false);
  });
});
