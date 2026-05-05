import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

export const profileSelect = {
  id: true,
  username: true,
  display_name: true,
  bio: true,
  avatar_url: true,
  cover_url: true,
  height_cm: true,
  weight_kg: true,
  birth_date: true,
  location: true,
  website: true,
  fitness_goal: true,
  experience_level: true,
  is_profile_public: true,
  show_workouts: true,
  show_stats: true,
  onboarding_completed: true,
} satisfies Prisma.UserProfileSelect;

export const userPublicSelect = {
  id: true,
  email: true,
  role: true,
  status: true,
  is_email_verified: true,
  two_fa_enabled: true,
  is_premium: true,
  created_at: true,
  last_login_at: true,
  profile: { select: profileSelect },
  _count: {
    select: {
      workouts: true,
      followers: true,
      following: true,
    },
  },
} satisfies Prisma.UserSelect;

export type UserWithMeta = Prisma.UserGetPayload<{ select: typeof userPublicSelect }>;

export function serializeUser(u: UserWithMeta) {
  return {
    id: u.id,
    email: u.email,
    role: u.role,
    status: u.status,
    isEmailVerified: u.is_email_verified,
    twoFaEnabled: u.two_fa_enabled,
    isPremium: u.is_premium,
    createdAt: u.created_at,
    lastLoginAt: u.last_login_at,
    profile: u.profile
      ? {
          id: u.profile.id,
          username: u.profile.username,
          displayName: u.profile.display_name,
          bio: u.profile.bio,
          avatarUrl: u.profile.avatar_url,
          coverUrl: u.profile.cover_url,
          heightCm: u.profile.height_cm,
          weightKg: u.profile.weight_kg,
          birthDate: u.profile.birth_date,
          location: u.profile.location,
          website: u.profile.website,
          fitnessGoal: u.profile.fitness_goal,
          experienceLevel: u.profile.experience_level,
          isProfilePublic: u.profile.is_profile_public,
          showWorkouts: u.profile.show_workouts,
          showStats: u.profile.show_stats,
          onboardingCompleted: u.profile.onboarding_completed,
        }
      : null,
    counts: {
      workouts: u._count.workouts,
      followers: u._count.followers,
      following: u._count.following,
    },
  };
}

export const usersService = {
  async findById(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: userPublicSelect,
    });
  },

  async findByUsername(username: string) {
    const profile = await prisma.userProfile.findUnique({
      where: { username },
      select: { user_id: true },
    });
    if (!profile) return null;
    return this.findById(profile.user_id);
  },

  async updateProfile(userId: string, data: Partial<{
    username: string;
    displayName: string;
    bio: string | null;
    avatarUrl: string | null;
    coverUrl: string | null;
    heightCm: number | null;
    weightKg: number | null;
    birthDate: string | null;
    location: string | null;
    website: string | null;
    fitnessGoal: Prisma.UserProfileUpdateInput['fitness_goal'];
    experienceLevel: Prisma.UserProfileUpdateInput['experience_level'];
    isProfilePublic: boolean;
    showWorkouts: boolean;
    showStats: boolean;
  }>) {
    const update: Prisma.UserProfileUpdateInput = {};
    if (data.username !== undefined) update.username = data.username;
    if (data.displayName !== undefined) update.display_name = data.displayName;
    if (data.bio !== undefined) update.bio = data.bio;
    if (data.avatarUrl !== undefined) update.avatar_url = data.avatarUrl;
    if (data.coverUrl !== undefined) update.cover_url = data.coverUrl;
    if (data.heightCm !== undefined) update.height_cm = data.heightCm;
    if (data.weightKg !== undefined) update.weight_kg = data.weightKg;
    if (data.birthDate !== undefined) update.birth_date = data.birthDate ? new Date(data.birthDate) : null;
    if (data.location !== undefined) update.location = data.location;
    if (data.website !== undefined) update.website = data.website;
    if (data.fitnessGoal !== undefined) update.fitness_goal = data.fitnessGoal;
    if (data.experienceLevel !== undefined) update.experience_level = data.experienceLevel;
    if (data.isProfilePublic !== undefined) update.is_profile_public = data.isProfilePublic;
    if (data.showWorkouts !== undefined) update.show_workouts = data.showWorkouts;
    if (data.showStats !== undefined) update.show_stats = data.showStats;

    await prisma.userProfile.update({
      where: { user_id: userId },
      data: update,
    });

    return this.findById(userId);
  },

  async completeOnboarding(userId: string, data: {
    username: string;
    displayName: string;
    bio?: string;
    heightCm?: number;
    weightKg?: number;
    fitnessGoal: string;
    experienceLevel: string;
  }) {
    await prisma.userProfile.update({
      where: { user_id: userId },
      data: {
        username: data.username,
        display_name: data.displayName,
        bio: data.bio ?? null,
        height_cm: data.heightCm ?? null,
        weight_kg: data.weightKg ?? null,
        fitness_goal: data.fitnessGoal as Prisma.UserProfileUpdateInput['fitness_goal'],
        experience_level: data.experienceLevel as Prisma.UserProfileUpdateInput['experience_level'],
        onboarding_completed: true,
      },
    });

    return this.findById(userId);
  },

  async checkUsernameAvailable(username: string, excludeUserId?: string) {
    const existing = await prisma.userProfile.findUnique({
      where: { username },
      select: { user_id: true },
    });
    if (!existing) return true;
    return existing.user_id === excludeUserId;
  },
};
