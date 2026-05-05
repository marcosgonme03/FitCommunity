import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Trash2, ExternalLink, Heart, MessageCircle, AlertTriangle } from 'lucide-react';
import adminService from '../../services/admin.service';
import { AdminWorkoutListItem } from '../../types';
import Avatar from '../../components/ui/Avatar';
import Button from '../../components/ui/Button';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import EmptyState from '../../components/ui/EmptyState';
import Spinner from '../../components/ui/Spinner';
import { formatDate, formatDuration } from '../../lib/format';
import { toast } from '../../components/ui/Toast';

export default function AdminWorkoutsPage() {
  const [workouts, setWorkouts] = useState<AdminWorkoutListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<{ page: number; limit: number; search?: string }>({
    page: 1,
    limit: 25,
  });
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [searchInput, setSearchInput] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<AdminWorkoutListItem | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  function load() {
    setLoading(true);
    adminService
      .listWorkouts(filters)
      .then((res) => {
        setWorkouts(res.items);
        setPagination({
          page: res.pagination.page,
          totalPages: res.pagination.totalPages,
          total: res.pagination.total,
        });
      })
      .catch(() => toast.error('Error', 'No se pudieron cargar los workouts'))
      .finally(() => setLoading(false));
  }

  useEffect(load, [filters]); // eslint-disable-line react-hooks/exhaustive-deps

  function applySearch(e: React.FormEvent) {
    e.preventDefault();
    setFilters((f) => ({ ...f, search: searchInput || undefined, page: 1 }));
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    setActionLoading(true);
    try {
      await adminService.deleteWorkout(confirmDelete.id);
      toast.success('Entrenamiento eliminado');
      setConfirmDelete(null);
      load();
    } catch {
      toast.error('Error', 'No se pudo eliminar');
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold text-surface-900">Moderación de entrenamientos</h1>
        <p className="text-surface-600 mt-1 text-sm">
          {pagination.total > 0
            ? `${pagination.total} entrenamientos en la plataforma`
            : 'Sin entrenamientos'}
        </p>
      </header>

      <div className="bg-white border border-surface-200 rounded-2xl p-4 shadow-soft">
        <form onSubmit={applySearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Buscar por título o descripción..."
              className="input-field pl-10"
            />
          </div>
          <Button type="submit">Buscar</Button>
        </form>
      </div>

      <div className="bg-white border border-surface-200 rounded-2xl shadow-soft overflow-hidden">
        {loading ? (
          <div className="p-12">
            <Spinner label="Cargando..." />
          </div>
        ) : workouts.length === 0 ? (
          <EmptyState icon={Search} title="Sin resultados" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left bg-surface-50 border-b border-surface-200">
                  <th className="px-4 py-3 font-semibold text-surface-500 text-xs uppercase tracking-wider">Entrenamiento</th>
                  <th className="px-4 py-3 font-semibold text-surface-500 text-xs uppercase tracking-wider">Autor</th>
                  <th className="px-4 py-3 font-semibold text-surface-500 text-xs uppercase tracking-wider hidden md:table-cell">Detalles</th>
                  <th className="px-4 py-3 font-semibold text-surface-500 text-xs uppercase tracking-wider hidden lg:table-cell">Engagement</th>
                  <th className="px-4 py-3 font-semibold text-surface-500 text-xs uppercase tracking-wider hidden lg:table-cell">Fecha</th>
                  <th className="px-4 py-3 font-semibold text-surface-500 text-xs uppercase tracking-wider text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {workouts.map((w) => (
                  <tr key={w.id} className="hover:bg-surface-50 transition-colors">
                    <td className="px-4 py-3 max-w-xs">
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-surface-900 truncate">{w.title}</p>
                          {w.reportsCount > 0 && (
                            <span title={`${w.reportsCount} reportes`} className="inline-flex items-center text-red-500">
                              <AlertTriangle className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-surface-500">{w.exercisesCount} ejercicios</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to={w.user.username ? `/u/${w.user.username}` : `/u/${w.user.id}`}
                        className="flex items-center gap-2 group min-w-0"
                      >
                        <Avatar src={w.user.avatarUrl} name={w.user.displayName ?? w.user.email} size="sm" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-surface-900 truncate group-hover:text-brand-700">
                            {w.user.displayName ?? '—'}
                          </p>
                          <p className="text-[10px] text-surface-500 truncate">{w.user.email}</p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-surface-700 hidden md:table-cell text-xs">
                      {formatDuration(w.durationMin)} · {w.calories ?? 0} kcal
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <div className="flex items-center gap-3 text-xs text-surface-600">
                        <span className="inline-flex items-center gap-1">
                          <Heart className="w-3 h-3" />
                          {w.likesCount}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MessageCircle className="w-3 h-3" />
                          {w.commentsCount}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-surface-500 hidden lg:table-cell text-xs">
                      {formatDate(w.workoutDate)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <Link
                          to={`/workouts/${w.id}`}
                          className="p-1.5 rounded-lg text-surface-500 hover:bg-surface-100 hover:text-surface-900 transition-colors"
                          title="Ver"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => setConfirmDelete(w)}
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 p-4 border-t border-surface-200">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page === 1}
              onClick={() => setFilters((f) => ({ ...f, page: pagination.page - 1 }))}
            >
              Anterior
            </Button>
            <span className="text-sm text-surface-600 px-3">
              Página {pagination.page} de {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page === pagination.totalPages}
              onClick={() => setFilters((f) => ({ ...f, page: pagination.page + 1 }))}
            >
              Siguiente
            </Button>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="¿Eliminar entrenamiento?"
        message={
          confirmDelete
            ? `Se eliminará "${confirmDelete.title}" junto con sus likes y comentarios. Esta acción no se puede deshacer.`
            : ''
        }
        loading={actionLoading}
      />
    </div>
  );
}
