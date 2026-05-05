import { useEffect, useState } from 'react';
import { Bell, Check, Trash2, Filter } from 'lucide-react';
import notificationsService, { NotificationItem } from '../services/notifications.service';
import { NotificationListItem } from '../components/notifications/NotificationBell';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import Spinner from '../components/ui/Spinner';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { toast } from '../components/ui/Toast';

export default function NotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [unreadCount, setUnreadCount] = useState(0);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [confirmClear, setConfirmClear] = useState(false);
  const [acting, setActing] = useState(false);

  function load(page = 1) {
    setLoading(true);
    notificationsService
      .list({ page, limit: 25, unreadOnly: filter === 'unread' })
      .then((res) => {
        setItems(res.items);
        setUnreadCount(res.unreadCount);
        setPagination({
          page: res.pagination.page,
          totalPages: res.pagination.totalPages,
          total: res.pagination.total,
        });
      })
      .catch(() => toast.error('Error', 'No se pudieron cargar las notificaciones'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load(1);
  }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleMarkAll() {
    if (acting || unreadCount === 0) return;
    setActing(true);
    try {
      await notificationsService.markAllRead();
      toast.success('Marcadas como leídas');
      load(pagination.page);
    } catch {
      toast.error('Error', 'No se pudo marcar todas como leídas');
    } finally {
      setActing(false);
    }
  }

  async function handleClear() {
    setActing(true);
    try {
      const res = await notificationsService.clearRead();
      toast.success(`${res.deletedCount} notificaciones eliminadas`);
      setConfirmClear(false);
      load(1);
    } catch {
      toast.error('Error', 'No se pudieron eliminar');
    } finally {
      setActing(false);
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-surface-900 flex items-center gap-2">
            <Bell className="w-7 h-7 text-brand-600" />
            Notificaciones
          </h1>
          <p className="text-surface-600 mt-1 text-sm">
            {pagination.total} en total
            {unreadCount > 0 && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full bg-brand-100 text-brand-700 text-xs font-bold">
                {unreadCount} sin leer
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<Check className="w-4 h-4" />}
              onClick={handleMarkAll}
              disabled={acting}
            >
              Marcar todas
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<Trash2 className="w-4 h-4" />}
            onClick={() => setConfirmClear(true)}
          >
            Limpiar leídas
          </Button>
        </div>
      </header>

      {/* Filter pills */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-surface-400" />
        <div className="flex gap-1 bg-white border border-surface-200 rounded-lg p-1">
          <FilterButton active={filter === 'all'} onClick={() => setFilter('all')} label="Todas" />
          <FilterButton active={filter === 'unread'} onClick={() => setFilter('unread')} label={`Sin leer ${unreadCount > 0 ? `(${unreadCount})` : ''}`} />
        </div>
      </div>

      {/* Body */}
      {loading ? (
        <div className="bg-white rounded-2xl py-20 border border-surface-200 shadow-soft">
          <Spinner label="Cargando notificaciones..." />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Bell}
          title={filter === 'unread' ? 'No tienes notificaciones sin leer' : 'No tienes notificaciones'}
          description={
            filter === 'unread'
              ? 'Cuando alguien interactúe con tus entrenamientos, aparecerá aquí.'
              : 'Aún no has recibido ninguna notificación. Comparte tus entrenamientos y conecta con la comunidad.'
          }
        />
      ) : (
        <div className="bg-white border border-surface-200 rounded-2xl shadow-soft overflow-hidden">
          <ul className="divide-y divide-surface-100">
            {items.map((n) => (
              <NotificationListItem key={n.id} item={n} />
            ))}
          </ul>
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-surface-500">
            Página <span className="font-semibold text-surface-900">{pagination.page}</span> de{' '}
            <span className="font-semibold text-surface-900">{pagination.totalPages}</span>
          </p>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => load(pagination.page - 1)}
            >
              Anterior
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => load(pagination.page + 1)}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmClear}
        title="Limpiar notificaciones leídas"
        message="Se eliminarán todas las notificaciones que ya hayas leído. Las no leídas se mantendrán."
        confirmLabel="Eliminar"
        variant="danger"
        loading={acting}
        onConfirm={handleClear}
        onClose={() => setConfirmClear(false)}
      />
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
        active ? 'bg-brand-500 text-white' : 'text-surface-700 hover:bg-surface-100'
      }`}
    >
      {label}
    </button>
  );
}
