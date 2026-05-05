/**
 * Drawer lateral con la ficha completa de un usuario para el panel admin.
 * Carga los datos al abrirse vía adminService.getUserDetails.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  X, Mail, Shield, ShieldCheck, KeyRound, Crown, Activity, Clock, Flame,
  Users, UserCheck, Calendar, MapPin, Target, Ruler, Weight, BadgeCheck,
  AlertTriangle, ExternalLink, ScrollText, LogOut, Trash2, Ban,
} from 'lucide-react';
import adminService, { UserDetailsResponse } from '../../services/admin.service';
import Avatar from '../ui/Avatar';
import Spinner from '../ui/Spinner';
import Button from '../ui/Button';
import { formatDate, formatTime, formatDuration, formatNumber, formatMinutesAsHours } from '../../lib/format';
import { toast } from '../ui/Toast';

interface Props {
  userId: string | null;
  onClose: () => void;
  /** Callback cuando alguna acción modifica al usuario (force logout, verify, etc.) — refresca el listado externo */
  onChange?: () => void;
}

export default function UserDetailDrawer({ userId, onClose, onChange }: Props) {
  const [data, setData] = useState<UserDetailsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setData(null);
      return;
    }
    setLoading(true);
    adminService
      .getUserDetails(userId)
      .then(setData)
      .catch(() => toast.error('Error', 'No se pudo cargar el usuario'))
      .finally(() => setLoading(false));
  }, [userId]);

  // Cerrar con ESC
  useEffect(() => {
    if (!userId) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [userId, onClose]);

  async function refreshDetails() {
    if (!userId) return;
    const fresh = await adminService.getUserDetails(userId).catch(() => null);
    if (fresh) setData(fresh);
    onChange?.();
  }

  async function handleForceLogout() {
    if (!userId || !data) return;
    if (!confirm('¿Cerrar todas las sesiones activas? El usuario tendrá que volver a iniciar sesión.')) return;
    setActing('logout');
    try {
      const r = await adminService.forceLogoutUser(userId);
      toast.success('Sesiones cerradas', `${r.sessionsRevoked} sesiones revocadas`);
      await refreshDetails();
    } catch {
      toast.error('Error', 'No se pudieron cerrar las sesiones');
    } finally {
      setActing(null);
    }
  }

  async function handleVerifyEmail() {
    if (!userId) return;
    setActing('verify');
    try {
      await adminService.forceVerifyEmail(userId);
      toast.success('Email verificado');
      await refreshDetails();
    } catch {
      toast.error('Error', 'No se pudo verificar');
    } finally {
      setActing(null);
    }
  }

  async function handleTogglePremium() {
    if (!userId || !data) return;
    const next = !data.user.is_premium;
    if (!confirm(next ? '¿Activar Premium manualmente?' : '¿Quitar Premium?')) return;
    setActing('premium');
    try {
      await adminService.setUserPremium(userId, next);
      toast.success(next ? 'Premium activado' : 'Premium revocado');
      await refreshDetails();
    } catch {
      toast.error('Error');
    } finally {
      setActing(null);
    }
  }

  if (!userId) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full sm:w-[600px] max-w-full h-full bg-surface-50 shadow-2xl overflow-y-auto animate-slide-up">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-white border-b border-surface-200 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-surface-900">Ficha de usuario</h2>
            {data?.user.is_premium && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                <Crown className="w-3 h-3" />
                Premium
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-surface-500 hover:text-surface-900 hover:bg-surface-100 transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {loading || !data ? (
          <div className="p-12">
            <Spinner label="Cargando ficha..." />
          </div>
        ) : (
          <div className="p-5 space-y-5">
            {/* ── Identidad ─────────────────────────────────────────── */}
            <Section>
              <div className="flex items-start gap-4">
                <Avatar
                  src={data.user.profile?.avatar_url ?? null}
                  name={data.user.profile?.display_name ?? data.user.email}
                  size="lg"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-xl font-bold text-surface-900 truncate">
                      {data.user.profile?.display_name ?? data.user.profile?.username ?? '—'}
                    </h3>
                    {data.user.is_email_verified && (
                      <BadgeCheck className="w-4 h-4 text-blue-500" />
                    )}
                    {data.user.two_fa_enabled && (
                      <Shield className="w-4 h-4 text-emerald-600" />
                    )}
                  </div>
                  <p className="text-sm text-surface-600 truncate">{data.user.email}</p>
                  {data.user.profile?.username && (
                    <p className="text-xs text-surface-500 mt-0.5">@{data.user.profile.username}</p>
                  )}
                  {data.user.profile?.bio && (
                    <p className="text-sm text-surface-700 mt-2 italic">"{data.user.profile.bio}"</p>
                  )}
                  <div className="flex flex-wrap gap-3 mt-3 text-xs text-surface-600">
                    {data.user.profile?.location && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {data.user.profile.location}
                      </span>
                    )}
                    {data.user.profile?.experience_level && (
                      <span className="inline-flex items-center gap-1">
                        <Activity className="w-3 h-3" />
                        {data.user.profile.experience_level}
                      </span>
                    )}
                    {data.user.profile?.fitness_goal && (
                      <span className="inline-flex items-center gap-1">
                        <Target className="w-3 h-3" />
                        {data.user.profile.fitness_goal}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-3 mt-2 text-xs text-surface-600">
                    {data.user.profile?.height_cm && (
                      <span className="inline-flex items-center gap-1">
                        <Ruler className="w-3 h-3" />
                        {data.user.profile.height_cm} cm
                      </span>
                    )}
                    {data.user.profile?.weight_kg && (
                      <span className="inline-flex items-center gap-1">
                        <Weight className="w-3 h-3" />
                        {data.user.profile.weight_kg} kg
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Estado */}
              {data.user.status === 'BANNED' && (
                <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                  <Ban className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Usuario baneado</p>
                    {data.user.banned_reason && (
                      <p className="text-xs mt-0.5">Motivo: {data.user.banned_reason}</p>
                    )}
                    {data.user.banned_at && (
                      <p className="text-xs">El {formatDate(data.user.banned_at)}</p>
                    )}
                  </div>
                </div>
              )}
            </Section>

            {/* ── Métricas ──────────────────────────────────────────── */}
            <Section title="Métricas">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <MetricCell icon={Activity} label="Workouts" value={String(data.totals.workoutsCount)} />
                <MetricCell icon={Clock} label="Horas" value={formatMinutesAsHours(data.totals.totalMinutes)} />
                <MetricCell icon={Flame} label="Kcal" value={formatNumber(data.totals.totalCalories)} />
                <MetricCell icon={Users} label="Followers" value={String(data.totals.followersCount)} />
              </div>
            </Section>

            {/* ── Cuenta ────────────────────────────────────────────── */}
            <Section title="Cuenta">
              <Row icon={Calendar} label="Registrado" value={formatDate(data.user.created_at)} />
              <Row
                icon={Clock}
                label="Último login"
                value={data.user.last_login_at ? `${formatDate(data.user.last_login_at)} · ${formatTime(data.user.last_login_at)}` : 'Nunca'}
              />
              <Row
                icon={UserCheck}
                label="Sesiones activas"
                value={`${data.activeSessionsCount}`}
              />
              <Row
                icon={Mail}
                label="Email verificado"
                value={data.user.is_email_verified ? 'Sí' : 'No'}
                accent={data.user.is_email_verified ? 'text-emerald-600' : 'text-amber-600'}
              />
              <Row
                icon={Shield}
                label="2FA habilitado"
                value={data.user.two_fa_enabled ? 'Sí' : 'No'}
                accent={data.user.two_fa_enabled ? 'text-emerald-600' : 'text-surface-500'}
              />
              <Row
                icon={KeyRound}
                label="Rol"
                value={data.user.role}
                accent={data.user.role === 'ADMIN' ? 'text-brand-600 font-bold' : ''}
              />
              <Row
                icon={UserCheck}
                label="Onboarding"
                value={data.user.profile?.onboarding_completed ? 'Completado' : 'Pendiente'}
                accent={data.user.profile?.onboarding_completed ? 'text-emerald-600' : 'text-amber-600'}
              />
            </Section>

            {/* ── Suscripciones ─────────────────────────────────────── */}
            {data.subscriptions.length > 0 && (
              <Section title="Suscripciones (histórico)">
                <ul className="space-y-2">
                  {data.subscriptions.map((s) => {
                    const active = s.status === 'ACTIVE' || s.status === 'TRIALING';
                    return (
                      <li
                        key={s.id}
                        className="bg-white border border-surface-200 rounded-lg p-3 text-xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border
                                          ${active
                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                            : s.status === 'PAST_DUE'
                                              ? 'bg-red-50 text-red-700 border-red-200'
                                              : 'bg-surface-100 text-surface-600 border-surface-200'}`}
                            >
                              {s.status}
                            </span>
                            {s.cancel_at_period_end && (
                              <span className="text-[10px] font-semibold text-amber-700">
                                Cancela al final
                              </span>
                            )}
                          </div>
                          {s.stripe_customer_id && (
                            <a
                              href={`https://dashboard.stripe.com/test/customers/${s.stripe_customer_id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-brand-600 hover:text-brand-700 inline-flex items-center gap-1 text-[10px] font-semibold"
                            >
                              Stripe <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-surface-600">
                          {s.current_period_start && (
                            <span>Inicio: {formatDate(s.current_period_start)}</span>
                          )}
                          {s.current_period_end && (
                            <span>Fin: {formatDate(s.current_period_end)}</span>
                          )}
                          {s.canceled_at && (
                            <span>Cancelado: {formatDate(s.canceled_at)}</span>
                          )}
                          <span>Creada: {formatDate(s.created_at)}</span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </Section>
            )}

            {/* ── Últimos entrenamientos ───────────────────────────── */}
            {data.recentWorkouts.length > 0 && (
              <Section title="Últimos entrenamientos" footer={
                <Link
                  to={`/u/${data.user.profile?.username ?? data.user.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold text-brand-600 hover:text-brand-700 inline-flex items-center gap-1"
                >
                  Ver perfil completo <ExternalLink className="w-3 h-3" />
                </Link>
              }>
                <ul className="divide-y divide-surface-100">
                  {data.recentWorkouts.map((w) => (
                    <li key={w.id} className="py-2 flex items-center gap-3 text-sm">
                      <div className="w-7 h-7 rounded-md bg-brand-50 text-brand-700 flex items-center justify-center shrink-0">
                        <Activity className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-surface-900 truncate">{w.title}</p>
                        <p className="text-xs text-surface-500">
                          {formatDate(w.workout_date)} · {formatDuration(w.duration_min)}
                          {w.calories ? ` · ${w.calories} kcal` : ''}
                        </p>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-surface-500">
                        {w.intensity}
                      </span>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {/* ── Audit trail ──────────────────────────────────────── */}
            {data.auditTrail.length > 0 && (
              <Section title={`Audit log (${data.auditTrail.length})`}>
                <ul className="divide-y divide-surface-100 max-h-64 overflow-y-auto">
                  {data.auditTrail.map((log) => (
                    <li key={log.id} className="py-2 text-xs">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-surface-100 text-surface-700 border border-surface-200">
                          {log.action}
                        </span>
                        <span className="text-surface-500">
                          por <span className="font-semibold text-surface-700">
                            {log.admin.profile?.display_name ?? log.admin.email}
                          </span>
                        </span>
                        <span className="text-surface-400 ml-auto">
                          {formatDate(log.created_at)} {formatTime(log.created_at)}
                        </span>
                      </div>
                      {log.metadata != null && (
                        <p className="text-[10px] text-surface-500 mt-1 font-mono break-all">
                          {JSON.stringify(log.metadata)}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {/* ── Acciones admin ───────────────────────────────────── */}
            <Section title="Acciones rápidas">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {!data.user.is_email_verified && (
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<ShieldCheck className="w-4 h-4" />}
                    onClick={handleVerifyEmail}
                    loading={acting === 'verify'}
                  >
                    Verificar email manualmente
                  </Button>
                )}
                {data.activeSessionsCount > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<LogOut className="w-4 h-4" />}
                    onClick={handleForceLogout}
                    loading={acting === 'logout'}
                  >
                    Cerrar todas las sesiones
                  </Button>
                )}
                {data.user.role !== 'ADMIN' && (
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<Crown className="w-4 h-4" />}
                    onClick={handleTogglePremium}
                    loading={acting === 'premium'}
                  >
                    {data.user.is_premium ? 'Quitar Premium' : 'Activar Premium'}
                  </Button>
                )}
              </div>

              {data.user.role === 'ADMIN' && (
                <p className="text-xs text-surface-500 mt-2 inline-flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Las acciones destructivas no aplican a otros admins.
                </p>
              )}
            </Section>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Subcomponents ────────────────────────────────────────────────────────────

function Section({
  title,
  footer,
  children,
}: {
  title?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white border border-surface-200 rounded-2xl p-4 shadow-soft">
      {title && (
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-surface-500">{title}</h4>
          {footer}
        </div>
      )}
      {children}
    </section>
  );
}

function MetricCell({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-surface-50 border border-surface-200 rounded-lg p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-surface-500 font-bold mb-1">
        <Icon className="w-3 h-3" />
        {label}
      </div>
      <p className="text-lg font-bold text-surface-900 tabular-nums">{value}</p>
    </div>
  );
}

function Row({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="inline-flex items-center gap-2 text-surface-600">
        <Icon className="w-4 h-4 shrink-0" />
        {label}
      </span>
      <span className={`text-surface-900 ${accent ?? ''}`}>{value}</span>
    </div>
  );
}

// Avoid unused-import warning if some icons not used in all branches
void [Trash2, ScrollText];
