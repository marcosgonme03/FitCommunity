import {
  Dumbbell,
  Heart,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import type {
  MuscleGroup,
  Equipment,
  ExerciseCategory,
  IntensityLevel,
  FitnessGoal,
  ExperienceLevel,
} from '../types';

export const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  CHEST: 'Pecho',
  BACK: 'Espalda',
  SHOULDERS: 'Hombros',
  BICEPS: 'Bíceps',
  TRICEPS: 'Tríceps',
  FOREARMS: 'Antebrazos',
  QUADS: 'Cuádriceps',
  HAMSTRINGS: 'Isquiotibiales',
  GLUTES: 'Glúteos',
  CALVES: 'Gemelos',
  CORE: 'Core',
  TRAPS: 'Trapecios',
  LATS: 'Dorsales',
  FULL_BODY: 'Cuerpo completo',
  CARDIO: 'Cardio',
};

// Visual mapping for muscle groups (light theme friendly)
export const MUSCLE_COLORS: Record<MuscleGroup, { bg: string; text: string; ring: string; hex: string }> = {
  CHEST:      { bg: 'bg-red-100',     text: 'text-red-700',     ring: 'ring-red-300',     hex: '#dc2626' },
  BACK:       { bg: 'bg-blue-100',    text: 'text-blue-700',    ring: 'ring-blue-300',    hex: '#2563eb' },
  SHOULDERS:  { bg: 'bg-amber-100',   text: 'text-amber-700',   ring: 'ring-amber-300',   hex: '#d97706' },
  BICEPS:     { bg: 'bg-purple-100',  text: 'text-purple-700',  ring: 'ring-purple-300',  hex: '#7c3aed' },
  TRICEPS:    { bg: 'bg-fuchsia-100', text: 'text-fuchsia-700', ring: 'ring-fuchsia-300', hex: '#c026d3' },
  FOREARMS:   { bg: 'bg-violet-100',  text: 'text-violet-700',  ring: 'ring-violet-300',  hex: '#7c3aed' },
  QUADS:      { bg: 'bg-brand-100',   text: 'text-brand-700',   ring: 'ring-brand-300',   hex: '#f97316' },
  HAMSTRINGS: { bg: 'bg-orange-100',  text: 'text-orange-700',  ring: 'ring-orange-300',  hex: '#ea580c' },
  GLUTES:     { bg: 'bg-pink-100',    text: 'text-pink-700',    ring: 'ring-pink-300',    hex: '#db2777' },
  CALVES:     { bg: 'bg-yellow-100',  text: 'text-yellow-700',  ring: 'ring-yellow-300',  hex: '#ca8a04' },
  CORE:       { bg: 'bg-emerald-100', text: 'text-emerald-700', ring: 'ring-emerald-300', hex: '#059669' },
  TRAPS:      { bg: 'bg-sky-100',     text: 'text-sky-700',     ring: 'ring-sky-300',     hex: '#0284c7' },
  LATS:       { bg: 'bg-cyan-100',    text: 'text-cyan-700',    ring: 'ring-cyan-300',    hex: '#0891b2' },
  FULL_BODY:  { bg: 'bg-stone-200',   text: 'text-stone-700',   ring: 'ring-stone-300',   hex: '#57534e' },
  CARDIO:     { bg: 'bg-red-100',     text: 'text-red-700',     ring: 'ring-red-300',     hex: '#ef4444' },
};

export const MUSCLE_ICONS: Record<MuscleGroup, LucideIcon> = {
  CHEST: Dumbbell,
  BACK: Dumbbell,
  SHOULDERS: Dumbbell,
  BICEPS: Dumbbell,
  TRICEPS: Dumbbell,
  FOREARMS: Dumbbell,
  QUADS: Dumbbell,
  HAMSTRINGS: Dumbbell,
  GLUTES: Dumbbell,
  CALVES: Dumbbell,
  CORE: Zap,
  TRAPS: Dumbbell,
  LATS: Dumbbell,
  FULL_BODY: Dumbbell,
  CARDIO: Heart,
};

export const ALL_MUSCLES: MuscleGroup[] = [
  'CHEST', 'BACK', 'SHOULDERS', 'BICEPS', 'TRICEPS', 'FOREARMS',
  'QUADS', 'HAMSTRINGS', 'GLUTES', 'CALVES', 'CORE',
  'TRAPS', 'LATS', 'FULL_BODY', 'CARDIO',
];

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  BARBELL: 'Barra',
  DUMBBELL: 'Mancuernas',
  MACHINE: 'Máquina',
  CABLE: 'Polea',
  BODYWEIGHT: 'Peso corporal',
  KETTLEBELL: 'Kettlebell',
  BAND: 'Banda',
  SMITH_MACHINE: 'Multipower',
  CARDIO_MACHINE: 'Cardio',
  OTHER: 'Otro',
};

export const ALL_EQUIPMENT: Equipment[] = [
  'BARBELL', 'DUMBBELL', 'MACHINE', 'CABLE', 'BODYWEIGHT',
  'KETTLEBELL', 'BAND', 'SMITH_MACHINE', 'CARDIO_MACHINE', 'OTHER',
];

export const CATEGORY_LABELS: Record<ExerciseCategory, string> = {
  COMPOUND: 'Multiarticular',
  ISOLATION: 'Aislamiento',
  CARDIO: 'Cardio',
  MOBILITY: 'Movilidad',
};

export const ALL_CATEGORIES: ExerciseCategory[] = ['COMPOUND', 'ISOLATION', 'CARDIO', 'MOBILITY'];

export const INTENSITY_LABELS: Record<IntensityLevel, string> = {
  LOW: 'Suave',
  MEDIUM: 'Media',
  HIGH: 'Alta',
  MAX: 'Máxima',
};

export const INTENSITY_COLORS: Record<IntensityLevel, { bg: string; text: string; bar: string }> = {
  LOW:    { bg: 'bg-emerald-100', text: 'text-emerald-700', bar: 'bg-emerald-500' },
  MEDIUM: { bg: 'bg-yellow-100',  text: 'text-yellow-700',  bar: 'bg-yellow-500' },
  HIGH:   { bg: 'bg-brand-100',   text: 'text-brand-700',   bar: 'bg-brand-500' },
  MAX:    { bg: 'bg-red-100',     text: 'text-red-700',     bar: 'bg-red-500' },
};

export const ALL_INTENSITIES: IntensityLevel[] = ['LOW', 'MEDIUM', 'HIGH', 'MAX'];

export const FITNESS_GOAL_LABELS: Record<FitnessGoal, string> = {
  LOSE_WEIGHT: 'Perder peso',
  GAIN_MUSCLE: 'Ganar músculo',
  IMPROVE_STRENGTH: 'Aumentar fuerza',
  STAY_HEALTHY: 'Mantenerme sano',
  RECOMP: 'Recomposición',
  POWERLIFTING: 'Powerlifting',
  HYPERTROPHY: 'Hipertrofia',
};

export const EXPERIENCE_LABELS: Record<ExperienceLevel, string> = {
  BEGINNER: 'Principiante',
  INTERMEDIATE: 'Intermedio',
  ADVANCED: 'Avanzado',
  PROFESSIONAL: 'Profesional / Coach',
};
