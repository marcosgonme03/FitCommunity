import { useEffect, useState } from 'react';
import {
  Search,
  Crown,
  Filter,
  X,
  ExternalLink,
  AlertTriangle,
  Calendar,
  Euro,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react';
import adminService from '../../services/admin.service';
import { AdminSubscription, SubscriptionStatus } from '../../types';
import Avatar from '../../components/ui/Avatar';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import Spinner from '../../components/ui/Spinner';
import { formatDate } from '../../lib/format';
import { toast } from '../../components/ui/Toast';

const STATUS_LABELS: Record<SubscriptionStatus, string> = {
  ACTIVE: 'Activa',
  PAST_DUE: 'Pago vencido',
  CANCELED: 'Cancelada',
  INCOMPLETE: 'Incompleta',
  INCOMPLETE_EXPIRED: 'Expirada',
  TRIALING: 'En prueba',
  UNPAID: 'Sin pagar',
};

const STATUS_STYLES: Record<SubscriptionStatus, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  PAST_DUE: 'bg-red-50 text-red-700 border-red-200',
  CANCELED: 'bg-surface-100 text-surface-600 border-surface-200',
  INCOMPLETE: 'bg-amber-50 text-amber-700 border-amber-200',
  INCOMPLETE_EXPIRED: 'bg-surface-100 text-surface-500 border-surface-200',
  TRIALING: 'bg-blue-50 text-blue-700 border-blue-200',
  UNPAID: 'bg-red-50 text-red-700 border-red-200',
};

const STATUS_ICONS: Record<SubscriptionStatus, React.ElementType> = {
  ACTIVE: CheckCircle2,
  PAST_DUE: AlertTriangle,
  CANCELED: XCircle,
  INCOMPLETE: Clock,
  INCOMPLETE_EXPIRED: XCircle,
  TRIALING: Clock,
  UNPAID: AlertTriangle,
};

export default function AdminSubscriptionsPage() {
  const [subs, setSubs] = useState<AdminSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<{
    page: number;
    limit: number;
    search?: string;
    status?: SubscriptionStatus;
  }>({ page: 1, limit: 25 });
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [searchInput, setSearchInput] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  function load() {
    setLoading(true);
    adminService
      .listSubscriptions(filters)
      .then((res) => {
        setSubs(res.items);
        setPagination({
          page: res.pagination.page,
          totalPages: res.pagination.totalPages,
          total: res.pagination.total,
        });
      })
      .catch(() => toast.error('Error', 'No se pudieron cargar las suscripciones'))
      .finally(() => setLoading(false));
  }

  useEffect(load, [filters]); // eslint-disable-line react-hooks/exhaustive-deps

  function applySearch(e: React.FormEvent) {
    e.preventDefault();
    setFilters((f) => ({ ...f, search: searchInput || undefined, page: 1 }));
  }

  function setStatus(status?: SubscriptionStatus) {
    setFilters((f) => ({ ...f, status, page: 1 }));
  }

  // Aggregate stats from current page (visual cue, no extra fetch)
  const totalActive = subs.filter((s) => s.status === 'ACTIVE').length;
  const totalRevenue = subs
    .filter((s) => s.status === 'ACTIVE')
    .reduce((sum, s) => sum + s.priceEur, 0);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-surface-900 flex items-center gap-2">
            <Crown className="w-7 h-7 text-amber-500" />
            Suscripciones Premium
          </h1>
          <p className="text-surface-600 mt-1 text-sm">
            Gestión de planes Premium · 4,99 €/mes
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {totalActive} activas en pantalla
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 text-xs font-semibold border border-amber-200">
            <Euro className="w-3.5 h-3.5" />
            € {totalRevenue.toLocaleString('es-ES', { minimumFractionDigits: 2 })}/mes
          </span>
        </div>
      </header>

      {/* Search + filters */}
      <div className="bg-white border border-surface-200 rounded-2xl p-4 shadow-soft">
        <div className="flex flex-col sm:flex-row gap-3">
          <form onSubmit={applySearch} className="flex-1 flex gap-2">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Buscar por email, username o nombre…"
                className="w-full h-10 pl-10 pr-3 rounded-lg border border-surface-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>
            <Button type="submit" variant="primary">Buscar</Button>
          </form>
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className="inline-flex items-center gap-2 px-3 h-10 rounded-lg border border-surface-200 text-sm font-medium text-surface-700 hover:bg-surface-50 transition-colors"
          >
            <Filter className="w-4 h-4" />
            Filtros
            {filters.status && (
              <span className="ml-1 inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold rounded-full bg-brand-500 text-white">
                1
              </span>
            )}
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t border-surface-200 flex flex-wrap gap-2">
            <FilterPill active={!filters.status} onClick={() => setStatus(undefined)} label="Todas" />
            {(Object.keys(STATUS_LABELS) as SubscriptionStatus[]).map((st) => (
              <FilterPill
                key={st}
                active={filters.status === st}
                onClick={() => setStatus(st)}
                label={STATUS_LABELS[st]}
              />
            ))}
            {filters.search && (
              <button
                onClick={() => {
                  setSearchInput('');
                  setFilters((f) => ({ ...f, search: undefined, page: 1 }));
                }}
                className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700"
              >
                <X className="w-3.5 h-3.5" />
                Limpiar búsqueda
              </button>
            )}
          </div>
        )}
      </div>

      {/* Body */}
      {loading ? (
        <div className="bg-white rounded-2xl py-20 border border-surface-200 shadow-soft">
          <Spinner label="Cargando suscripciones..." />
        </div>
      ) : subs.length === 0 ? (
        <EmptyState
          icon={Crown}
          title="No hay suscripciones"
          description={
            filters.search || filters.status
              ? 'Prueba a quitar los filtros o cambiar la búsqueda.'
              : 'Cuando un usuario active Premium aparecerá aquí.'
          }
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden lg:block bg-white border border-surface-200 rounded-2xl shadow-soft overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-surface-50 border-b border-surface-200">
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-surface-500">
                  <th className="px-5 py-3">Usuario</th>
                  <th className="px-3 py-3">Estado</th>
                  <th className="px-3 py-3">Periodo actual</th>
                  <th className="px-3 py-3">Próximo cobro</th>
                  <th className="px-3 py-3">Importe</th>
                  <th className="px-3 py-3 text-right">Stripe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {subs.map((s) => (
                  <SubscriptionRow key={s.id} sub={s} />
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="lg:hidden space-y-3">
            {subs.map((s) => (
              <SubscriptionCard key={s.id} sub={s} />
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-surface-500">
                Página <span className="font-semibold text-surface-900">{pagination.page}</span> de{' '}
                <span className="font-semibold text-surface-900">{pagination.totalPages}</span> ·{' '}
                {pagination.total} suscripciones
              </p>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
                >
                  Anterior
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Subcomponents ──────────────────────────────────────────────────────────

function FilterPill({
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
      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
        active
          ? 'bg-brand-500 text-white'
          : 'bg-surface-100 text-surface-700 hover:bg-surface-200'
      }`}
    >
      {label}
    </button>
  );
}

function StatusBadge({ status, cancelAtPeriodEnd }: { status: SubscriptionStatus; cancelAtPeriodEnd?: boolean }) {
  const Icon = STATUS_ICONS[status];
  return (
    <div className="flex flex-col gap-1">
      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold border w-fit ${STATUS_STYLES[status]}`}>
        <Icon className="w-3 h-3" />
        {STATUS_LABELS[status]}
      </span>
      {cancelAtPeriodEnd && status === 'ACTIVE' && (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700">
          <AlertTriangle className="w-3 h-3" />
          Cancelando al final
        </span>
      )}
    </div>
  );
}

function StripeLink({ customerId, subscriptionId }: { customerId: string; subscriptionId: string }) {
  const subUrl = `https://dashboard.stripe.com/test/subscriptions/${subscriptionId}`;
  const custUrl = `https://dashboard.stripe.com/test/customers/${customerId}`;
  return (
    <div className="flex flex-col items-end gap-1">
      <a
        href={subUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
      >
        <ExternalLink className="w-3 h-3" />
        Suscripción
      </a>
      <a
        href={custUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs text-surface-500 hover:text-surface-700"
      >
        <ExternalLink className="w-3 h-3" />
        Cliente
      </a>
    </div>
  );
}

function SubscriptionRow({ sub }: { sub: AdminSubscription }) {
  const name = sub.user.displayName ?? sub.user.username ?? sub.user.email;

  return (
    <tr className="hover:bg-surface-50 transition-colors">
      <td className="px-5 py-3">
        <div className="flex items-center gap-3">
          <Avatar src={sub.user.avatarUrl} name={name} size="sm" />
          <div className="min-w-0">
            <p className="font-semibold text-surface-900 truncate">{name}</p>
            <p className="text-xs text-surface-500 truncate">{sub.user.email}</p>
          </div>
        </div>
      </td>
      <td className="px-3 py-3">
        <StatusBadge status={sub.status} cancelAtPeriodEnd={sub.cancelAtPeriodEnd} />
      </td>
      <td className="px-3 py-3 text-surface-700 text-xs">
        <div>{formatDate(sub.currentPeriodStart)}</div>
        <div className="text-surface-500">→ {formatDate(sub.currentPeriodEnd)}</div>
      </td>
      <td className="px-3 py-3 text-surface-700 text-xs">
        {sub.status === 'ACTIVE' && !sub.cancelAtPeriodEnd ? (
          <span className="inline-flex items-center gap-1">
            <Calendar className="w-3 h-3 text-surface-400" />
            {formatDate(sub.currentPeriodEnd)}
          </span>
        ) : sub.canceledAt ? (
          <span className="text-surface-400">
            Cancelada {formatDate(sub.canceledAt)}
          </span>
        ) : (
          <span className="text-surface-400">—</span>
        )}
      </td>
      <td className="px-3 py-3 font-bold text-surface-900 text-sm tabular-nums">
        € {sub.priceEur.toFixed(2)}
        <span className="block text-xs font-normal text-surface-500">/mes</span>
      </td>
      <td className="px-3 py-3 text-right">
        <StripeLink customerId={sub.stripeCustomerId} subscriptionId={sub.stripeSubscriptionId} />
      </td>
    </tr>
  );
}

function SubscriptionCard({ sub }: { sub: AdminSubscription }) {
  const name = sub.user.displayName ?? sub.user.username ?? sub.user.email;

  return (
    <div className="bg-white border border-surface-200 rounded-2xl p-4 shadow-soft">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar src={sub.user.avatarUrl} name={name} size="sm" />
          <div className="min-w-0">
            <p className="font-semibold text-surface-900 truncate">{name}</p>
            <p className="text-xs text-surface-500 truncate">{sub.user.email}</p>
          </div>
        </div>
        <StatusBadge status={sub.status} cancelAtPeriodEnd={sub.cancelAtPeriodEnd} />
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="bg-surface-50 rounded-lg p-2">
          <p className="text-[10px] uppercase tracking-wide text-surface-500 font-semibold">Periodo</p>
          <p className="text-surface-900 font-medium mt-0.5">{formatDate(sub.currentPeriodStart)}</p>
          <p className="text-surface-500">→ {formatDate(sub.currentPeriodEnd)}</p>
        </div>
        <div className="bg-amber-50 rounded-lg p-2">
          <p className="text-[10px] uppercase tracking-wide text-amber-700 font-semibold">Importe</p>
          <p className="text-surface-900 font-bold mt-0.5">€ {sub.priceEur.toFixed(2)}/mes</p>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-surface-100 flex items-center justify-between">
        <a
          href={`https://dashboard.stripe.com/test/subscriptions/${sub.stripeSubscriptionId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
        >
          <ExternalLink className="w-3 h-3" />
          Ver en Stripe
        </a>
      </div>
    </div>
  );
}
