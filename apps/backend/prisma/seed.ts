/**
 * Prisma seed — datos de desarrollo y demo
 *
 * Crea:
 *  - Admin: admin@fitcommunity.com / Admin123!
 *  - Marcos: marcos@fitcommunity.com / Marcos123!
 *  - 8 usuarios demo (2 Premium): *@fitcommunity.demo / Demo123!
 *  - Catálogo de ~70 ejercicios de gimnasio
 *  - ~60 entrenamientos demo con series y peso reales
 *  - Follows, likes, comments, badges
 */
import {
  PrismaClient,
  UserRole,
  UserStatus,
  IntensityLevel,
  FitnessGoal,
  ExperienceLevel,
  MuscleGroup,
  Equipment,
  ExerciseCategory,
  SubscriptionStatus,
} from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const rand = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;
const randFloat = (min: number, max: number, decimals = 1) =>
  Number((Math.random() * (max - min) + min).toFixed(decimals));

function dateDaysAgo(daysAgo: number, hour = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, randInt(0, 59), 0, 0);
  return d;
}

function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, arr.length));
}

// ─── CATÁLOGO DE EJERCICIOS ─────────────────────────────────────────────────

const EXERCISE_CATALOG: Array<{
  slug: string;
  name: string;
  name_en: string;
  primary: MuscleGroup;
  secondary: MuscleGroup[];
  equipment: Equipment;
  category: ExerciseCategory;
  description?: string;
}> = [
  // PECHO
  { slug: 'press_banca_barra', name: 'Press banca con barra', name_en: 'Barbell bench press', primary: 'CHEST', secondary: ['TRICEPS', 'SHOULDERS'], equipment: 'BARBELL', category: 'COMPOUND' },
  { slug: 'press_banca_inclinado_barra', name: 'Press inclinado con barra', name_en: 'Incline barbell press', primary: 'CHEST', secondary: ['SHOULDERS', 'TRICEPS'], equipment: 'BARBELL', category: 'COMPOUND' },
  { slug: 'press_banca_declinado_barra', name: 'Press declinado con barra', name_en: 'Decline barbell press', primary: 'CHEST', secondary: ['TRICEPS'], equipment: 'BARBELL', category: 'COMPOUND' },
  { slug: 'press_banca_mancuernas', name: 'Press banca con mancuernas', name_en: 'Dumbbell bench press', primary: 'CHEST', secondary: ['TRICEPS', 'SHOULDERS'], equipment: 'DUMBBELL', category: 'COMPOUND' },
  { slug: 'press_inclinado_mancuernas', name: 'Press inclinado con mancuernas', name_en: 'Incline dumbbell press', primary: 'CHEST', secondary: ['SHOULDERS', 'TRICEPS'], equipment: 'DUMBBELL', category: 'COMPOUND' },
  { slug: 'aperturas_mancuernas', name: 'Aperturas con mancuernas', name_en: 'Dumbbell flyes', primary: 'CHEST', secondary: [], equipment: 'DUMBBELL', category: 'ISOLATION' },
  { slug: 'aperturas_polea', name: 'Cruces en polea', name_en: 'Cable crossover', primary: 'CHEST', secondary: [], equipment: 'CABLE', category: 'ISOLATION' },
  { slug: 'fondos_paralelas', name: 'Fondos en paralelas', name_en: 'Dips', primary: 'CHEST', secondary: ['TRICEPS', 'SHOULDERS'], equipment: 'BODYWEIGHT', category: 'COMPOUND' },
  { slug: 'press_pecho_maquina', name: 'Press de pecho en máquina', name_en: 'Machine chest press', primary: 'CHEST', secondary: ['TRICEPS'], equipment: 'MACHINE', category: 'COMPOUND' },

  // ESPALDA
  { slug: 'peso_muerto', name: 'Peso muerto convencional', name_en: 'Conventional deadlift', primary: 'BACK', secondary: ['HAMSTRINGS', 'GLUTES', 'TRAPS', 'FOREARMS'], equipment: 'BARBELL', category: 'COMPOUND' },
  { slug: 'peso_muerto_sumo', name: 'Peso muerto sumo', name_en: 'Sumo deadlift', primary: 'BACK', secondary: ['QUADS', 'GLUTES', 'HAMSTRINGS'], equipment: 'BARBELL', category: 'COMPOUND' },
  { slug: 'peso_muerto_rumano', name: 'Peso muerto rumano', name_en: 'Romanian deadlift', primary: 'HAMSTRINGS', secondary: ['GLUTES', 'BACK'], equipment: 'BARBELL', category: 'COMPOUND' },
  { slug: 'dominadas', name: 'Dominadas', name_en: 'Pull-ups', primary: 'LATS', secondary: ['BICEPS', 'BACK'], equipment: 'BODYWEIGHT', category: 'COMPOUND' },
  { slug: 'dominadas_supinas', name: 'Dominadas supinas', name_en: 'Chin-ups', primary: 'LATS', secondary: ['BICEPS'], equipment: 'BODYWEIGHT', category: 'COMPOUND' },
  { slug: 'jalon_polea', name: 'Jalón al pecho en polea', name_en: 'Lat pulldown', primary: 'LATS', secondary: ['BICEPS'], equipment: 'CABLE', category: 'COMPOUND' },
  { slug: 'remo_barra', name: 'Remo con barra', name_en: 'Barbell row', primary: 'BACK', secondary: ['LATS', 'BICEPS'], equipment: 'BARBELL', category: 'COMPOUND' },
  { slug: 'remo_mancuerna', name: 'Remo con mancuerna a una mano', name_en: 'Single-arm dumbbell row', primary: 'LATS', secondary: ['BACK', 'BICEPS'], equipment: 'DUMBBELL', category: 'COMPOUND' },
  { slug: 'remo_polea_baja', name: 'Remo en polea baja', name_en: 'Seated cable row', primary: 'BACK', secondary: ['LATS', 'BICEPS'], equipment: 'CABLE', category: 'COMPOUND' },
  { slug: 'pullover_polea', name: 'Pullover en polea', name_en: 'Cable pullover', primary: 'LATS', secondary: ['CHEST'], equipment: 'CABLE', category: 'ISOLATION' },
  { slug: 'hiperextensiones', name: 'Hiperextensiones lumbares', name_en: 'Back extensions', primary: 'BACK', secondary: ['GLUTES', 'HAMSTRINGS'], equipment: 'BODYWEIGHT', category: 'ISOLATION' },

  // HOMBROS
  { slug: 'press_militar_barra', name: 'Press militar con barra', name_en: 'Overhead press', primary: 'SHOULDERS', secondary: ['TRICEPS', 'CORE'], equipment: 'BARBELL', category: 'COMPOUND' },
  { slug: 'press_militar_mancuernas', name: 'Press militar con mancuernas', name_en: 'Dumbbell shoulder press', primary: 'SHOULDERS', secondary: ['TRICEPS'], equipment: 'DUMBBELL', category: 'COMPOUND' },
  { slug: 'arnold_press', name: 'Arnold press', name_en: 'Arnold press', primary: 'SHOULDERS', secondary: ['TRICEPS'], equipment: 'DUMBBELL', category: 'COMPOUND' },
  { slug: 'elevaciones_laterales', name: 'Elevaciones laterales con mancuernas', name_en: 'Lateral raises', primary: 'SHOULDERS', secondary: [], equipment: 'DUMBBELL', category: 'ISOLATION' },
  { slug: 'elevaciones_frontales', name: 'Elevaciones frontales', name_en: 'Front raises', primary: 'SHOULDERS', secondary: [], equipment: 'DUMBBELL', category: 'ISOLATION' },
  { slug: 'pajaros', name: 'Pájaros (deltoide posterior)', name_en: 'Rear delt fly', primary: 'SHOULDERS', secondary: ['TRAPS'], equipment: 'DUMBBELL', category: 'ISOLATION' },
  { slug: 'face_pull', name: 'Face pull en polea', name_en: 'Face pull', primary: 'SHOULDERS', secondary: ['TRAPS', 'BACK'], equipment: 'CABLE', category: 'ISOLATION' },
  { slug: 'encogimientos_barra', name: 'Encogimientos con barra', name_en: 'Barbell shrugs', primary: 'TRAPS', secondary: [], equipment: 'BARBELL', category: 'ISOLATION' },

  // BÍCEPS
  { slug: 'curl_barra', name: 'Curl con barra', name_en: 'Barbell curl', primary: 'BICEPS', secondary: ['FOREARMS'], equipment: 'BARBELL', category: 'ISOLATION' },
  { slug: 'curl_mancuernas', name: 'Curl con mancuernas', name_en: 'Dumbbell curl', primary: 'BICEPS', secondary: ['FOREARMS'], equipment: 'DUMBBELL', category: 'ISOLATION' },
  { slug: 'curl_martillo', name: 'Curl martillo', name_en: 'Hammer curl', primary: 'BICEPS', secondary: ['FOREARMS'], equipment: 'DUMBBELL', category: 'ISOLATION' },
  { slug: 'curl_predicador', name: 'Curl en banco predicador', name_en: 'Preacher curl', primary: 'BICEPS', secondary: [], equipment: 'BARBELL', category: 'ISOLATION' },
  { slug: 'curl_polea', name: 'Curl en polea baja', name_en: 'Cable curl', primary: 'BICEPS', secondary: [], equipment: 'CABLE', category: 'ISOLATION' },
  { slug: 'curl_concentrado', name: 'Curl concentrado', name_en: 'Concentration curl', primary: 'BICEPS', secondary: [], equipment: 'DUMBBELL', category: 'ISOLATION' },

  // TRÍCEPS
  { slug: 'press_frances', name: 'Press francés', name_en: 'Skullcrusher', primary: 'TRICEPS', secondary: [], equipment: 'BARBELL', category: 'ISOLATION' },
  { slug: 'extensiones_polea', name: 'Extensiones de tríceps en polea', name_en: 'Triceps pushdown', primary: 'TRICEPS', secondary: [], equipment: 'CABLE', category: 'ISOLATION' },
  { slug: 'extensiones_polea_cuerda', name: 'Extensiones con cuerda en polea', name_en: 'Rope pushdown', primary: 'TRICEPS', secondary: [], equipment: 'CABLE', category: 'ISOLATION' },
  { slug: 'patada_triceps', name: 'Patada de tríceps con mancuerna', name_en: 'Triceps kickback', primary: 'TRICEPS', secondary: [], equipment: 'DUMBBELL', category: 'ISOLATION' },
  { slug: 'press_cerrado', name: 'Press banca agarre cerrado', name_en: 'Close-grip bench press', primary: 'TRICEPS', secondary: ['CHEST', 'SHOULDERS'], equipment: 'BARBELL', category: 'COMPOUND' },
  { slug: 'fondos_banco', name: 'Fondos en banco', name_en: 'Bench dips', primary: 'TRICEPS', secondary: ['CHEST'], equipment: 'BODYWEIGHT', category: 'COMPOUND' },

  // PIERNA
  { slug: 'sentadilla_barra', name: 'Sentadilla con barra', name_en: 'Barbell back squat', primary: 'QUADS', secondary: ['GLUTES', 'HAMSTRINGS', 'CORE'], equipment: 'BARBELL', category: 'COMPOUND' },
  { slug: 'sentadilla_frontal', name: 'Sentadilla frontal', name_en: 'Front squat', primary: 'QUADS', secondary: ['CORE', 'GLUTES'], equipment: 'BARBELL', category: 'COMPOUND' },
  { slug: 'sentadilla_bulgara', name: 'Sentadilla búlgara', name_en: 'Bulgarian split squat', primary: 'QUADS', secondary: ['GLUTES', 'HAMSTRINGS'], equipment: 'DUMBBELL', category: 'COMPOUND' },
  { slug: 'prensa', name: 'Prensa de piernas', name_en: 'Leg press', primary: 'QUADS', secondary: ['GLUTES', 'HAMSTRINGS'], equipment: 'MACHINE', category: 'COMPOUND' },
  { slug: 'extensiones_cuadriceps', name: 'Extensión de cuádriceps', name_en: 'Leg extension', primary: 'QUADS', secondary: [], equipment: 'MACHINE', category: 'ISOLATION' },
  { slug: 'curl_femoral', name: 'Curl femoral tumbado', name_en: 'Lying leg curl', primary: 'HAMSTRINGS', secondary: [], equipment: 'MACHINE', category: 'ISOLATION' },
  { slug: 'curl_femoral_sentado', name: 'Curl femoral sentado', name_en: 'Seated leg curl', primary: 'HAMSTRINGS', secondary: [], equipment: 'MACHINE', category: 'ISOLATION' },
  { slug: 'hip_thrust', name: 'Hip thrust', name_en: 'Barbell hip thrust', primary: 'GLUTES', secondary: ['HAMSTRINGS'], equipment: 'BARBELL', category: 'COMPOUND' },
  { slug: 'glute_kickback', name: 'Patada de glúteo en polea', name_en: 'Cable glute kickback', primary: 'GLUTES', secondary: [], equipment: 'CABLE', category: 'ISOLATION' },
  { slug: 'zancadas', name: 'Zancadas con mancuernas', name_en: 'Walking lunges', primary: 'QUADS', secondary: ['GLUTES', 'HAMSTRINGS'], equipment: 'DUMBBELL', category: 'COMPOUND' },
  { slug: 'gemelos_de_pie', name: 'Elevación de talones de pie', name_en: 'Standing calf raise', primary: 'CALVES', secondary: [], equipment: 'MACHINE', category: 'ISOLATION' },
  { slug: 'gemelos_sentado', name: 'Elevación de talones sentado', name_en: 'Seated calf raise', primary: 'CALVES', secondary: [], equipment: 'MACHINE', category: 'ISOLATION' },

  // CORE
  { slug: 'plancha', name: 'Plancha frontal', name_en: 'Plank', primary: 'CORE', secondary: [], equipment: 'BODYWEIGHT', category: 'ISOLATION' },
  { slug: 'crunch', name: 'Crunch abdominal', name_en: 'Crunch', primary: 'CORE', secondary: [], equipment: 'BODYWEIGHT', category: 'ISOLATION' },
  { slug: 'rueda_abdominal', name: 'Rueda abdominal', name_en: 'Ab wheel rollout', primary: 'CORE', secondary: ['SHOULDERS', 'BACK'], equipment: 'OTHER', category: 'COMPOUND' },
  { slug: 'elevaciones_piernas', name: 'Elevaciones de piernas colgado', name_en: 'Hanging leg raise', primary: 'CORE', secondary: [], equipment: 'BODYWEIGHT', category: 'ISOLATION' },
  { slug: 'russian_twist', name: 'Russian twist', name_en: 'Russian twist', primary: 'CORE', secondary: [], equipment: 'BODYWEIGHT', category: 'ISOLATION' },
  { slug: 'crunch_polea', name: 'Crunch en polea (rezo)', name_en: 'Cable crunch', primary: 'CORE', secondary: [], equipment: 'CABLE', category: 'ISOLATION' },

  // CARDIO
  { slug: 'cinta', name: 'Cinta de correr', name_en: 'Treadmill', primary: 'CARDIO', secondary: ['QUADS', 'CALVES'], equipment: 'CARDIO_MACHINE', category: 'CARDIO' },
  { slug: 'eliptica', name: 'Elíptica', name_en: 'Elliptical', primary: 'CARDIO', secondary: ['FULL_BODY'], equipment: 'CARDIO_MACHINE', category: 'CARDIO' },
  { slug: 'bici_estatica', name: 'Bici estática', name_en: 'Stationary bike', primary: 'CARDIO', secondary: ['QUADS', 'GLUTES'], equipment: 'CARDIO_MACHINE', category: 'CARDIO' },
  { slug: 'remo_maquina', name: 'Remo en máquina (Concept2)', name_en: 'Rowing machine', primary: 'CARDIO', secondary: ['BACK', 'LATS'], equipment: 'CARDIO_MACHINE', category: 'CARDIO' },
];

// Plantillas de sesiones por tipo
type SessionTemplate = {
  title: string;
  intensity: IntensityLevel;
  durationMin: [number, number];
  exercises: Array<{ slug: string; sets: number; repsRange: [number, number]; weightFactor: [number, number] }>;
  notes?: string;
};

const SESSIONS: SessionTemplate[] = [
  {
    title: 'Pecho y tríceps',
    intensity: 'HIGH',
    durationMin: [55, 75],
    exercises: [
      { slug: 'press_banca_barra', sets: 4, repsRange: [6, 10], weightFactor: [60, 100] },
      { slug: 'press_inclinado_mancuernas', sets: 3, repsRange: [8, 12], weightFactor: [20, 35] },
      { slug: 'aperturas_polea', sets: 3, repsRange: [10, 15], weightFactor: [15, 25] },
      { slug: 'extensiones_polea_cuerda', sets: 4, repsRange: [10, 15], weightFactor: [20, 35] },
      { slug: 'press_frances', sets: 3, repsRange: [8, 12], weightFactor: [25, 40] },
    ],
  },
  {
    title: 'Espalda y bíceps',
    intensity: 'HIGH',
    durationMin: [60, 80],
    exercises: [
      { slug: 'peso_muerto', sets: 4, repsRange: [4, 8], weightFactor: [80, 140] },
      { slug: 'dominadas', sets: 4, repsRange: [6, 12], weightFactor: [0, 0] },
      { slug: 'remo_barra', sets: 4, repsRange: [6, 10], weightFactor: [50, 80] },
      { slug: 'jalon_polea', sets: 3, repsRange: [8, 12], weightFactor: [40, 70] },
      { slug: 'curl_barra', sets: 3, repsRange: [8, 12], weightFactor: [25, 45] },
      { slug: 'curl_martillo', sets: 3, repsRange: [10, 15], weightFactor: [10, 20] },
    ],
  },
  {
    title: 'Día de pierna',
    intensity: 'MAX',
    durationMin: [70, 90],
    exercises: [
      { slug: 'sentadilla_barra', sets: 5, repsRange: [5, 8], weightFactor: [70, 130] },
      { slug: 'prensa', sets: 4, repsRange: [10, 12], weightFactor: [120, 200] },
      { slug: 'curl_femoral', sets: 4, repsRange: [10, 15], weightFactor: [30, 55] },
      { slug: 'extensiones_cuadriceps', sets: 3, repsRange: [12, 15], weightFactor: [30, 55] },
      { slug: 'gemelos_de_pie', sets: 4, repsRange: [12, 20], weightFactor: [40, 80] },
    ],
  },
  {
    title: 'Hombros y core',
    intensity: 'MEDIUM',
    durationMin: [50, 70],
    exercises: [
      { slug: 'press_militar_barra', sets: 4, repsRange: [6, 10], weightFactor: [35, 60] },
      { slug: 'elevaciones_laterales', sets: 4, repsRange: [10, 15], weightFactor: [7, 14] },
      { slug: 'face_pull', sets: 3, repsRange: [12, 20], weightFactor: [15, 30] },
      { slug: 'pajaros', sets: 3, repsRange: [10, 15], weightFactor: [7, 14] },
      { slug: 'plancha', sets: 3, repsRange: [30, 60], weightFactor: [0, 0] },
      { slug: 'crunch_polea', sets: 3, repsRange: [12, 18], weightFactor: [25, 50] },
    ],
  },
  {
    title: 'Empuje (push)',
    intensity: 'HIGH',
    durationMin: [60, 80],
    exercises: [
      { slug: 'press_banca_barra', sets: 4, repsRange: [6, 10], weightFactor: [60, 100] },
      { slug: 'press_militar_mancuernas', sets: 4, repsRange: [8, 12], weightFactor: [15, 30] },
      { slug: 'aperturas_mancuernas', sets: 3, repsRange: [10, 14], weightFactor: [10, 20] },
      { slug: 'elevaciones_laterales', sets: 3, repsRange: [12, 15], weightFactor: [7, 12] },
      { slug: 'extensiones_polea', sets: 4, repsRange: [10, 14], weightFactor: [20, 40] },
    ],
  },
  {
    title: 'Tirón (pull)',
    intensity: 'HIGH',
    durationMin: [60, 80],
    exercises: [
      { slug: 'peso_muerto_rumano', sets: 4, repsRange: [6, 10], weightFactor: [60, 110] },
      { slug: 'dominadas', sets: 4, repsRange: [6, 10], weightFactor: [0, 0] },
      { slug: 'remo_mancuerna', sets: 3, repsRange: [8, 12], weightFactor: [20, 40] },
      { slug: 'face_pull', sets: 3, repsRange: [12, 18], weightFactor: [15, 28] },
      { slug: 'curl_mancuernas', sets: 3, repsRange: [10, 14], weightFactor: [10, 18] },
    ],
  },
  {
    title: 'Full body rápido',
    intensity: 'MEDIUM',
    durationMin: [40, 55],
    exercises: [
      { slug: 'sentadilla_barra', sets: 3, repsRange: [8, 12], weightFactor: [50, 90] },
      { slug: 'press_banca_mancuernas', sets: 3, repsRange: [8, 12], weightFactor: [20, 35] },
      { slug: 'remo_polea_baja', sets: 3, repsRange: [10, 12], weightFactor: [40, 65] },
      { slug: 'plancha', sets: 3, repsRange: [30, 60], weightFactor: [0, 0] },
    ],
  },
  {
    title: 'Glúteo y femoral',
    intensity: 'HIGH',
    durationMin: [55, 75],
    exercises: [
      { slug: 'hip_thrust', sets: 4, repsRange: [8, 12], weightFactor: [50, 100] },
      { slug: 'peso_muerto_rumano', sets: 4, repsRange: [8, 12], weightFactor: [50, 90] },
      { slug: 'sentadilla_bulgara', sets: 3, repsRange: [10, 12], weightFactor: [12, 25] },
      { slug: 'curl_femoral_sentado', sets: 3, repsRange: [12, 15], weightFactor: [25, 50] },
      { slug: 'glute_kickback', sets: 3, repsRange: [12, 15], weightFactor: [10, 20] },
    ],
  },
];

// ─── DEMO USERS ──────────────────────────────────────────────────────────────

const DEMO_USERS = [
  { email: 'alex.strength@fitcommunity.demo', username: 'alex_lifts', displayName: 'Alex Hernández',
    bio: '🏋️‍♂️ Powerlifter amateur. Sentadilla 180 / Banca 130 / Peso muerto 220.',
    height: 178, weight: 85, goal: 'POWERLIFTING' as FitnessGoal, level: 'ADVANCED' as ExperienceLevel,
    location: 'Madrid', avatar: 'https://i.pravatar.cc/200?img=12', frequency: 'high', premium: true },
  { email: 'sara.gains@fitcommunity.demo', username: 'sara_gains', displayName: 'Sara Pérez',
    bio: '💪 Hipertrofia, glúteo y constancia. 4 días/semana, sin saltarme uno.',
    height: 168, weight: 62, goal: 'HYPERTROPHY' as FitnessGoal, level: 'INTERMEDIATE' as ExperienceLevel,
    location: 'Barcelona', avatar: 'https://i.pravatar.cc/200?img=5', frequency: 'high', premium: true },
  { email: 'david.bro@fitcommunity.demo', username: 'david_bro', displayName: 'David Ruiz',
    bio: 'Push/Pull/Legs. Mejorando cada semana 🔥',
    height: 182, weight: 80, goal: 'GAIN_MUSCLE' as FitnessGoal, level: 'INTERMEDIATE' as ExperienceLevel,
    location: 'Sevilla', avatar: 'https://i.pravatar.cc/200?img=33', frequency: 'medium', premium: false },
  { email: 'lucia.fit@fitcommunity.demo', username: 'lucia_fit', displayName: 'Lucía Gómez',
    bio: 'Recomp en marcha. Macros + entrenos por bloques.',
    height: 165, weight: 58, goal: 'RECOMP' as FitnessGoal, level: 'INTERMEDIATE' as ExperienceLevel,
    location: 'Valencia', avatar: 'https://i.pravatar.cc/200?img=20', frequency: 'medium', premium: false },
  { email: 'pablo.beast@fitcommunity.demo', username: 'pablo_beast', displayName: 'Pablo Sánchez',
    bio: 'Bench press 140 a por los 150. Vamos.',
    height: 185, weight: 90, goal: 'IMPROVE_STRENGTH' as FitnessGoal, level: 'ADVANCED' as ExperienceLevel,
    location: 'Bilbao', avatar: 'https://i.pravatar.cc/200?img=68', frequency: 'high', premium: false },
  { email: 'elena.coach@fitcommunity.demo', username: 'elena_coach', displayName: 'Elena Martín',
    bio: 'Coach personal | NSCA-CPT | Aquí mis logs personales.',
    height: 170, weight: 64, goal: 'IMPROVE_STRENGTH' as FitnessGoal, level: 'PROFESSIONAL' as ExperienceLevel,
    location: 'Granada', avatar: 'https://i.pravatar.cc/200?img=44', frequency: 'high', premium: false },
  { email: 'miguel.rookie@fitcommunity.demo', username: 'miguel_rookie', displayName: 'Miguel Torres',
    bio: 'Empezando en serio este 2026. Objetivo: -8 kg.',
    height: 175, weight: 92, goal: 'LOSE_WEIGHT' as FitnessGoal, level: 'BEGINNER' as ExperienceLevel,
    location: 'Murcia', avatar: 'https://i.pravatar.cc/200?img=15', frequency: 'low', premium: false },
  { email: 'javier.health@fitcommunity.demo', username: 'javier_health', displayName: 'Javier López',
    bio: 'Entrenando para la salud. 3 días por semana sin falta.',
    height: 180, weight: 78, goal: 'STAY_HEALTHY' as FitnessGoal, level: 'INTERMEDIATE' as ExperienceLevel,
    location: 'Zaragoza', avatar: 'https://i.pravatar.cc/200?img=57', frequency: 'medium', premium: false },
];

const COMMENT_POOL = [
  'Brutal sesión, qué nivel.',
  'Eso es. Cómo me motiva ver tus logs.',
  '¿Cuántos días entrenas a la semana?',
  'Pedazo de sentadilla 💪',
  '¡Sigue así!',
  'Yo voy detrás 😅',
  'Constancia pura. Respeto.',
  '🔥🔥🔥',
];

// ─── MAIN ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Seed FitCommunity (gym focus)...\n');

  // Limpiar (orden importante por FK)
  console.log('🧹 Limpiando datos previos...');
  await prisma.workoutSet.deleteMany();
  await prisma.workoutExercise.deleteMany();
  await prisma.socialComment.deleteMany();
  await prisma.socialLike.deleteMany();
  await prisma.socialFollow.deleteMany();
  await prisma.workout.deleteMany();
  await prisma.exercise.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.emailVerification.deleteMany();
  await prisma.passwordReset.deleteMany();
  await prisma.aiMessage.deleteMany();
  await prisma.aiConversation.deleteMany();
  await prisma.generatedRoutine.deleteMany();
  await prisma.nutritionPlan.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.adminLog.deleteMany();
  await prisma.userBadge.deleteMany();
  await prisma.userProfile.deleteMany();
  await prisma.user.deleteMany();
  console.log('   ✓ Tablas vaciadas\n');

  // ─── Catálogo de ejercicios ────────────────────────────────────────────
  console.log('📚 Creando catálogo de ejercicios...');
  for (const ex of EXERCISE_CATALOG) {
    await prisma.exercise.create({
      data: {
        slug: ex.slug,
        name: ex.name,
        name_en: ex.name_en,
        primary_muscle: ex.primary,
        secondary_muscles: ex.secondary,
        equipment: ex.equipment,
        category: ex.category,
        is_custom: false,
      },
    });
  }
  const allExercises = await prisma.exercise.findMany({ select: { id: true, slug: true } });
  const exerciseBySlug = new Map(allExercises.map((e) => [e.slug, e.id]));
  console.log(`   ✓ ${allExercises.length} ejercicios en catálogo\n`);

  // ─── Admin ────────────────────────────────────────────────────────────────
  const adminHash = await bcrypt.hash('Admin123!', 12);
  const admin = await prisma.user.create({
    data: {
      email: 'admin@fitcommunity.com',
      password_hash: adminHash,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      is_email_verified: true,
      profile: {
        create: {
          username: 'admin',
          display_name: 'Admin FitCommunity',
          bio: 'Administrador de la plataforma.',
          onboarding_completed: true,
          is_profile_public: false,
        },
      },
    },
  });
  console.log(`✅ Admin: ${admin.email} / Admin123!`);

  // ─── Marcos ───────────────────────────────────────────────────────────────
  const marcosHash = await bcrypt.hash('Marcos123!', 12);
  const marcos = await prisma.user.create({
    data: {
      email: 'marcos@fitcommunity.com',
      password_hash: marcosHash,
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
      is_email_verified: true,
      is_premium: true,
      profile: {
        create: {
          username: 'marcos',
          display_name: 'Marcos González',
          bio: 'TFG en marcha. Construyendo FitCommunity.',
          height_cm: 180,
          weight_kg: 75,
          location: 'Madrid',
          fitness_goal: 'GAIN_MUSCLE',
          experience_level: 'INTERMEDIATE',
          onboarding_completed: true,
          avatar_url: 'https://i.pravatar.cc/200?img=60',
        },
      },
    },
  });
  console.log(`✅ Marcos (Premium): ${marcos.email} / Marcos123!`);

  // ─── Demo users ───────────────────────────────────────────────────────────
  const demoUsers = [];
  for (const u of DEMO_USERS) {
    const hash = await bcrypt.hash('Demo123!', 12);
    const user = await prisma.user.create({
      data: {
        email: u.email,
        password_hash: hash,
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
        is_email_verified: true,
        is_premium: u.premium,
        last_login_at: dateDaysAgo(randInt(0, 5), randInt(8, 22)),
        profile: {
          create: {
            username: u.username,
            display_name: u.displayName,
            bio: u.bio,
            avatar_url: u.avatar,
            height_cm: u.height,
            weight_kg: u.weight,
            location: u.location,
            fitness_goal: u.goal,
            experience_level: u.level,
            onboarding_completed: true,
            is_profile_public: true,
          },
        },
      },
    });
    if (u.premium) {
      await prisma.subscription.create({
        data: {
          user_id: user.id,
          stripe_subscription_id: `sub_demo_${user.id.slice(0, 8)}`,
          stripe_customer_id: `cus_demo_${user.id.slice(0, 8)}`,
          stripe_price_id: 'price_demo',
          status: SubscriptionStatus.ACTIVE,
          current_period_start: dateDaysAgo(15),
          current_period_end: dateDaysAgo(-15),
        },
      });
    }
    demoUsers.push({ ...user, frequency: u.frequency, weightKg: u.weight });
  }
  console.log(`✅ ${demoUsers.length} usuarios demo`);

  const allUsers = [
    { ...marcos, frequency: 'high' as const, weightKg: 75 },
    ...demoUsers,
  ];

  // ─── Workouts (con ejercicios y sets) ─────────────────────────────────────
  console.log('\n🏋️ Creando workouts...');
  let totalWorkouts = 0;
  let totalSets = 0;

  for (const user of allUsers) {
    const numWorkouts =
      user.frequency === 'high'
        ? randInt(18, 26)
        : user.frequency === 'medium'
          ? randInt(10, 16)
          : randInt(4, 8);

    for (let i = 0; i < numWorkouts; i++) {
      const tpl = rand(SESSIONS);
      const duration = randInt(tpl.durationMin[0], tpl.durationMin[1]);
      const daysAgo = randInt(0, 60);
      const workoutDate = dateDaysAgo(daysAgo, randInt(7, 21));
      // Calorie estimation
      const metByIntensity: Record<IntensityLevel, number> = { LOW: 3.5, MEDIUM: 5, HIGH: 7, MAX: 9 };
      const calories = Math.round(metByIntensity[tpl.intensity] * (user.weightKg ?? 75) * (duration / 60));

      const workout = await prisma.workout.create({
        data: {
          user_id: user.id,
          title: tpl.title,
          notes: tpl.notes ?? null,
          duration_min: duration,
          intensity: tpl.intensity,
          calories,
          is_public: Math.random() > 0.05,
          workout_date: workoutDate,
          created_at: workoutDate,
        },
      });
      totalWorkouts++;

      // Add exercises with sets
      for (let exIdx = 0; exIdx < tpl.exercises.length; exIdx++) {
        const exTpl = tpl.exercises[exIdx];
        const exId = exerciseBySlug.get(exTpl.slug);
        if (!exId) continue;

        const we = await prisma.workoutExercise.create({
          data: {
            workout_id: workout.id,
            exercise_id: exId,
            order_idx: exIdx,
          },
        });

        for (let setNum = 1; setNum <= exTpl.sets; setNum++) {
          const reps = randInt(exTpl.repsRange[0], exTpl.repsRange[1]);
          const weight =
            exTpl.weightFactor[1] === 0
              ? null
              : randFloat(exTpl.weightFactor[0], exTpl.weightFactor[1], 1);
          await prisma.workoutSet.create({
            data: {
              workout_exercise_id: we.id,
              set_number: setNum,
              reps,
              weight_kg: weight,
              rpe: setNum === exTpl.sets ? randFloat(7, 9.5, 1) : null,
              is_warmup: setNum === 1 && exIdx === 0,
              rest_sec: randInt(60, 180),
            },
          });
          totalSets++;
        }
      }
    }
  }
  console.log(`   ✓ ${totalWorkouts} entrenamientos, ${totalSets} series`);

  // ─── Follows ──────────────────────────────────────────────────────────────
  let followCount = 0;
  for (const f of allUsers) {
    const others = allUsers.filter((u) => u.id !== f.id);
    const targets = pickN(others, randInt(3, 6));
    for (const t of targets) {
      await prisma.socialFollow.upsert({
        where: { follower_id_following_id: { follower_id: f.id, following_id: t.id } },
        create: { follower_id: f.id, following_id: t.id },
        update: {},
      });
      followCount++;
    }
  }
  console.log(`✅ ${followCount} follows`);

  // ─── Likes y comentarios ──────────────────────────────────────────────────
  const allWorkouts = await prisma.workout.findMany({ select: { id: true, user_id: true } });
  let likes = 0;
  let comments = 0;
  for (const w of allWorkouts) {
    const candidates = allUsers.filter((u) => u.id !== w.user_id);
    for (const liker of pickN(candidates, randInt(0, 5))) {
      await prisma.socialLike.upsert({
        where: { user_id_workout_id: { user_id: liker.id, workout_id: w.id } },
        create: { user_id: liker.id, workout_id: w.id },
        update: {},
      });
      likes++;
    }
    if (Math.random() > 0.5) {
      const commenters = pickN(candidates, randInt(0, 2));
      for (const c of commenters) {
        await prisma.socialComment.create({
          data: { user_id: c.id, workout_id: w.id, content: rand(COMMENT_POOL) },
        });
        comments++;
      }
    }
  }
  console.log(`✅ ${likes} likes, ${comments} comentarios`);

  // ─── Badges ───────────────────────────────────────────────────────────────
  const badges = [
    { slug: 'first_workout', name: 'Primer entreno', description: 'Registraste tu primer entrenamiento', condition: '{"type":"workout_count","value":1}' },
    { slug: 'ten_workouts', name: '10 entrenamientos', description: 'Completaste 10 entrenamientos', condition: '{"type":"workout_count","value":10}' },
    { slug: 'fifty_workouts', name: '50 entrenamientos', description: 'Completaste 50 entrenamientos', condition: '{"type":"workout_count","value":50}' },
    { slug: 'streak_7', name: 'Racha 7 días', description: '7 días seguidos entrenando', condition: '{"type":"streak","value":7}' },
    { slug: 'streak_30', name: 'Racha 30 días', description: '30 días seguidos entrenando', condition: '{"type":"streak","value":30}' },
    { slug: 'pr_squat_100', name: 'Sentadilla 100kg', description: 'Levantaste 100kg en sentadilla', condition: '{"type":"pr","exercise":"sentadilla_barra","weight":100}' },
    { slug: 'pr_bench_100', name: 'Banca 100kg', description: 'Levantaste 100kg en press banca', condition: '{"type":"pr","exercise":"press_banca_barra","weight":100}' },
    { slug: 'pr_deadlift_140', name: 'Peso muerto 140kg', description: 'Levantaste 140kg en peso muerto', condition: '{"type":"pr","exercise":"peso_muerto","weight":140}' },
  ];
  for (const b of badges) {
    await prisma.badge.upsert({ where: { slug: b.slug }, update: b, create: b });
  }
  console.log(`✅ ${badges.length} badges`);

  console.log('\n🎉 Seed completado!\n');
  console.log('─────────────────────────────────────────────────');
  console.log('  CREDENCIALES');
  console.log('─────────────────────────────────────────────────');
  console.log('  Admin:    admin@fitcommunity.com   /  Admin123!');
  console.log('  Marcos:   marcos@fitcommunity.com  /  Marcos123!  (Premium)');
  console.log('  Demo:     <usuario>@fitcommunity.demo  /  Demo123!');
  console.log('  Premium demo: alex_lifts, sara_gains');
  console.log('─────────────────────────────────────────────────\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
