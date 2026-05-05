import { Link } from 'react-router-dom';
import { Heart, MessageCircle, Clock, Flame, Dumbbell } from 'lucide-react';
import { Workout, FeedWorkout, MuscleGroup } from '../../types';
import Avatar from './Avatar';
import MuscleBadge from './MuscleBadge';
import IntensityBadge from './IntensityBadge';
import PremiumBadge from './PremiumBadge';
import { formatDuration, formatCalories, timeAgo } from '../../lib/format';

interface WorkoutCardProps {
  workout: Workout | FeedWorkout;
  onLikeToggle?: (workout: Workout | FeedWorkout) => void;
  showAuthor?: boolean;
  variant?: 'feed' | 'list' | 'compact';
}

function isFeedWorkout(w: Workout | FeedWorkout): w is FeedWorkout {
  return (w as FeedWorkout).exercisesPreview !== undefined;
}

function uniqueMuscles(w: Workout | FeedWorkout): MuscleGroup[] {
  if (isFeedWorkout(w)) {
    return Array.from(new Set(w.exercisesPreview.map((e) => e.primaryMuscle)));
  }
  return Array.from(new Set(w.exercises.map((e) => e.exercise.primaryMuscle)));
}

function exerciseCount(w: Workout | FeedWorkout): number {
  return isFeedWorkout(w) ? w.exercisesCount : w.exercises.length;
}

export default function WorkoutCard({
  workout,
  onLikeToggle,
  showAuthor = true,
  variant = 'feed',
}: WorkoutCardProps) {
  const author = workout.user;
  const muscles = uniqueMuscles(workout);
  const exCount = exerciseCount(workout);

  if (variant === 'compact') {
    return (
      <Link
        to={`/workouts/${workout.id}`}
        className="group block bg-white hover:bg-surface-100 border border-surface-200 rounded-xl p-4 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-lg bg-brand-100 flex items-center justify-center shrink-0">
            <Dumbbell className="w-5 h-5 text-brand-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-surface-900 truncate group-hover:text-brand-700 transition-colors">
              {workout.title}
            </p>
            <div className="flex items-center gap-3 text-xs text-surface-600 mt-0.5">
              <span>{exCount} ejercicios</span>
              <span>· {formatDuration(workout.durationMin)}</span>
              <span>· {timeAgo(workout.workoutDate)}</span>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <article className="bg-white border border-surface-200 rounded-2xl overflow-hidden hover:border-surface-300 hover:shadow-soft transition-all">
      {/* Header */}
      {showAuthor && author && (
        <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-3">
          <Link
            to={author.username ? `/u/${author.username}` : `/u/${author.id}`}
            className="flex items-center gap-3 group"
          >
            <Avatar src={author.avatarUrl} name={author.displayName ?? 'Usuario'} size="md" />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="font-semibold text-surface-900 text-sm group-hover:text-brand-700 transition-colors truncate">
                  {author.displayName ?? 'Usuario'}
                </p>
                {author.isPremium && <PremiumBadge size="sm" />}
              </div>
              <p className="text-xs text-surface-500">
                @{author.username ?? '—'} · {timeAgo(workout.workoutDate)}
              </p>
            </div>
          </Link>
          <IntensityBadge intensity={workout.intensity} size="sm" />
        </div>
      )}

      {/* Body */}
      <Link to={`/workouts/${workout.id}`} className="block px-5 pb-3 group">
        <h3 className="font-bold text-base text-surface-900 group-hover:text-brand-700 transition-colors">
          {workout.title}
        </h3>
        {workout.notes && (
          <p className="text-sm text-surface-600 mt-1 line-clamp-2">{workout.notes}</p>
        )}

        {/* Muscle groups */}
        {muscles.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {muscles.slice(0, 5).map((m) => (
              <MuscleBadge key={m} muscle={m} size="sm" />
            ))}
            {muscles.length > 5 && (
              <span className="text-xs text-surface-500 px-1.5 py-0.5">
                +{muscles.length - 5}
              </span>
            )}
          </div>
        )}
      </Link>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 px-5 pb-3">
        <Stat icon={Dumbbell} label="Ejercicios" value={String(exCount)} />
        <Stat icon={Clock} label="Duración" value={formatDuration(workout.durationMin)} />
        <Stat icon={Flame} label="Kcal" value={formatCalories(workout.calories)} />
      </div>

      {/* Photo */}
      {workout.photoUrl && (
        <div className="px-5 pb-3">
          <img
            src={workout.photoUrl}
            alt=""
            className="w-full max-h-72 object-cover rounded-xl border border-surface-200"
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1 px-3 py-2 border-t border-surface-200">
        <button
          onClick={(e) => {
            e.preventDefault();
            onLikeToggle?.(workout);
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors text-sm font-medium
                      ${workout.viewerLiked
                        ? 'text-red-600 hover:bg-red-50'
                        : 'text-surface-600 hover:text-red-600 hover:bg-red-50'}`}
        >
          <Heart className={`w-4 h-4 ${workout.viewerLiked ? 'fill-current' : ''}`} />
          {workout.likesCount}
        </button>
        <Link
          to={`/workouts/${workout.id}`}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-surface-600 hover:text-brand-600 hover:bg-brand-50 transition-colors text-sm font-medium"
        >
          <MessageCircle className="w-4 h-4" />
          {workout.commentsCount}
        </Link>
      </div>
    </article>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-surface-100/60 rounded-lg px-3 py-2 flex items-center gap-2 border border-surface-100">
      <Icon className="w-4 h-4 text-surface-500 shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] text-surface-500 uppercase tracking-wider">{label}</p>
        <p className="text-xs text-surface-900 font-semibold truncate">{value}</p>
      </div>
    </div>
  );
}
