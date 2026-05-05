import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Dumbbell, X } from 'lucide-react';
import workoutsService, { ListWorkoutsFilters } from '../../services/workouts.service';
import { Workout, IntensityLevel } from '../../types';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import Spinner from '../../components/ui/Spinner';
import WorkoutCard from '../../components/ui/WorkoutCard';
import { ALL_INTENSITIES, INTENSITY_LABELS } from '../../lib/muscles';
import { toast } from '../../components/ui/Toast';

export default function WorkoutsListPage() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ListWorkoutsFilters>({ page: 1, limit: 20 });
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [searchInput, setSearchInput] = useState('');

  useEffect(() => {
    setLoading(true);
    workoutsService
      .list(filters)
      .then((res) => {
        setWorkouts(res.items);
        setPagination({
          page: res.pagination.page,
          totalPages: res.pagination.totalPages,
          total: res.pagination.total,
        });
      })
      .catch(() => toast.error('Error', 'No se pudieron cargar tus entrenamientos'))
      .finally(() => setLoading(false));
  }, [filters]);

  function applySearch(e: React.FormEvent) {
    e.preventDefault();
    setFilters((f) => ({ ...f, search: searchInput || undefined, page: 1 }));
  }

  function clearFilters() {
    setSearchInput('');
    setFilters({ page: 1, limit: 20 });
  }

  async function handleLikeToggle(workout: Workout) {
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
      setWorkouts((prev) =>
        prev.map((w) =>
          w.id === workout.id
            ? { ...w, viewerLiked: !newLiked, likesCount: w.likesCount + (!newLiked ? 1 : -1) }
            : w
        )
      );
    }
  }

  const activeFilterCount = [filters.intensity, filters.search].filter(Boolean).length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-surface-900">Mis entrenamientos</h1>
          <p className="text-surface-600 mt-1 text-sm">
            {pagination.total > 0
              ? `${pagination.total} entrenamientos registrados`
              : 'Registra tu actividad y sigue tu progreso'}
          </p>
        </div>
        <Link to="/workouts/new">
          <Button leftIcon={<Plus className="w-4 h-4" />}>Nuevo entrenamiento</Button>
        </Link>
      </header>

      <div className="bg-white border border-surface-200 rounded-2xl p-4 shadow-soft">
        <form onSubmit={applySearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Buscar por título o notas..."
              className="input-field pl-10"
            />
          </div>
          {searchInput && <Button type="submit">Buscar</Button>}
        </form>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={() => setFilters({ ...filters, intensity: undefined, page: 1 })}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all
                        ${!filters.intensity
                          ? 'bg-brand-100 text-brand-700 border-brand-300'
                          : 'bg-white text-surface-600 border-surface-200 hover:bg-surface-50'}`}
          >
            Todas las intensidades
          </button>
          {ALL_INTENSITIES.map((i) => (
            <button
              key={i}
              onClick={() => setFilters({ ...filters, intensity: i as IntensityLevel, page: 1 })}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all
                          ${filters.intensity === i
                            ? 'bg-brand-100 text-brand-700 border-brand-300'
                            : 'bg-white text-surface-600 border-surface-200 hover:bg-surface-50'}`}
            >
              {INTENSITY_LABELS[i]}
            </button>
          ))}
          {activeFilterCount > 0 && (
            <button onClick={clearFilters}
              className="text-xs text-surface-500 hover:text-surface-900 inline-flex items-center gap-1">
              <X className="w-3 h-3" /> Limpiar
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <Spinner fullScreen label="Cargando..." />
      ) : workouts.length === 0 ? (
        <EmptyState
          icon={Dumbbell}
          title={activeFilterCount > 0 ? 'Sin resultados' : 'Aún no tienes entrenamientos'}
          description={activeFilterCount > 0 ? 'Prueba a ajustar los filtros.' : 'Crea tu primer entrenamiento.'}
          action={
            activeFilterCount === 0 ? (
              <Link to="/workouts/new">
                <Button leftIcon={<Plus className="w-4 h-4" />}>Crear entrenamiento</Button>
              </Link>
            ) : (
              <Button variant="outline" onClick={clearFilters}>Limpiar filtros</Button>
            )
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {workouts.map((w) => (
              <WorkoutCard key={w.id} workout={w} onLikeToggle={handleLikeToggle} showAuthor={false} />
            ))}
          </div>
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button variant="outline" size="sm" disabled={pagination.page === 1}
                onClick={() => setFilters((f) => ({ ...f, page: pagination.page - 1 }))}>
                Anterior
              </Button>
              <span className="text-sm text-surface-600 px-3">
                Página {pagination.page} de {pagination.totalPages}
              </span>
              <Button variant="outline" size="sm" disabled={pagination.page === pagination.totalPages}
                onClick={() => setFilters((f) => ({ ...f, page: pagination.page + 1 }))}>
                Siguiente
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
