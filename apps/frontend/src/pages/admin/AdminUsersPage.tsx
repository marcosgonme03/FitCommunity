import { useEffect, useState } from 'react';
import {
  Search, Ban, Trash2, ShieldCheck, ShieldOff, Filter, X, MessageSquare, Crown,
  ArrowUp, ArrowDown, ArrowUpDown, BadgeCheck, Shield, Download, Users as UsersIcon,
  AlertTriangle, Activity, LogOut,
} from 'lucide-react';
import adminService from '../../services/admin.service';
import { AdminUserListItem, UserStatus } from '../../types';
import type { UsersSummary } from '../../services/admin.service';
import Avatar from '../../components/ui/Avatar';
import Button from '../../components/ui/Button';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Modal from '../../components/ui/Modal';
import EmptyState from '../../components/ui/EmptyState';
import Spinner from '../../components/ui/Spinner';
import UserDetailDrawer from '../../components/admin/UserDetailDrawer';
import { formatDate } from '../../lib/format';
import { toast } from '../../components/ui/Toast';

const STATUS_LABELS: Record<UserStatus, string> = {
  ACTIVE: 'Activo',
  INACTIVE: 'Inactivo',
  BANNED: 'Baneado',
  PENDING_VERIFICATION: 'Sin verificar',
};

const STATUS_COLORS: Record<UserStatus, string> = {
  ACTIVE: 'bg-success-100 text-success-700 border-success-200',
  INACTIVE: 'bg-surface-100 text-surface-600 border-surface-200',
  BANNED: 'bg-red-100 text-red-700 border-red-200',
  PENDING_VERIFICATION: 'bg-amber-100 text-amber-700 border-amber-200',
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<{
    page: number;
    limit: number;
    search?: string;
    status?: UserStatus;
    isPremium?: boolean;
    sortBy?: 'createdAt' | 'workouts' | 'lastLogin';
    sortDir?: 'asc' | 'desc';
  }>({ page: 1, limit: 25, sortBy: 'createdAt', sortDir: 'desc' });
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [searchInput, setSearchInput] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Resumen agregado
  const [summary, setSummary] = useState<UsersSummary | null>(null);

  // Drawer de detalle
  const [detailUserId, setDetailUserId] = useState<string | null>(null);

  // CSV export state
  const [exporting, setExporting] = useState(false);

  // Force logout state
  const [forceLogoutUser, setForceLogoutUser] = useState<AdminUserListItem | null>(null);
  const [forceLogoutLoading, setForceLogoutLoading] = useState(false);

  const [confirmBan, setConfirmBan] = useState<AdminUserListItem | null>(null);
  const [banReason, setBanReason] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<AdminUserListItem | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Direct message state
  const [directMsgUser, setDirectMsgUser] = useState<AdminUserListItem | null>(null);
  const [dmTitle, setDmTitle] = useState('');
  const [dmBody, setDmBody] = useState('');
  const [dmLoading, setDmLoading] = useState(false);

  function load() {
    setLoading(true);
    adminService
      .listUsers(filters)
      .then((res) => {
        setUsers(res.items);
        setPagination({
          page: res.pagination.page,
          totalPages: res.pagination.totalPages,
          total: res.pagination.total,
        });
      })
      .catch(() => toast.error('Error', 'No se pudieron cargar los usuarios'))
      .finally(() => setLoading(false));
  }

  function loadSummary() {
    adminService.getUsersSummary().then(setSummary).catch(() => undefined);
  }

  useEffect(load, [filters]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(loadSummary, []);

  /** Hace toggle del orden por una columna: si ya estaba sorteando por ahí, alterna asc/desc */
  function toggleSort(column: 'createdAt' | 'workouts' | 'lastLogin') {
    setFilters((f) => {
      if (f.sortBy === column) {
        return { ...f, sortDir: f.sortDir === 'asc' ? 'desc' : 'asc', page: 1 };
      }
      return { ...f, sortBy: column, sortDir: 'desc', page: 1 };
    });
  }

  function sortIcon(column: 'createdAt' | 'workouts' | 'lastLogin') {
    if (filters.sortBy !== column) return <ArrowUpDown className="w-3 h-3 opacity-40" />;
    return filters.sortDir === 'asc'
      ? <ArrowUp className="w-3 h-3" />
      : <ArrowDown className="w-3 h-3" />;
  }

  async function handleExportCsv() {
    if (exporting) return;
    setExporting(true);
    try {
      await adminService.exportUsersCsv({
        search: filters.search,
        status: filters.status,
        isPremium: filters.isPremium,
      });
      toast.success('Descarga iniciada');
    } catch {
      toast.error('Error', 'No se pudo exportar CSV');
    } finally {
      setExporting(false);
    }
  }

  async function handleForceLogout() {
    if (!forceLogoutUser) return;
    setForceLogoutLoading(true);
    try {
      const r = await adminService.forceLogoutUser(forceLogoutUser.id);
      toast.success('Sesiones cerradas', `${r.sessionsRevoked} sesiones revocadas`);
      setForceLogoutUser(null);
    } catch {
      toast.error('Error', 'No se pudieron cerrar las sesiones');
    } finally {
      setForceLogoutLoading(false);
    }
  }

  function applySearch(e: React.FormEvent) {
    e.preventDefault();
    setFilters((f) => ({ ...f, search: searchInput || undefined, page: 1 }));
  }

  async function handleBan() {
    if (!confirmBan) return;
    setActionLoading(true);
    try {
      await adminService.banUser(confirmBan.id, banReason || 'Sin motivo especificado');
      toast.success('Usuario baneado');
      setConfirmBan(null);
      setBanReason('');
      load();
      loadSummary();
    } catch {
      toast.error('Error', 'No se pudo banear');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleUnban(user: AdminUserListItem) {
    try {
      await adminService.unbanUser(user.id);
      toast.success('Usuario desbaneado');
      load();
    } catch {
      toast.error('Error', 'No se pudo desbanear');
    }
  }

  async function handleTogglePremium(user: AdminUserListItem) {
    const next = !user.isPremium;
    const confirmMsg = next
      ? `¿Activar Premium manualmente a ${user.displayName ?? user.email}? Esto NO crea suscripción Stripe, solo activa el flag.`
      : `¿Quitar Premium a ${user.displayName ?? user.email}? Si tiene suscripción Stripe activa, esto causará desincronización temporal hasta el siguiente webhook.`;
    if (!confirm(confirmMsg)) return;
    try {
      await adminService.setUserPremium(user.id, next);
      toast.success(next ? 'Premium activado' : 'Premium revocado');
      load();
    } catch {
      toast.error('Error', 'No se pudo cambiar el estado premium');
    }
  }

  async function handleDirectMessage() {
    if (!directMsgUser) return;
    setDmLoading(true);
    try {
      await adminService.sendDirectMessage(directMsgUser.id, dmTitle, dmBody);
      toast.success('Mensaje enviado', `Notificación enviada a ${directMsgUser.displayName ?? directMsgUser.email}`);
      setDirectMsgUser(null);
      setDmTitle('');
      setDmBody('');
    } catch {
      toast.error('Error', 'No se pudo enviar el mensaje');
    } finally {
      setDmLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    setActionLoading(true);
    try {
      await adminService.deleteUser(confirmDelete.id);
      toast.success('Usuario eliminado');
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
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-surface-900">Gestión de usuarios</h1>
          <p className="text-surface-600 mt-1 text-sm">
            {pagination.total > 0
              ? `${pagination.total} ${pagination.total === 1 ? 'usuario encontrado' : 'usuarios encontrados'}`
              : 'Sin resultados'}
          </p>
        </div>
        <Button
          variant="outline"
          leftIcon={<Download className="w-4 h-4" />}
          loading={exporting}
          onClick={handleExportCsv}
        >
          Exportar CSV
        </Button>
      </header>

      {/* Banda de resumen agregado */}
      {summary && (
        <section className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
          <SummaryStat icon={UsersIcon} label="Total" value={summary.total} accent="text-surface-900" />
          <SummaryStat icon={Crown} label="Premium" value={summary.premium} accent="text-amber-600" />
          <SummaryStat icon={Activity} label="Activos 7d" value={summary.active7d} accent="text-emerald-600" />
          <SummaryStat icon={AlertTriangle} label="Sin verificar" value={summary.pending} accent="text-amber-700" />
          <SummaryStat icon={Ban} label="Baneados" value={summary.banned} accent="text-red-600" />
        </section>
      )}

      {/* Filters */}
      <div className="bg-white border border-surface-200 rounded-2xl p-4 shadow-soft">
        <form onSubmit={applySearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Buscar por email, username o nombre..."
              className="input-field pl-10"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            leftIcon={<Filter className="w-4 h-4" />}
            onClick={() => setShowFilters((v) => !v)}
          >
            {filters.status ? STATUS_LABELS[filters.status] : 'Estado'}
          </Button>
          <Button type="submit">Buscar</Button>
        </form>

        {showFilters && (
          <div className="mt-4 pt-4 border-t border-surface-200 space-y-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-surface-500 mb-1.5">Estado</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setFilters({ ...filters, status: undefined, page: 1 })}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all
                              ${!filters.status
                                ? 'bg-brand-100 text-brand-700 border-brand-300'
                                : 'bg-white text-surface-600 border-surface-200 hover:bg-surface-50'}`}
                >
                  Todos
                </button>
                {(Object.keys(STATUS_LABELS) as UserStatus[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setFilters({ ...filters, status: s, page: 1 })}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all
                                ${filters.status === s
                                  ? 'bg-brand-100 text-brand-700 border-brand-300'
                                  : 'bg-white text-surface-600 border-surface-200 hover:bg-surface-50'}`}
                  >
                    {STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-surface-500 mb-1.5">Plan</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setFilters({ ...filters, isPremium: undefined, page: 1 })}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all
                              ${filters.isPremium === undefined
                                ? 'bg-brand-100 text-brand-700 border-brand-300'
                                : 'bg-white text-surface-600 border-surface-200 hover:bg-surface-50'}`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setFilters({ ...filters, isPremium: true, page: 1 })}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all inline-flex items-center gap-1
                              ${filters.isPremium === true
                                ? 'bg-amber-100 text-amber-700 border-amber-300'
                                : 'bg-white text-surface-600 border-surface-200 hover:bg-surface-50'}`}
                >
                  <Crown className="w-3 h-3" /> Premium
                </button>
                <button
                  onClick={() => setFilters({ ...filters, isPremium: false, page: 1 })}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all
                              ${filters.isPremium === false
                                ? 'bg-brand-100 text-brand-700 border-brand-300'
                                : 'bg-white text-surface-600 border-surface-200 hover:bg-surface-50'}`}
                >
                  Free
                </button>
              </div>
            </div>
            {(filters.status || filters.isPremium !== undefined) && (
              <button
                onClick={() => setFilters({ ...filters, status: undefined, isPremium: undefined, page: 1 })}
                className="text-xs text-surface-500 hover:text-surface-900 inline-flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                Limpiar todos los filtros
              </button>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-surface-200 rounded-2xl shadow-soft overflow-hidden">
        {loading ? (
          <div className="p-12">
            <Spinner label="Cargando usuarios..." />
          </div>
        ) : users.length === 0 ? (
          <EmptyState
            icon={Search}
            title="Sin resultados"
            description="No se encontraron usuarios con esos filtros"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left bg-surface-50 border-b border-surface-200">
                  <th className="px-4 py-3 font-semibold text-surface-500 text-xs uppercase tracking-wider">Usuario</th>
                  <th className="px-4 py-3 font-semibold text-surface-500 text-xs uppercase tracking-wider">Estado</th>
                  <th className="px-4 py-3 font-semibold text-surface-500 text-xs uppercase tracking-wider">Plan</th>
                  <th className="px-4 py-3 font-semibold text-surface-500 text-xs uppercase tracking-wider">Rol</th>
                  <th className="px-4 py-3 font-semibold text-surface-500 text-xs uppercase tracking-wider hidden md:table-cell">
                    <button
                      onClick={() => toggleSort('workouts')}
                      className="inline-flex items-center gap-1 hover:text-surface-900 transition-colors uppercase tracking-wider"
                    >
                      Workouts {sortIcon('workouts')}
                    </button>
                  </th>
                  <th className="px-4 py-3 font-semibold text-surface-500 text-xs uppercase tracking-wider hidden lg:table-cell">
                    <button
                      onClick={() => toggleSort('lastLogin')}
                      className="inline-flex items-center gap-1 hover:text-surface-900 transition-colors uppercase tracking-wider"
                    >
                      Último login {sortIcon('lastLogin')}
                    </button>
                  </th>
                  <th className="px-4 py-3 font-semibold text-surface-500 text-xs uppercase tracking-wider hidden lg:table-cell">
                    <button
                      onClick={() => toggleSort('createdAt')}
                      className="inline-flex items-center gap-1 hover:text-surface-900 transition-colors uppercase tracking-wider"
                    >
                      Registro {sortIcon('createdAt')}
                    </button>
                  </th>
                  <th className="px-4 py-3 font-semibold text-surface-500 text-xs uppercase tracking-wider text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-surface-50 transition-colors">
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setDetailUserId(u.id)}
                        className="flex items-center gap-3 min-w-0 text-left w-full group"
                        title="Ver ficha completa"
                      >
                        <Avatar src={u.avatarUrl} name={u.displayName ?? u.email} size="sm" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <p className="font-semibold text-surface-900 truncate group-hover:text-brand-700 transition-colors">
                              {u.displayName ?? u.username ?? '—'}
                            </p>
                            {u.isEmailVerified && (
                              <span title="Email verificado"><BadgeCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" /></span>
                            )}
                            {u.twoFaEnabled && (
                              <span title="2FA activado"><Shield className="w-3.5 h-3.5 text-emerald-600 shrink-0" /></span>
                            )}
                          </div>
                          <p className="text-xs text-surface-500 truncate">{u.email}</p>
                        </div>
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded border ${STATUS_COLORS[u.status]}`}>
                        {STATUS_LABELS[u.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <PlanBadge user={u} />
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-bold uppercase tracking-wider
                                       ${u.role === 'ADMIN'
                                         ? 'text-brand-600'
                                         : u.role === 'MODERATOR'
                                           ? 'text-purple-600'
                                           : 'text-surface-500'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-surface-700 font-semibold hidden md:table-cell">
                      {u.workoutsCount}
                    </td>
                    <td className="px-4 py-3 text-surface-500 hidden lg:table-cell text-xs">
                      {u.lastLoginAt ? formatDate(u.lastLoginAt) : <span className="italic text-surface-400">Nunca</span>}
                    </td>
                    <td className="px-4 py-3 text-surface-500 hidden lg:table-cell text-xs">
                      {formatDate(u.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => {
                            setDirectMsgUser(u);
                            setDmTitle('');
                            setDmBody('');
                          }}
                          className="p-1.5 rounded-lg text-brand-600 hover:bg-brand-50 transition-colors"
                          title="Mensaje directo"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </button>
                        {u.role !== 'ADMIN' && (
                          <button
                            onClick={() => handleTogglePremium(u)}
                            className={`p-1.5 rounded-lg transition-colors
                                       ${u.isPremium
                                         ? 'text-amber-600 hover:bg-amber-50'
                                         : 'text-surface-400 hover:text-amber-600 hover:bg-amber-50'}`}
                            title={u.isPremium ? 'Quitar Premium' : 'Activar Premium'}
                          >
                            <Crown className={`w-4 h-4 ${u.isPremium ? 'fill-current' : ''}`} />
                          </button>
                        )}
                        {u.role !== 'ADMIN' && (
                          <button
                            onClick={() => setForceLogoutUser(u)}
                            className="p-1.5 rounded-lg text-surface-500 hover:text-purple-600 hover:bg-purple-50 transition-colors"
                            title="Forzar cierre de sesiones"
                          >
                            <LogOut className="w-4 h-4" />
                          </button>
                        )}
                        {u.status === 'BANNED' ? (
                          <button
                            onClick={() => handleUnban(u)}
                            className="p-1.5 rounded-lg text-success-600 hover:bg-success-50 transition-colors"
                            title="Desbanear"
                          >
                            <ShieldCheck className="w-4 h-4" />
                          </button>
                        ) : u.role !== 'ADMIN' ? (
                          <button
                            onClick={() => setConfirmBan(u)}
                            className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 transition-colors"
                            title="Banear"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        ) : (
                          <span className="p-1.5 text-surface-300" title="No se puede banear a otro admin">
                            <ShieldOff className="w-4 h-4" />
                          </span>
                        )}
                        {u.role !== 'ADMIN' && (
                          <button
                            onClick={() => setConfirmDelete(u)}
                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
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

      {/* Ban modal */}
      <Modal
        isOpen={!!confirmBan}
        onClose={() => {
          setConfirmBan(null);
          setBanReason('');
        }}
        title="Banear usuario"
        description={
          confirmBan
            ? `Se va a banear a ${confirmBan.displayName ?? confirmBan.email}. Esta acción cierra todas sus sesiones activas.`
            : ''
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => { setConfirmBan(null); setBanReason(''); }}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleBan} loading={actionLoading}>
              Banear usuario
            </Button>
          </>
        }
      >
        <div>
          <label className="label">Motivo (visible en el audit log)</label>
          <textarea
            value={banReason}
            onChange={(e) => setBanReason(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Ej: Comportamiento abusivo, spam, contenido inapropiado..."
            className="input-field resize-none"
          />
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="¿Eliminar usuario?"
        message={
          confirmDelete
            ? `Vas a eliminar a ${confirmDelete.email} y todos sus datos (workouts, comentarios, follows). Esta acción NO se puede deshacer.`
            : ''
        }
        confirmLabel="Sí, eliminar"
        loading={actionLoading}
      />

      {/* Drawer de detalle de usuario */}
      <UserDetailDrawer
        userId={detailUserId}
        onClose={() => setDetailUserId(null)}
        onChange={() => { load(); loadSummary(); }}
      />

      {/* Confirmación de force logout */}
      <ConfirmDialog
        isOpen={!!forceLogoutUser}
        onClose={() => setForceLogoutUser(null)}
        onConfirm={handleForceLogout}
        title="¿Cerrar todas las sesiones?"
        message={
          forceLogoutUser
            ? `Se revocarán todas las sesiones activas de ${forceLogoutUser.displayName ?? forceLogoutUser.email}. El usuario tendrá que volver a iniciar sesión en todos sus dispositivos. Útil si la cuenta está comprometida.`
            : ''
        }
        confirmLabel="Sí, cerrar sesiones"
        loading={forceLogoutLoading}
      />

      {/* Direct message modal */}
      <Modal
        isOpen={!!directMsgUser}
        onClose={() => { setDirectMsgUser(null); setDmTitle(''); setDmBody(''); }}
        title="Mensaje directo"
        description={directMsgUser ? `Enviar notificación a ${directMsgUser.displayName ?? directMsgUser.email}` : ''}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDirectMsgUser(null)} disabled={dmLoading}>
              Cancelar
            </Button>
            <Button
              onClick={handleDirectMessage}
              loading={dmLoading}
              disabled={dmTitle.trim().length < 3 || dmBody.trim().length < 5}
              leftIcon={<MessageSquare className="w-4 h-4" />}
            >
              Enviar mensaje
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label">Título</label>
            <input
              type="text"
              value={dmTitle}
              onChange={(e) => setDmTitle(e.target.value)}
              placeholder="Ej: Aviso importante"
              maxLength={100}
              className="input-field"
            />
          </div>
          <div>
            <label className="label">Mensaje</label>
            <textarea
              value={dmBody}
              onChange={(e) => setDmBody(e.target.value)}
              rows={4}
              maxLength={500}
              placeholder="Escribe el contenido de la notificación..."
              className="input-field resize-none"
            />
          </div>
          <p className="text-xs text-surface-500">
            El usuario recibirá esta notificación en su campana de notificaciones.
          </p>
        </div>
      </Modal>
    </div>
  );
}

// ─── SummaryStat ────────────────────────────────────────────────────────────
// Tarjeta pequeña que se muestra en la banda de resumen sobre los filtros.

function SummaryStat({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div className="bg-white border border-surface-200 rounded-xl p-3 shadow-soft">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-surface-500 font-bold mb-1">
        <Icon className={`w-3 h-3 ${accent}`} />
        {label}
      </div>
      <p className={`text-xl font-extrabold tabular-nums ${accent}`}>{value}</p>
    </div>
  );
}

// ─── PlanBadge ──────────────────────────────────────────────────────────────
// Indica si el usuario es Premium o Free, y avisa de inconsistencias entre
// el flag is_premium del modelo User y la suscripción activa de Stripe.

function PlanBadge({ user }: { user: AdminUserListItem }) {
  const sub = user.subscription;
  const flagPremium = user.isPremium;

  // Caso 1: tiene suscripción activa (incluye TRIALING / PAST_DUE)
  if (sub && (sub.status === 'ACTIVE' || sub.status === 'TRIALING' || sub.status === 'PAST_DUE')) {
    const isPastDue = sub.status === 'PAST_DUE';
    const isCanceling = sub.cancelAtPeriodEnd;
    return (
      <div className="flex flex-col gap-1">
        <span
          className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded border w-fit
                      ${isPastDue
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : 'bg-gradient-to-r from-amber-50 to-brand-50 text-amber-700 border-amber-300'}`}
          title={
            sub.currentPeriodEnd
              ? `Próxima renovación: ${new Date(sub.currentPeriodEnd).toLocaleDateString('es-ES')}`
              : ''
          }
        >
          <Crown className="w-3 h-3" />
          PREMIUM
          {sub.status === 'TRIALING' && ' · Trial'}
          {isPastDue && ' · Impago'}
        </span>
        {isCanceling && (
          <span className="text-[10px] text-amber-700 font-semibold">
            Cancela al final del periodo
          </span>
        )}
        {!flagPremium && (
          <span
            className="inline-flex items-center gap-1 text-[10px] text-red-600 font-semibold"
            title="Inconsistencia: tiene subscription activa pero is_premium=false en User"
          >
            <AlertTriangle className="w-3 h-3" />
            Flag desincronizado
          </span>
        )}
      </div>
    );
  }

  // Caso 2: flag premium=true pero sin suscripción activa (cuenta de regalo / admin set)
  if (flagPremium) {
    return (
      <span
        className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded border w-fit bg-purple-50 text-purple-700 border-purple-200"
        title="Premium activado manualmente (sin suscripción Stripe)"
      >
        <Crown className="w-3 h-3" />
        PREMIUM · Manual
      </span>
    );
  }

  // Caso 3: free
  return (
    <span className="inline-flex items-center text-xs font-semibold text-surface-500 px-2 py-0.5">
      Free
    </span>
  );
}
