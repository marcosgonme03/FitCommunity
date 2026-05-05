/**
 * Tests unitarios del workouts service.
 *
 * Prueban la lógica pura (sin BD) de las funciones más importantes:
 *  - estimateCalories: fórmula MET × peso corporal × duración
 *  - workoutSetSchema: validación de zod de cada serie
 *  - createWorkoutSchema: validación de un workout completo
 *
 * Mantenemos los tests sin tocar Prisma para que sean rápidos, no requieran
 * BD montada y se puedan ejecutar en CI sin setup adicional.
 */

import { estimateCalories } from '../workouts.service';
import {
  createWorkoutSchema,
  workoutSetSchema,
} from '../../validators/workouts.validators';

// ─── estimateCalories ────────────────────────────────────────────────────────

describe('workouts.service · estimateCalories', () => {
  it('calcula correctamente con intensidad MEDIUM, 60 min y 70 kg de usuario (MET 5)', () => {
    // 5 MET × 70 kg × (60/60) = 350 kcal
    const result = estimateCalories({ intensity: 'MEDIUM', durationMin: 60, weightKg: 70 });
    expect(result).toBe(350);
  });

  it('escala linealmente con la duración (30 min ≈ mitad)', () => {
    const long = estimateCalories({ intensity: 'HIGH', durationMin: 60, weightKg: 80 });
    const short = estimateCalories({ intensity: 'HIGH', durationMin: 30, weightKg: 80 });
    // Permite ±1 kcal de redondeo
    expect(short * 2).toBeGreaterThanOrEqual(long - 1);
    expect(short * 2).toBeLessThanOrEqual(long + 1);
  });

  it('aplica MET diferenciado por intensidad (MAX > HIGH > MEDIUM > LOW)', () => {
    const base = { durationMin: 60, weightKg: 80 };
    const low = estimateCalories({ intensity: 'LOW', ...base });
    const med = estimateCalories({ intensity: 'MEDIUM', ...base });
    const high = estimateCalories({ intensity: 'HIGH', ...base });
    const max = estimateCalories({ intensity: 'MAX', ...base });

    expect(low).toBeLessThan(med);
    expect(med).toBeLessThan(high);
    expect(high).toBeLessThan(max);
  });

  it('usa peso por defecto de 70 kg cuando weightKg no se proporciona', () => {
    const withWeight = estimateCalories({ intensity: 'MEDIUM', durationMin: 60, weightKg: 70 });
    const withoutWeight = estimateCalories({ intensity: 'MEDIUM', durationMin: 60 });
    expect(withoutWeight).toBe(withWeight);
  });

  it('usa peso por defecto cuando weightKg es 0, null o negativo', () => {
    const expected = estimateCalories({ intensity: 'MEDIUM', durationMin: 60, weightKg: 70 });
    expect(estimateCalories({ intensity: 'MEDIUM', durationMin: 60, weightKg: 0 })).toBe(expected);
    expect(estimateCalories({ intensity: 'MEDIUM', durationMin: 60, weightKg: null })).toBe(expected);
    expect(estimateCalories({ intensity: 'MEDIUM', durationMin: 60, weightKg: -10 })).toBe(expected);
  });

  it('devuelve un entero (Math.round, no fracciones de kcal)', () => {
    // 7 MET × 73 kg × (47/60) = 400.283... → Math.round = 400
    const result = estimateCalories({ intensity: 'HIGH', durationMin: 47, weightKg: 73 });
    expect(Number.isInteger(result)).toBe(true);
    expect(result).toBe(400);
  });

  it('devuelve 0 si la duración es 0', () => {
    expect(estimateCalories({ intensity: 'HIGH', durationMin: 0, weightKg: 80 })).toBe(0);
  });
});

// ─── workoutSetSchema (zod) ──────────────────────────────────────────────────

describe('workouts.validators · workoutSetSchema', () => {
  const validSet = {
    setNumber: 1,
    reps: 8,
    weightKg: 100,
    rpe: 8,
    isWarmup: false,
    isFailure: false,
    restSec: 120,
    notes: 'Buen set',
  };

  it('acepta una serie completa válida', () => {
    const result = workoutSetSchema.safeParse(validSet);
    expect(result.success).toBe(true);
  });

  it('aplica defaults a isWarmup e isFailure cuando se omiten', () => {
    const result = workoutSetSchema.safeParse({
      setNumber: 1,
      reps: 8,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isWarmup).toBe(false);
      expect(result.data.isFailure).toBe(false);
    }
  });

  it('rechaza setNumber no positivo', () => {
    expect(workoutSetSchema.safeParse({ ...validSet, setNumber: 0 }).success).toBe(false);
    expect(workoutSetSchema.safeParse({ ...validSet, setNumber: -1 }).success).toBe(false);
  });

  it('rechaza reps fuera del rango [0, 500]', () => {
    expect(workoutSetSchema.safeParse({ ...validSet, reps: -1 }).success).toBe(false);
    expect(workoutSetSchema.safeParse({ ...validSet, reps: 501 }).success).toBe(false);
    // El extremo 500 sí es válido
    expect(workoutSetSchema.safeParse({ ...validSet, reps: 500 }).success).toBe(true);
  });

  it('rechaza peso negativo o > 1000kg', () => {
    expect(workoutSetSchema.safeParse({ ...validSet, weightKg: -1 }).success).toBe(false);
    expect(workoutSetSchema.safeParse({ ...validSet, weightKg: 1001 }).success).toBe(false);
  });

  it('rechaza RPE fuera del rango [1, 10]', () => {
    expect(workoutSetSchema.safeParse({ ...validSet, rpe: 0.5 }).success).toBe(false);
    expect(workoutSetSchema.safeParse({ ...validSet, rpe: 11 }).success).toBe(false);
  });

  it('acepta weightKg y rpe como null o undefined', () => {
    expect(workoutSetSchema.safeParse({ ...validSet, weightKg: null }).success).toBe(true);
    expect(workoutSetSchema.safeParse({ ...validSet, rpe: null }).success).toBe(true);
    const noOpt = { setNumber: 1, reps: 8 };
    expect(workoutSetSchema.safeParse(noOpt).success).toBe(true);
  });

  it('rechaza notas demasiado largas (>300 chars)', () => {
    const tooLong = { ...validSet, notes: 'x'.repeat(301) };
    expect(workoutSetSchema.safeParse(tooLong).success).toBe(false);
  });
});

// ─── createWorkoutSchema ─────────────────────────────────────────────────────

describe('workouts.validators · createWorkoutSchema', () => {
  const VALID_EXERCISE_ID = '550e8400-e29b-41d4-a716-446655440000';

  const validWorkout = {
    title: 'Push pesado',
    durationMin: 60,
    intensity: 'HIGH' as const,
    exercises: [
      {
        exerciseId: VALID_EXERCISE_ID,
        orderIdx: 0,
        sets: [
          { setNumber: 1, reps: 8, weightKg: 80 },
          { setNumber: 2, reps: 8, weightKg: 80 },
          { setNumber: 3, reps: 6, weightKg: 85 },
        ],
      },
    ],
  };

  it('acepta un workout completo válido', () => {
    const result = createWorkoutSchema.safeParse(validWorkout);
    expect(result.success).toBe(true);
  });

  it('rechaza título con menos de 3 caracteres', () => {
    const r = createWorkoutSchema.safeParse({ ...validWorkout, title: 'ab' });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.path.includes('title'))).toBe(true);
    }
  });

  it('rechaza título con más de 200 caracteres', () => {
    const r = createWorkoutSchema.safeParse({ ...validWorkout, title: 'x'.repeat(201) });
    expect(r.success).toBe(false);
  });

  it('rechaza durationMin fuera del rango', () => {
    expect(createWorkoutSchema.safeParse({ ...validWorkout, durationMin: 0 }).success).toBe(false);
    expect(createWorkoutSchema.safeParse({ ...validWorkout, durationMin: -5 }).success).toBe(false);
    expect(createWorkoutSchema.safeParse({ ...validWorkout, durationMin: 1441 }).success).toBe(false);
  });

  it('rechaza intensity fuera del enum', () => {
    const r = createWorkoutSchema.safeParse({ ...validWorkout, intensity: 'INSANE' });
    expect(r.success).toBe(false);
  });

  it('rechaza workout sin ejercicios', () => {
    const r = createWorkoutSchema.safeParse({ ...validWorkout, exercises: [] });
    expect(r.success).toBe(false);
    if (!r.success) {
      const msg = r.error.issues.map((i) => i.message).join(' ');
      expect(msg).toMatch(/ejercicio/i);
    }
  });

  it('rechaza ejercicio sin sets', () => {
    const r = createWorkoutSchema.safeParse({
      ...validWorkout,
      exercises: [{ exerciseId: VALID_EXERCISE_ID, orderIdx: 0, sets: [] }],
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      const msg = r.error.issues.map((i) => i.message).join(' ');
      expect(msg).toMatch(/serie/i);
    }
  });

  it('rechaza exerciseId que no es UUID', () => {
    const r = createWorkoutSchema.safeParse({
      ...validWorkout,
      exercises: [{ ...validWorkout.exercises[0], exerciseId: 'not-a-uuid' }],
    });
    expect(r.success).toBe(false);
  });

  it('aplica default isPublic=true cuando se omite', () => {
    const r = createWorkoutSchema.safeParse(validWorkout);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.isPublic).toBe(true);
  });

  it('acepta photoUrl como URL válida o null', () => {
    expect(
      createWorkoutSchema.safeParse({ ...validWorkout, photoUrl: 'https://example.com/img.jpg' }).success
    ).toBe(true);
    expect(createWorkoutSchema.safeParse({ ...validWorkout, photoUrl: null }).success).toBe(true);
    // String que no es URL válida
    expect(createWorkoutSchema.safeParse({ ...validWorkout, photoUrl: 'not-a-url' }).success).toBe(false);
  });

  it('rechaza notes con más de 2000 caracteres', () => {
    const r = createWorkoutSchema.safeParse({ ...validWorkout, notes: 'x'.repeat(2001) });
    expect(r.success).toBe(false);
  });
});
