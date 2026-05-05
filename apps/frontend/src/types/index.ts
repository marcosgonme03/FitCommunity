// ─── Auth ──────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  role: 'USER' | 'ADMIN';
  status: UserStatus;
  isEmailVerified: boolean;
  twoFaEnabled: boolean;
  isPremium: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  profile: UserProfile | null;
  counts?: {
    workouts: number;
    followers: number;
    following: number;
  };
  isFollowing?: boolean;
  isSelf?: boolean;
}

export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  heightCm: number | null;
  weightKg: number | null;
  birthDate: string | null;
  location: string | null;
  website?: string | null;
  fitnessGoal: FitnessGoal | null;
  experienceLevel: ExperienceLevel | null;
  isProfilePublic: boolean;
  showWorkouts?: boolean;
  showStats?: boolean;
  onboardingCompleted: boolean;
}

// ─── Enums ────────────────────────────────────────────────────────────────────

export type IntensityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'MAX';

export type FitnessGoal =
  | 'LOSE_WEIGHT' | 'GAIN_MUSCLE' | 'IMPROVE_STRENGTH'
  | 'STAY_HEALTHY' | 'RECOMP' | 'POWERLIFTING' | 'HYPERTROPHY';

export type ExperienceLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'PROFESSIONAL';

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'BANNED' | 'PENDING_VERIFICATION';

export type MuscleGroup =
  | 'CHEST' | 'BACK' | 'SHOULDERS' | 'BICEPS' | 'TRICEPS' | 'FOREARMS'
  | 'QUADS' | 'HAMSTRINGS' | 'GLUTES' | 'CALVES' | 'CORE'
  | 'TRAPS' | 'LATS' | 'FULL_BODY' | 'CARDIO';

export type Equipment =
  | 'BARBELL' | 'DUMBBELL' | 'MACHINE' | 'CABLE' | 'BODYWEIGHT'
  | 'KETTLEBELL' | 'BAND' | 'SMITH_MACHINE' | 'CARDIO_MACHINE' | 'OTHER';

export type ExerciseCategory = 'COMPOUND' | 'ISOLATION' | 'CARDIO' | 'MOBILITY';

// ─── Exercises ─────────────────────────────────────────────────────────────

export interface Exercise {
  id: string;
  slug: string;
  name: string;
  name_en?: string | null;
  description?: string | null;
  primary_muscle: MuscleGroup;
  secondary_muscles: MuscleGroup[];
  equipment: Equipment;
  category: ExerciseCategory;
  is_custom: boolean;
  created_by?: string | null;
  image_url?: string | null;
  video_url?: string | null;
  instructions?: string | null;
  created_at: string;
}

export interface WorkoutSet {
  id?: string;
  setNumber: number;
  reps: number;
  weightKg?: number | null;
  rpe?: number | null;
  isWarmup?: boolean;
  isFailure?: boolean;
  restSec?: number | null;
  notes?: string | null;
}

export interface WorkoutExercise {
  id?: string;
  orderIdx: number;
  notes?: string | null;
  exercise: {
    id: string;
    slug: string;
    name: string;
    primaryMuscle: MuscleGroup;
    secondaryMuscles: MuscleGroup[];
    equipment: Equipment;
    category: ExerciseCategory;
    imageUrl?: string | null;
  };
  sets: WorkoutSet[];
}

// ─── Workouts ─────────────────────────────────────────────────────────────────

export interface Workout {
  id: string;
  userId: string;
  title: string;
  notes: string | null;
  durationMin: number;
  intensity: IntensityLevel;
  calories: number | null;
  photoUrl: string | null;
  isPublic: boolean;
  workoutDate: string;
  createdAt: string;
  updatedAt: string;
  likesCount: number;
  commentsCount: number;
  viewerLiked?: boolean;
  user: {
    id: string;
    isPremium?: boolean;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
  } | null;
  exercises: WorkoutExercise[];
}

export interface FeedWorkout {
  id: string;
  userId: string;
  title: string;
  notes: string | null;
  durationMin: number;
  intensity: IntensityLevel;
  calories: number | null;
  photoUrl: string | null;
  isPublic: boolean;
  workoutDate: string;
  createdAt: string;
  updatedAt: string;
  likesCount: number;
  commentsCount: number;
  exercisesCount: number;
  exercisesPreview: Array<{ name: string; primaryMuscle: MuscleGroup; setsCount: number }>;
  viewerLiked?: boolean;
  user: {
    id: string;
    isPremium: boolean;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
  };
}

export interface WorkoutStats {
  totals: {
    workouts: number;
    minutes: number;
    calories: number;
  };
  thisMonth: {
    workouts: number;
    minutes: number;
    calories: number;
  };
  thisYear: {
    workouts: number;
    minutes: number;
    calories: number;
  };
  streakDays: number;
  topMuscles: Array<{ muscle: MuscleGroup; count: number }>;
  last30Days: {
    totalVolume: number;
    totalSets: number;
  };
  weeklyActivity: Array<{
    weekStart: string;
    count: number;
    minutes: number;
    calories: number;
  }>;
  recentWorkouts: Workout[];
}

export interface PersonalRecord {
  exerciseId: string;
  exerciseSlug: string;
  exerciseName: string;
  primaryMuscle: MuscleGroup;
  equipment: string;
  maxWeight: number;
  repsAtMax: number;
  estimatedOneRm: number;
  achievedAt: string;
  workoutId: string;
  timesPerformed: number;
}

export interface ExerciseProgressPoint {
  workoutId: string;
  workoutDate: string;
  maxWeight: number;
  maxReps: number;
  totalVolume: number;
}

export interface CalendarDay {
  day: number;
  count: number;
  muscles: MuscleGroup[];
  workouts: Array<{
    id: string;
    title: string;
    intensity: IntensityLevel;
    duration_min: number;
    calories: number | null;
    workout_date: string;
    muscles: MuscleGroup[];
  }>;
}

export interface CalendarMonth {
  year: number;
  month: number;
  days: CalendarDay[];
  totalWorkouts: number;
}

// ─── Social ───────────────────────────────────────────────────────────────────

export interface Comment {
  id: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
  };
}

export interface SimpleUser {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  bio?: string | null;
}

export interface SuggestedUser extends SimpleUser {
  isPremium?: boolean;
  experienceLevel?: ExperienceLevel | null;
  followersCount: number;
  workoutsCount: number;
}

// ─── Subscription / Premium ──────────────────────────────────────────────────

export interface SubscriptionInfo {
  id: string;
  status: 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'INCOMPLETE' | 'INCOMPLETE_EXPIRED' | 'TRIALING' | 'UNPAID';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
}

// ─── AI ──────────────────────────────────────────────────────────────────────

export interface AiConversation {
  id: string;
  kind: 'COACH_CHAT' | 'ROUTINE' | 'NUTRITION' | 'PROGRESS_ANALYSIS';
  title: string;
  created_at: string;
  updated_at: string;
  messages?: AiMessage[];
  _count?: { messages: number };
}

export interface AiMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
}

export interface RoutineExercise {
  name: string;
  sets: number;
  reps: string;
  rest_sec: number;
  notes?: string;
}

export interface RoutineDay {
  day: number;
  focus: string;
  warmup?: string;
  exercises: RoutineExercise[];
  cooldown?: string;
}

export interface RoutinePlanJson {
  title: string;
  summary: string;
  weekly_plan: RoutineDay[];
  tips?: string[];
}

export interface GeneratedRoutine {
  id: string;
  user_id: string;
  title: string;
  goal: FitnessGoal;
  days_per_week: number;
  session_minutes: number;
  experience_level: ExperienceLevel;
  plan_json: RoutinePlanJson;
  is_favorite: boolean;
  /** True si el usuario tiene esta rutina como activa (la que sigue día a día) */
  is_active?: boolean;
  /** Cuándo se activó por primera vez */
  started_at?: string | null;
  /** Día actual de la rotación secuencial (0-indexed) */
  current_day_idx?: number;
  created_at: string;
}

export interface NutritionMeal {
  name: string;
  kcal: number;
  items: string[];
}

export interface NutritionDay {
  day: string;
  meals: NutritionMeal[];
}

export interface NutritionPlanJson {
  title: string;
  summary: string;
  daily_calories: number;
  macros: { protein_g: number; carbs_g: number; fat_g: number };
  weekly_plan: NutritionDay[];
  tips?: string[];
}

export interface NutritionPlan {
  id: string;
  user_id: string;
  title: string;
  goal: FitnessGoal;
  daily_calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  plan_json: NutritionPlanJson;
  is_favorite: boolean;
  created_at: string;
}

// ─── Admin ────────────────────────────────────────────────────────────────────

export interface AdminUserListItem {
  id: string;
  email: string;
  role: 'USER' | 'ADMIN';
  status: UserStatus;
  isEmailVerified: boolean;
  twoFaEnabled: boolean;
  /** Flag de premium en el modelo User (puede divergir de subscription si hay desincronización) */
  isPremium: boolean;
  /** Suscripción activa más reciente (null si no hay) */
  subscription: {
    status: 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'INCOMPLETE' | 'INCOMPLETE_EXPIRED' | 'TRIALING' | 'UNPAID';
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
  } | null;
  createdAt: string;
  lastLoginAt: string | null;
  bannedAt: string | null;
  bannedReason: string | null;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  experienceLevel: ExperienceLevel | null;
  location: string | null;
  workoutsCount: number;
  followersCount: number;
  followingCount: number;
}

export interface AdminWorkoutListItem {
  id: string;
  title: string;
  exercisesCount: number;
  durationMin: number;
  intensity: IntensityLevel;
  calories: number | null;
  isPublic: boolean;
  workoutDate: string;
  createdAt: string;
  likesCount: number;
  commentsCount: number;
  reportsCount: number;
  user: {
    id: string;
    email: string;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
  };
}

export interface AdminOverview {
  users: {
    total: number;
    active: number;
    banned: number;
    pendingVerification: number;
    newToday: number;
    newThisMonth: number;
    activeLast7Days: number;
  };
  workouts: {
    total: number;
    today: number;
    thisMonth: number;
    totalCalories: number;
    totalMinutes: number;
  };
  engagement: {
    totalLikes: number;
    totalComments: number;
    avgWorkoutsPerUser: number;
  };
  premium: {
    totalPremiumUsers: number;
    activeSubscriptions: number;
    pastDueSubscriptions: number;
    cancelingSubscriptions: number;
    newPremiumThisMonth: number;
    canceledLast30Days: number;
    mrrEur: number;
    arrEur: number;
    priceEur: number;
    conversionRate: number;
    churnRate30d: number;
  };
  ai: {
    conversationsTotal: number;
    conversationsThisMonth: number;
    generatedRoutines: number;
    nutritionPlans: number;
    /** Nº de usuarios siguiendo activamente una rutina IA día a día */
    activeRoutines?: number;
    /** % de usuarios premium que tienen una rutina activa */
    activeRoutineAdoptionRate?: number;
    /** Día medio en el que están los usuarios dentro de su rutina activa */
    avgRoutineDayProgress?: number;
    /** Total de PDFs descargados (rutinas + dietas) */
    pdfDownloadsTotal?: number;
    pdfDownloadsRoutines?: number;
    pdfDownloadsNutrition?: number;
  };
  system: {
    stripeConfigured: boolean;
    webhookConfigured: boolean;
    aiConfigured: boolean;
    aiModel: string;
  };
}

export type SubscriptionStatus =
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'CANCELED'
  | 'INCOMPLETE'
  | 'INCOMPLETE_EXPIRED'
  | 'TRIALING'
  | 'UNPAID';

export interface AdminSubscription {
  id: string;
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  stripePriceId: string;
  status: SubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
  createdAt: string;
  updatedAt: string;
  priceEur: number;
  user: {
    id: string;
    email: string;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
    memberSince: string;
  };
}

// ─── API ──────────────────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: {
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  };
}

export interface CursorResponse<T> {
  items: T[];
  nextCursor: string | null;
}
