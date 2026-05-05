import { useEffect, useState } from 'react';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import {
  UserPlus,
  UserCheck,
  MapPin,
  Calendar as CalIcon,
  Activity,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import workoutsService from '../services/workouts.service';
import usersService from '../services/users.service';
import { User, Workout, WorkoutStats } from '../types';
import Avatar from '../components/ui/Avatar';
import Button from '../components/ui/Button';
import StatCard from '../components/ui/StatCard';
import WorkoutCard from '../components/ui/WorkoutCard';
import EmptyState from '../components/ui/EmptyState';
import Spinner from '../components/ui/Spinner';
import {
  FITNESS_GOAL_LABELS,
  EXPERIENCE_LABELS,
} from '../lib/muscles';
import { formatMinutesAsHours, formatNumber, formatDate } from '../lib/format';
import { toast } from '../components/ui/Toast';

export default function PublicProfilePage() {
  const { idOrUsername } = useParams<{ idOrUsername: string }>();
  const navigate = useNavigate();
  const { user: viewer } = useAuth();
  const [profile, setProfile] = useState<User | null>(null);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [stats, setStats] = useState<WorkoutStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [followingLoading, setFollowingLoading] = useState(false);

  useEffect(() => {
    if (!idOrUsername) return;
    setLoading(true);
    usersService
      .getById(idOrUsername)
      .then(async (u) => {
        setProfile(u);
        if (u.profile?.showWorkouts !== false) {
          const w = await workoutsService.list({ userId: u.id, limit: 9 });
          setWorkouts(w.items);
        }
        if (u.profile?.showStats !== false) {
          try {
            const s = await usersService.getStats(idOrUsername);
            setStats(s);
          } catch {
            // stats may be private
          }
        }
      })
      .catch(() => toast.error('Error', 'No se pudo cargar el perfil'))
      .finally(() => setLoading(false));
  }, [idOrUsername]);

  if (loading) return <Spinner fullScreen label="Cargando perfil..." />;
  if (!profile) return <Navigate to="/dashboard" replace />;
  if (profile.isSelf) {
    navigate('/profile', { replace: true });
    return null;
  }

  async function handleFollowToggle() {
    if (!profile) return;
    setFollowingLoading(true);
    try {
      if (profile.isFollowing) {
        await usersService.unfollow(profile.id);
        setProfile({
          ...profile,
          isFollowing: false,
          counts: profile.counts && {
            ...profile.counts,
            followers: Math.max(0, profile.counts.followers - 1),
          },
        });
      } else {
        await usersService.follow(profile.id);
        setProfile({
          ...profile,
          isFollowing: true,
          counts: profile.counts && {
            ...profile.counts,
            followers: profile.counts.followers + 1,
          },
        });
      }
    } catch {
      toast.error('Error', 'No se pudo actualizar el seguimiento');
    } finally {
      setFollowingLoading(false);
    }
  }

  const p = profile.profile!;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <header className="bg-surface-800 border border-surface-700 rounded-2xl overflow-hidden">
        <div className="h-32 bg-gradient-to-br from-brand-500/20 via-surface-800 to-accent-500/10" />
        <div className="px-5 sm:px-8 pb-6 -mt-12">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <Avatar
              src={p.avatarUrl}
              name={p.displayName}
              size="2xl"
              ring
              className="border-4 border-surface-800"
            />
            {viewer && !profile.isSelf && (
              <Button
                variant={profile.isFollowing ? 'outline' : 'primary'}
                leftIcon={profile.isFollowing ? <UserCheck className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                loading={followingLoading}
                onClick={handleFollowToggle}
              >
                {profile.isFollowing ? 'Siguiendo' : 'Seguir'}
              </Button>
            )}
          </div>
          <div className="mt-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-white">{p.displayName}</h1>
            <p className="text-slate-400 text-sm">@{p.username}</p>
            {p.bio && (
              <p className="text-slate-300 mt-3 text-sm leading-relaxed">{p.bio}</p>
            )}
            <div className="flex flex-wrap gap-3 mt-3 text-xs text-slate-400">
              {p.location && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {p.location}
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <CalIcon className="w-3.5 h-3.5" />
                Miembro desde {formatDate(profile.createdAt)}
              </span>
            </div>
          </div>

          <div className="flex gap-6 mt-5 text-sm">
            <div>
              <p className="text-2xl font-bold text-white">{profile.counts?.workouts ?? 0}</p>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Entrenamientos</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{profile.counts?.followers ?? 0}</p>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Seguidores</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{profile.counts?.following ?? 0}</p>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Siguiendo</p>
            </div>
          </div>
        </div>
      </header>

      {/* Goal & level */}
      {(p.fitnessGoal || p.experienceLevel) && (
        <div className="bg-white border border-surface-200 rounded-2xl p-5 shadow-soft">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {p.fitnessGoal && (
              <div>
                <p className="text-[11px] text-surface-500 uppercase tracking-wider font-bold">Objetivo</p>
                <p className="text-sm text-surface-800 mt-0.5">{FITNESS_GOAL_LABELS[p.fitnessGoal]}</p>
              </div>
            )}
            {p.experienceLevel && (
              <div>
                <p className="text-[11px] text-surface-500 uppercase tracking-wider font-bold">Nivel</p>
                <p className="text-sm text-surface-800 mt-0.5">{EXPERIENCE_LABELS[p.experienceLevel]}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stats */}
      {stats && p.showStats !== false && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Activity} label="Total" value={stats.totals.workouts} hint="entrenamientos" accent="brand" />
          <StatCard icon={CalIcon} label="Horas" value={formatMinutesAsHours(stats.totals.minutes)} accent="accent" />
          <StatCard icon={Activity} label="Calorías" value={formatNumber(stats.totals.calories)} accent="orange" />
          <StatCard icon={Activity} label="Volumen 30d" value={`${formatNumber(stats.last30Days.totalVolume)} kg`} accent="red" />
        </div>
      )}

      {/* Workouts */}
      <div>
        <h2 className="font-bold text-white text-lg mb-4">Entrenamientos públicos</h2>
        {p.showWorkouts === false ? (
          <EmptyState
            icon={Activity}
            title="Entrenamientos privados"
            description="Este usuario ha decidido mantener sus entrenamientos en privado."
          />
        ) : workouts.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="Sin entrenamientos públicos"
            description="Este usuario aún no ha publicado entrenamientos."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {workouts.map((w) => (
              <WorkoutCard key={w.id} workout={w} showAuthor={false} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
