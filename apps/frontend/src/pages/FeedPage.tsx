import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Globe, UserPlus } from 'lucide-react';
import feedService from '../services/feed.service';
import workoutsService from '../services/workouts.service';
import usersService from '../services/users.service';
import { Workout, SuggestedUser } from '../types';
import WorkoutCard from '../components/ui/WorkoutCard';
import EmptyState from '../components/ui/EmptyState';
import Spinner from '../components/ui/Spinner';
import Avatar from '../components/ui/Avatar';
import Button from '../components/ui/Button';
import { toast } from '../components/ui/Toast';

type Tab = 'following' | 'explore';

export default function FeedPage() {
  const [tab, setTab] = useState<Tab>('following');
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestedUser[]>([]);

  const loadFeed = useCallback(async (selectedTab: Tab, replace = true) => {
    if (replace) setLoading(true);
    else setLoadingMore(true);

    try {
      const fetcher = selectedTab === 'following' ? feedService.getFeed : feedService.getExplore;
      const result = await fetcher({
        cursor: replace ? undefined : cursor ?? undefined,
        limit: 20,
      });
      setWorkouts((prev) => (replace ? result.items : [...prev, ...result.items]));
      setCursor(result.nextCursor);
    } catch {
      toast.error('Error', 'No se pudo cargar el feed');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor]);

  useEffect(() => {
    setCursor(null);
    loadFeed(tab, true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  useEffect(() => {
    usersService.getSuggestions(5).then((s) => setSuggestions(s.items)).catch(() => undefined);
  }, []);

  async function handleLike(workout: Workout) {
    const newLiked = !workout.viewerLiked;
    setWorkouts((prev) =>
      prev.map((w) =>
        w.id === workout.id
          ? { ...w, viewerLiked: newLiked, likesCount: w.likesCount + (newLiked ? 1 : -1) }
          : w
      )
    );
    try {
      if (newLiked) await workoutsService.like(workout.id);
      else await workoutsService.unlike(workout.id);
    } catch {
      // revert
      setWorkouts((prev) =>
        prev.map((w) =>
          w.id === workout.id
            ? { ...w, viewerLiked: !newLiked, likesCount: w.likesCount + (!newLiked ? 1 : -1) }
            : w
        )
      );
    }
  }

  async function handleFollow(userId: string) {
    try {
      await usersService.follow(userId);
      setSuggestions((prev) => prev.filter((s) => s.id !== userId));
      toast.success('Ahora sigues a este usuario');
    } catch {
      toast.error('Error');
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-surface-900">Comunidad</h1>
        <p className="text-surface-600 mt-1 text-sm">
          Descubre lo que están haciendo otros atletas en FitCommunity.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {/* Tabs */}
          <div className="flex items-center gap-1 border-b border-surface-200 mb-4">
            <button
              onClick={() => setTab('following')}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px
                          ${tab === 'following'
                            ? 'border-brand-500 text-surface-900'
                            : 'border-transparent text-surface-600 hover:text-surface-800'}`}
            >
              <Sparkles className="w-4 h-4" />
              Siguiendo
            </button>
            <button
              onClick={() => setTab('explore')}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px
                          ${tab === 'explore'
                            ? 'border-brand-500 text-surface-900'
                            : 'border-transparent text-surface-600 hover:text-surface-800'}`}
            >
              <Globe className="w-4 h-4" />
              Explorar
            </button>
          </div>

          {loading ? (
            <Spinner label="Cargando feed..." />
          ) : workouts.length === 0 ? (
            <EmptyState
              icon={Sparkles}
              title={tab === 'following' ? 'Tu feed está vacío' : 'No hay actividad reciente'}
              description={
                tab === 'following'
                  ? 'Sigue a otros atletas para ver sus entrenamientos aquí. Échale un vistazo a la pestaña Explorar.'
                  : 'Aún no hay entrenamientos públicos. Sé el primero en compartir uno.'
              }
              action={
                tab === 'following' ? (
                  <Button variant="outline" onClick={() => setTab('explore')}>
                    Explorar comunidad
                  </Button>
                ) : (
                  <Link to="/workouts/new">
                    <Button>Crear entrenamiento</Button>
                  </Link>
                )
              }
            />
          ) : (
            <>
              <div className="space-y-4">
                {workouts.map((w) => (
                  <WorkoutCard key={w.id} workout={w} onLikeToggle={handleLike} />
                ))}
              </div>
              {cursor && (
                <div className="flex justify-center pt-6">
                  <Button
                    variant="outline"
                    loading={loadingMore}
                    onClick={() => loadFeed(tab, false)}
                  >
                    {loadingMore ? 'Cargando...' : 'Cargar más'}
                  </Button>
                </div>
              )}
              {!cursor && workouts.length > 0 && (
                <p className="text-center text-xs text-surface-400 py-6">
                  ─ Has llegado al final ─
                </p>
              )}
            </>
          )}
        </div>

        {/* Sidebar with suggestions */}
        <aside className="space-y-4">
          <div className="bg-white border border-surface-200 rounded-2xl">
            <div className="p-4 border-b border-surface-200">
              <h3 className="font-bold text-surface-900">A quién seguir</h3>
              <p className="text-xs text-surface-500 mt-0.5">Atletas activos en la comunidad</p>
            </div>
            <div className="p-2">
              {suggestions.length === 0 ? (
                <p className="text-center text-xs text-surface-500 py-6">Sin sugerencias por ahora</p>
              ) : (
                suggestions.map((u) => (
                  <div key={u.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-100/60 transition-colors">
                    <Link to={u.username ? `/u/${u.username}` : `/u/${u.id}`} className="flex items-center gap-3 flex-1 min-w-0 group">
                      <Avatar src={u.avatarUrl} name={u.displayName ?? '?'} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-surface-900 truncate group-hover:text-brand-700 transition-colors">
                          {u.displayName ?? 'Usuario'}
                        </p>
                        <p className="text-[11px] text-surface-500 truncate">
                          {u.workoutsCount} entr. · {u.followersCount} seguidores
                        </p>
                      </div>
                    </Link>
                    <button
                      onClick={() => handleFollow(u.id)}
                      className="text-xs font-semibold text-brand-600 hover:text-brand-700 px-2 py-1 rounded hover:bg-brand-50 transition-colors"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white border border-surface-200 rounded-2xl p-5">
            <p className="text-xs text-surface-600 leading-relaxed">
              <strong className="text-surface-900">Consejo:</strong> Cuanto más interactúes con la comunidad
              (likes, comentarios, follows), más relevantes serán las sugerencias para ti.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

