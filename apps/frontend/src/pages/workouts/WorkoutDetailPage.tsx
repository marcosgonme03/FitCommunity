import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Heart, MessageCircle, Clock, Flame, Dumbbell, Pencil, Trash2, Send,
  Globe, Lock, Trophy,
} from 'lucide-react';
import workoutsService from '../../services/workouts.service';
import { Workout, Comment } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import Avatar from '../../components/ui/Avatar';
import IntensityBadge from '../../components/ui/IntensityBadge';
import MuscleBadge from '../../components/ui/MuscleBadge';
import PremiumBadge from '../../components/ui/PremiumBadge';
import Button from '../../components/ui/Button';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Spinner from '../../components/ui/Spinner';
import {
  formatDuration, formatCalories, formatDateLong, formatTime, timeAgo,
} from '../../lib/format';
import { EQUIPMENT_LABELS } from '../../lib/muscles';
import { toast } from '../../components/ui/Toast';

export default function WorkoutDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [posting, setPosting] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([workoutsService.getById(id), workoutsService.listComments(id)])
      .then(([w, c]) => {
        setWorkout(w);
        setComments(c.items);
      })
      .catch(() => toast.error('Error', 'No se pudo cargar el entrenamiento'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading || !workout) return <Spinner fullScreen label="Cargando..." />;

  const isOwner = workout.userId === user?.id;
  const totalSets = workout.exercises.reduce((s, e) => s + e.sets.length, 0);
  const totalVolume = workout.exercises.reduce(
    (s, e) => s + e.sets.reduce((ss, set) => ss + (set.weightKg ?? 0) * set.reps, 0),
    0
  );
  const muscles = Array.from(
    new Set(workout.exercises.map((e) => e.exercise.primaryMuscle))
  );

  async function handleLike() {
    if (!workout) return;
    const newLiked = !workout.viewerLiked;
    setWorkout((w) => (w ? { ...w, viewerLiked: newLiked, likesCount: w.likesCount + (newLiked ? 1 : -1) } : w));
    try {
      if (newLiked) await workoutsService.like(workout.id);
      else await workoutsService.unlike(workout.id);
    } catch {
      setWorkout((w) => (w ? { ...w, viewerLiked: !newLiked, likesCount: w.likesCount + (!newLiked ? 1 : -1) } : w));
    }
  }

  async function handleComment(e: React.FormEvent) {
    e.preventDefault();
    if (!workout || !commentText.trim()) return;
    setPosting(true);
    try {
      const c = await workoutsService.addComment(workout.id, commentText.trim());
      setComments((prev) => [c, ...prev]);
      setWorkout((w) => (w ? { ...w, commentsCount: w.commentsCount + 1 } : w));
      setCommentText('');
    } catch {
      toast.error('Error');
    } finally {
      setPosting(false);
    }
  }

  async function handleDeleteWorkout() {
    if (!workout) return;
    setDeleting(true);
    try {
      await workoutsService.remove(workout.id);
      toast.success('Eliminado');
      navigate('/workouts');
    } catch {
      toast.error('Error', 'No se pudo eliminar');
    } finally {
      setDeleting(false);
      setShowDelete(false);
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <button
        onClick={() => navigate(-1)}
        className="text-surface-600 hover:text-surface-900 text-sm font-medium inline-flex items-center gap-1 mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> Volver
      </button>

      <article className="bg-white border border-surface-200 rounded-2xl overflow-hidden shadow-soft">
        {/* Hero */}
        <div className="p-6 sm:p-8 bg-gradient-to-br from-brand-50 via-white to-accent-50 border-b border-surface-200">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <IntensityBadge intensity={workout.intensity} size="sm" />
            <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full
                              ${workout.isPublic ? 'bg-emerald-100 text-emerald-700' : 'bg-yellow-100 text-yellow-700'}`}>
              {workout.isPublic ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
              {workout.isPublic ? 'Público' : 'Privado'}
            </span>
            {muscles.slice(0, 3).map((m) => (
              <MuscleBadge key={m} muscle={m} size="sm" />
            ))}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-surface-900">{workout.title}</h1>
          {workout.user && (
            <Link
              to={workout.user.username ? `/u/${workout.user.username}` : `/u/${workout.user.id}`}
              className="flex items-center gap-3 mt-4 group"
            >
              <Avatar src={workout.user.avatarUrl} name={workout.user.displayName ?? '?'} size="sm" />
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-semibold text-surface-900 group-hover:text-brand-700">
                    {workout.user.displayName ?? 'Usuario'}
                  </p>
                  {workout.user.isPremium && <PremiumBadge size="sm" />}
                </div>
                <p className="text-xs text-surface-500">
                  {formatDateLong(workout.workoutDate)} · {formatTime(workout.workoutDate)}
                </p>
              </div>
            </Link>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-4 sm:p-6 border-b border-surface-200">
          <StatBox icon={Dumbbell} label="Ejercicios" value={String(workout.exercises.length)} />
          <StatBox icon={Clock} label="Duración" value={formatDuration(workout.durationMin)} />
          <StatBox icon={Flame} label="Calorías" value={formatCalories(workout.calories)} />
          <StatBox icon={Trophy} label="Volumen" value={`${Math.round(totalVolume)} kg`} />
        </div>

        {/* Notas */}
        {workout.notes && (
          <div className="p-6 border-b border-surface-200">
            <h3 className="text-xs font-bold text-surface-500 uppercase tracking-wider mb-2">Notas</h3>
            <p className="text-sm text-surface-700 leading-relaxed whitespace-pre-wrap">{workout.notes}</p>
          </div>
        )}

        {/* Ejercicios */}
        <div className="p-4 sm:p-6 space-y-3 border-b border-surface-200">
          <h3 className="font-bold text-surface-900 mb-2">Ejercicios ({totalSets} series totales)</h3>
          {workout.exercises.map((we, idx) => {
            const workingSets = we.sets.filter((s) => !s.isWarmup);
            const exVolume = workingSets.reduce((sum, s) => sum + (s.weightKg ?? 0) * s.reps, 0);
            return (
              <div key={we.id ?? idx} className="bg-surface-50 border border-surface-200 rounded-xl overflow-hidden">
                <div className="px-4 py-3 flex items-center gap-3 bg-white">
                  <div className="w-8 h-8 rounded-md bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-sm">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-surface-900 truncate">{we.exercise.name}</p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                      <MuscleBadge muscle={we.exercise.primaryMuscle} size="sm" />
                      <span className="text-[10px] text-surface-500">
                        {EQUIPMENT_LABELS[we.exercise.equipment]}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-surface-500">Volumen</p>
                    <p className="text-sm font-bold text-surface-900">{Math.round(exVolume)} kg</p>
                  </div>
                </div>

                <div className="px-4 py-3">
                  <div className="grid grid-cols-12 gap-2 text-[10px] uppercase tracking-wider text-surface-500 font-bold pb-2 border-b border-surface-200">
                    <div className="col-span-1">Set</div>
                    <div className="col-span-3">Peso</div>
                    <div className="col-span-3">Reps</div>
                    <div className="col-span-2">RPE</div>
                    <div className="col-span-3">Tipo</div>
                  </div>
                  {we.sets.map((s) => (
                    <div key={s.id ?? s.setNumber} className="grid grid-cols-12 gap-2 py-2 text-sm border-b border-surface-100 last:border-0">
                      <div className={`col-span-1 font-bold ${s.isWarmup ? 'text-yellow-600' : 'text-surface-700'}`}>
                        {s.setNumber}
                      </div>
                      <div className="col-span-3 text-surface-900 font-semibold">
                        {s.weightKg != null ? `${s.weightKg} kg` : '—'}
                      </div>
                      <div className="col-span-3 text-surface-900 font-semibold">{s.reps}</div>
                      <div className="col-span-2 text-surface-600">{s.rpe ?? '—'}</div>
                      <div className="col-span-3 flex flex-wrap gap-1">
                        {s.isWarmup && <span className="text-[10px] font-bold text-yellow-700 bg-yellow-100 px-1.5 py-0.5 rounded">CAL</span>}
                        {s.isFailure && <span className="text-[10px] font-bold text-red-700 bg-red-100 px-1.5 py-0.5 rounded">FALLO</span>}
                      </div>
                    </div>
                  ))}
                  {we.notes && (
                    <p className="text-xs text-surface-600 mt-2 italic">"{we.notes}"</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Foto */}
        {workout.photoUrl && (
          <div className="p-6 border-b border-surface-200">
            <img
              src={workout.photoUrl}
              alt=""
              className="w-full max-h-96 object-cover rounded-xl border border-surface-200"
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-4 border-b border-surface-200">
          <div className="flex items-center gap-1">
            <button
              onClick={handleLike}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm font-semibold
                          ${workout.viewerLiked ? 'text-red-600 bg-red-50' : 'text-surface-700 hover:text-red-600 hover:bg-red-50'}`}
            >
              <Heart className={`w-4 h-4 ${workout.viewerLiked ? 'fill-current' : ''}`} />
              {workout.likesCount} {workout.likesCount === 1 ? 'me gusta' : 'me gustan'}
            </button>
            <span className="flex items-center gap-2 px-3 py-2 text-surface-600 text-sm">
              <MessageCircle className="w-4 h-4" />
              {workout.commentsCount}
            </span>
          </div>
          {isOwner && (
            <div className="flex items-center gap-2">
              <Link to={`/workouts/${workout.id}/edit`}>
                <Button variant="outline" size="sm" leftIcon={<Pencil className="w-3.5 h-3.5" />}>
                  Editar
                </Button>
              </Link>
              <Button
                variant="danger"
                size="sm"
                leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                onClick={() => setShowDelete(true)}
              >
                Eliminar
              </Button>
            </div>
          )}
        </div>

        {/* Comments */}
        <div className="p-4 sm:p-6">
          <h3 className="font-bold text-surface-900 mb-4">Comentarios</h3>
          <form onSubmit={handleComment} className="flex gap-2 mb-5">
            <Avatar src={user?.profile?.avatarUrl} name={user?.profile?.displayName ?? user?.email ?? '?'} size="sm" />
            <div className="flex-1 flex gap-2">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Añade un comentario..."
                maxLength={1000}
                className="input-field"
              />
              <Button type="submit" loading={posting} disabled={!commentText.trim()} size="sm" leftIcon={<Send className="w-3.5 h-3.5" />}>
                Enviar
              </Button>
            </div>
          </form>
          <div className="space-y-3">
            {comments.length === 0 ? (
              <p className="text-center text-sm text-surface-500 py-6">Sé el primero en comentar.</p>
            ) : (
              comments.map((c) => (
                <div key={c.id} className="flex gap-3">
                  <Avatar src={c.user.avatarUrl} name={c.user.displayName ?? '?'} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="bg-surface-50 rounded-xl px-4 py-2.5 border border-surface-100">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <Link
                          to={c.user.username ? `/u/${c.user.username}` : `/u/${c.user.id}`}
                          className="text-sm font-semibold text-surface-900 hover:text-brand-700"
                        >
                          {c.user.displayName ?? 'Usuario'}
                        </Link>
                        <span className="text-[10px] text-surface-500">{timeAgo(c.createdAt)}</span>
                      </div>
                      <p className="text-sm text-surface-700 whitespace-pre-wrap">{c.content}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </article>

      <ConfirmDialog
        isOpen={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDeleteWorkout}
        title="¿Borrar este entrenamiento?"
        message="No se podrá deshacer."
        confirmLabel="Sí, borrar"
        loading={deleting}
      />
    </div>
  );
}

function StatBox({
  icon: Icon, label, value,
}: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="bg-surface-50 rounded-xl p-4 border border-surface-100">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-3.5 h-3.5 text-surface-500" />
        <span className="text-[10px] font-bold text-surface-500 uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-lg font-bold text-surface-900 tabular-nums">{value}</p>
    </div>
  );
}
