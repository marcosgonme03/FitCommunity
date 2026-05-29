/**
 * Tests unitarios de serializeUser (users.service).
 *
 * serializeUser convierte la fila de la BD (snake_case, estructura Prisma)
 * en el DTO que consume el frontend (camelCase). Es lógica pura: no toca
 * Prisma en tiempo de ejecución, así que podemos probarla con un objeto
 * de ejemplo sin necesidad de BD.
 */

import { serializeUser } from '../users.service';

// Construye un usuario de ejemplo con la forma que devuelve userPublicSelect.
function makeUser(overrides: Record<string, unknown> = {}): any {
  return {
    id: 'u-1',
    email: 'marcos@example.com',
    role: 'USER',
    status: 'ACTIVE',
    is_email_verified: true,
    two_fa_enabled: false,
    is_premium: false,
    created_at: new Date('2026-01-01T00:00:00Z'),
    last_login_at: new Date('2026-05-01T00:00:00Z'),
    profile: {
      id: 'p-1',
      username: 'marcos_03',
      display_name: 'Marcos',
      bio: 'Atleta amateur',
      avatar_url: 'https://cdn/a.png',
      cover_url: null,
      height_cm: 180,
      weight_kg: 78,
      birth_date: null,
      location: 'Madrid',
      website: null,
      fitness_goal: 'GAIN_MUSCLE',
      experience_level: 'INTERMEDIATE',
      is_profile_public: true,
      show_workouts: true,
      show_stats: false,
      onboarding_completed: true,
    },
    _count: { workouts: 12, followers: 34, following: 56 },
    ...overrides,
  };
}

describe('serializeUser', () => {
  it('mapea los campos de nivel raíz a camelCase', () => {
    const dto = serializeUser(makeUser());
    expect(dto.id).toBe('u-1');
    expect(dto.email).toBe('marcos@example.com');
    expect(dto.isEmailVerified).toBe(true);
    expect(dto.twoFaEnabled).toBe(false);
    expect(dto.isPremium).toBe(false);
  });

  it('mapea el perfil de snake_case a camelCase', () => {
    const dto = serializeUser(makeUser());
    expect(dto.profile).not.toBeNull();
    expect(dto.profile?.username).toBe('marcos_03');
    expect(dto.profile?.displayName).toBe('Marcos');
    expect(dto.profile?.heightCm).toBe(180);
    expect(dto.profile?.weightKg).toBe(78);
    expect(dto.profile?.fitnessGoal).toBe('GAIN_MUSCLE');
    expect(dto.profile?.experienceLevel).toBe('INTERMEDIATE');
    expect(dto.profile?.isProfilePublic).toBe(true);
    expect(dto.profile?.showStats).toBe(false);
    expect(dto.profile?.onboardingCompleted).toBe(true);
  });

  it('devuelve profile = null cuando el usuario no tiene perfil', () => {
    const dto = serializeUser(makeUser({ profile: null }));
    expect(dto.profile).toBeNull();
  });

  it('expone los contadores (workouts, followers, following)', () => {
    const dto = serializeUser(makeUser());
    expect(dto.counts).toEqual({ workouts: 12, followers: 34, following: 56 });
  });

  it('conserva valores null del perfil sin convertirlos a undefined', () => {
    const dto = serializeUser(makeUser());
    expect(dto.profile?.coverUrl).toBeNull();
    expect(dto.profile?.website).toBeNull();
    expect(dto.profile?.birthDate).toBeNull();
  });
});
