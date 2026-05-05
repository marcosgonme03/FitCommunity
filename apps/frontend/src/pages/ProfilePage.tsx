import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Pencil, MapPin, Calendar as CalIcon, Activity, Trophy, Dumbbell, Crown,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useAuthStore } from '../store/authStore';
import workoutsService from '../services/workouts.service';
import usersService from '../services/users.service';
import { User, Workout, WorkoutStats, FitnessGoal, ExperienceLevel, PersonalRecord } from '../types';
import Avatar from '../components/ui/Avatar';
import Button from '../components/ui/Button';
import StatCard from '../components/ui/StatCard';
import WorkoutCard from '../components/ui/WorkoutCard';
import EmptyState from '../components/ui/EmptyState';
import Spinner from '../components/ui/Spinner';
import PremiumBadge from '../components/ui/PremiumBadge';
import { FITNESS_GOAL_LABELS, EXPERIENCE_LABELS, MUSCLE_LABELS, MUSCLE_COLORS } from '../lib/muscles';
import { formatMinutesAsHours, formatNumber, formatDate } from '../lib/format';
import { toast } from '../components/ui/Toast';

type Tab = 'workouts' | 'stats' | 'about';

export default function ProfilePage() {
  const { user } = useAuth();
  const { setUser } = useAuthStore();
  const profile = user?.profile;
  const [tab, setTab] = useState<Tab>('workouts');
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [stats, setStats] = useState<WorkoutStats | null>(null);
  const [prs, setPRs] = useState<PersonalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([
      workoutsService.list({ userId: user.id, limit: 12 }),
      workoutsService.stats(),
      workoutsService.personalRecords(15),
    ])
      .then(([w, s, pr]) => {
        setWorkouts(w.items);
        setStats(s);
        setPRs(pr.items);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  if (!user || !profile) return <Spinner fullScreen label="Cargando perfil..." />;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <header className="bg-white border border-surface-200 rounded-2xl overflow-hidden shadow-soft">
        <div className="h-32 bg-gradient-to-br from-brand-100 via-white to-accent-100" />
        <div className="px-5 sm:px-8 pb-6 -mt-12">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <Avatar src={profile.avatarUrl} name={profile.displayName} size="2xl" ring
              className="border-4 border-white shadow-soft" />
            <Button variant={editing ? 'ghost' : 'outline'}
              leftIcon={<Pencil className="w-4 h-4" />}
              onClick={() => setEditing((v) => !v)}>
              {editing ? 'Cancelar' : 'Editar perfil'}
            </Button>
          </div>
          <div className="mt-4">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-bold text-surface-900">{profile.displayName}</h1>
              {user.isPremium && <PremiumBadge />}
            </div>
            <p className="text-surface-500 text-sm">@{profile.username}</p>
            {profile.bio && <p className="text-surface-700 mt-3 text-sm leading-relaxed">{profile.bio}</p>}
            <div className="flex flex-wrap gap-3 mt-3 text-xs text-surface-500">
              {profile.location && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" /> {profile.location}
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <CalIcon className="w-3.5 h-3.5" /> Miembro desde {formatDate(user.createdAt)}
              </span>
            </div>
          </div>
          <div className="flex gap-6 mt-5 text-sm">
            <div>
              <p className="text-2xl font-bold text-surface-900">{user.counts?.workouts ?? 0}</p>
              <p className="text-xs text-surface-500 uppercase tracking-wider font-bold">Entrenamientos</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-surface-900">{user.counts?.followers ?? 0}</p>
              <p className="text-xs text-surface-500 uppercase tracking-wider font-bold">Seguidores</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-surface-900">{user.counts?.following ?? 0}</p>
              <p className="text-xs text-surface-500 uppercase tracking-wider font-bold">Siguiendo</p>
            </div>
          </div>
        </div>
      </header>

      {editing ? (
        <EditProfileForm
          onCancel={() => setEditing(false)}
          onSaved={(updated) => {
            setUser(updated);
            setEditing(false);
            toast.success('Perfil actualizado');
          }}
        />
      ) : (
        <>
          <div className="flex items-center gap-1 border-b border-surface-200">
            {(['workouts', 'stats', 'about'] as Tab[]).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px
                            ${tab === t ? 'border-brand-500 text-surface-900' : 'border-transparent text-surface-500 hover:text-surface-700'}`}>
                {t === 'workouts' && 'Entrenamientos'}
                {t === 'stats' && 'Estadísticas'}
                {t === 'about' && 'Sobre mí'}
              </button>
            ))}
          </div>

          {loading ? (
            <Spinner label="Cargando..." />
          ) : (
            <>
              {tab === 'workouts' && (
                workouts.length === 0 ? (
                  <EmptyState icon={Activity} title="Aún no has registrado entrenamientos"
                    description="Empieza a registrar tu actividad."
                    action={<Link to="/workouts/new"><Button>Crear primer entrenamiento</Button></Link>} />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {workouts.map((w) => <WorkoutCard key={w.id} workout={w} showAuthor={false} />)}
                  </div>
                )
              )}

              {tab === 'stats' && stats && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard icon={Activity} label="Total" value={stats.totals.workouts} hint="entrenamientos" accent="brand" />
                    <StatCard icon={CalIcon} label="Horas" value={formatMinutesAsHours(stats.totals.minutes)} accent="accent" />
                    <StatCard icon={Trophy} label="Calorías" value={formatNumber(stats.totals.calories)} accent="orange" />
                    <StatCard icon={Dumbbell} label="Volumen 30d" value={`${formatNumber(stats.last30Days.totalVolume)} kg`} accent="red" />
                  </div>
                  {stats.topMuscles.length > 0 && (
                    <div className="bg-white border border-surface-200 rounded-2xl p-5 shadow-soft">
                      <h3 className="font-bold text-surface-900 mb-4">Grupos musculares más entrenados</h3>
                      <div className="space-y-2">
                        {stats.topMuscles.slice(0, 8).map((s) => {
                          const total = stats.topMuscles.reduce((sum, t) => sum + t.count, 0);
                          const pct = (s.count / total) * 100;
                          return (
                            <div key={s.muscle} className="flex items-center gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-sm font-semibold text-surface-900">{MUSCLE_LABELS[s.muscle]}</span>
                                  <span className="text-xs text-surface-500">{s.count} sesiones</span>
                                </div>
                                <div className="h-2 bg-surface-100 rounded-full overflow-hidden">
                                  <div className="h-full rounded-full transition-all"
                                    style={{ width: `${pct}%`, backgroundColor: MUSCLE_COLORS[s.muscle].hex }} />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {prs.length > 0 && (
                    <div className="bg-white border border-surface-200 rounded-2xl shadow-soft">
                      <div className="p-5 border-b border-surface-200">
                        <h3 className="font-bold text-surface-900 flex items-center gap-2">
                          <Trophy className="w-4 h-4 text-accent-600" /> Marcas personales
                        </h3>
                      </div>
                      <div className="divide-y divide-surface-100">
                        {prs.map((pr) => (
                          <div key={pr.exerciseId} className="flex items-center gap-3 p-4">
                            <div className="w-10 h-10 rounded-lg bg-accent-100 flex items-center justify-center shrink-0">
                              <Trophy className="w-4 h-4 text-accent-700" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-surface-900 text-sm truncate">{pr.exerciseName}</p>
                              <p className="text-xs text-surface-500">{formatDate(pr.achievedAt)} · {pr.repsAtMax} reps</p>
                            </div>
                            <p className="text-xl font-bold text-surface-900">{pr.maxWeight} <span className="text-sm font-normal text-surface-500">kg</span></p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {tab === 'about' && (
                <div className="bg-white border border-surface-200 rounded-2xl p-5 shadow-soft">
                  <h3 className="font-bold text-surface-900 mb-4">Información personal</h3>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                    <Info label="Email" value={user.email} />
                    <Info label="Localización" value={profile.location ?? '—'} />
                    <Info label="Altura" value={profile.heightCm ? `${profile.heightCm} cm` : '—'} />
                    <Info label="Peso" value={profile.weightKg ? `${profile.weightKg} kg` : '—'} />
                    <Info label="Objetivo" value={profile.fitnessGoal ? FITNESS_GOAL_LABELS[profile.fitnessGoal] : '—'} />
                    <Info label="Nivel" value={profile.experienceLevel ? EXPERIENCE_LABELS[profile.experienceLevel] : '—'} />
                    <Info label="Perfil" value={profile.isProfilePublic ? 'Público' : 'Privado'} />
                    <Info label="Suscripción" value={user.isPremium ? 'Premium' : 'Free'} />
                  </dl>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wider text-surface-500 font-bold">{label}</dt>
      <dd className="text-sm text-surface-800 mt-0.5">{value}</dd>
    </div>
  );
}

function EditProfileForm({ onCancel, onSaved }: { onCancel: () => void; onSaved: (user: User) => void }) {
  const { user } = useAuth();
  const profile = user?.profile;
  const [submitting, setSubmitting] = useState(false);

  const [data, setData] = useState({
    displayName: profile?.displayName ?? '',
    bio: profile?.bio ?? '',
    avatarUrl: profile?.avatarUrl ?? '',
    location: profile?.location ?? '',
    heightCm: profile?.heightCm as number | string | null ?? '',
    weightKg: profile?.weightKg as number | string | null ?? '',
    fitnessGoal: profile?.fitnessGoal ?? '' as FitnessGoal | '',
    experienceLevel: profile?.experienceLevel ?? '' as ExperienceLevel | '',
    isProfilePublic: profile?.isProfilePublic ?? true,
  });

  function update<K extends keyof typeof data>(k: K, v: (typeof data)[K]) {
    setData((d) => ({ ...d, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const updated = await usersService.updateMe({
        displayName: data.displayName || undefined,
        bio: data.bio || null,
        avatarUrl: data.avatarUrl || null,
        location: data.location || null,
        heightCm: data.heightCm === '' ? null : Number(data.heightCm),
        weightKg: data.weightKg === '' ? null : Number(data.weightKg),
        fitnessGoal: data.fitnessGoal || null,
        experienceLevel: data.experienceLevel || null,
        isProfilePublic: data.isProfilePublic,
      });
      onSaved(updated);
    } catch {
      toast.error('Error', 'No se pudo guardar');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-white border border-surface-200 rounded-2xl p-5 space-y-4 shadow-soft">
        <h3 className="font-bold text-surface-900">Editar perfil</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="label">Nombre</label>
            <input type="text" value={data.displayName}
              onChange={(e) => update('displayName', e.target.value)} className="input-field" />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Bio</label>
            <textarea value={data.bio ?? ''} onChange={(e) => update('bio', e.target.value)}
              className="input-field resize-none" rows={3} maxLength={500} />
          </div>
          <div>
            <label className="label">Avatar (URL)</label>
            <input type="url" value={data.avatarUrl ?? ''}
              onChange={(e) => update('avatarUrl', e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="label">Localización</label>
            <input type="text" value={data.location ?? ''}
              onChange={(e) => update('location', e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="label">Altura (cm)</label>
            <input type="number" min={50} max={250} value={data.heightCm ?? ''}
              onChange={(e) => update('heightCm', e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="label">Peso (kg)</label>
            <input type="number" step="0.1" min={20} max={300} value={data.weightKg ?? ''}
              onChange={(e) => update('weightKg', e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="label">Objetivo</label>
            <select value={data.fitnessGoal ?? ''}
              onChange={(e) => update('fitnessGoal', (e.target.value || '') as FitnessGoal | '')}
              className="input-field">
              <option value="">—</option>
              {(Object.entries(FITNESS_GOAL_LABELS) as Array<[FitnessGoal, string]>).map(([k, v]) =>
                <option key={k} value={k}>{v}</option>
              )}
            </select>
          </div>
          <div>
            <label className="label">Nivel</label>
            <select value={data.experienceLevel ?? ''}
              onChange={(e) => update('experienceLevel', (e.target.value || '') as ExperienceLevel | '')}
              className="input-field">
              <option value="">—</option>
              {(Object.entries(EXPERIENCE_LABELS) as Array<[ExperienceLevel, string]>).map(([k, v]) =>
                <option key={k} value={k}>{v}</option>
              )}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="label">Privacidad</label>
            <select value={data.isProfilePublic ? 'public' : 'private'}
              onChange={(e) => update('isProfilePublic', e.target.value === 'public')}
              className="input-field">
              <option value="public">Perfil público</option>
              <option value="private">Perfil privado</option>
            </select>
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" type="button" onClick={onCancel} disabled={submitting}>Cancelar</Button>
        <Button type="submit" loading={submitting}>Guardar cambios</Button>
      </div>
    </form>
  );
}
