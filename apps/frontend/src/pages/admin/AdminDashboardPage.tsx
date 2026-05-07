import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Activity,
  Flame,
  Heart,
  MessageCircle,
  TrendingUp,
  Shield,
  AlertTriangle,
  Crown,
  Euro,
  Sparkles,
  Bot,
  CheckCircle2,
  XCircle,
  Server,
  ArrowUpRight,
  Dumbbell,
  FileDown,
} from 'lucide-react';
import adminService, {
  UsersGrowthPoint,
  WorkoutsStatsBucket,
  RevenueGrowthPoint,
  SystemHealth,
} from '../../services/admin.service';
import { AdminOverview } from '../../types';
import StatCard from '../../components/ui/StatCard';
import Spinner from '../../components/ui/Spinner';
import { readCache, staleWhileRevalidate } from '../../lib/cache';
import LineChart from '../../components/charts/LineChart';
import BarChart from '../../components/charts/BarChart';
import DonutChart from '../../components/charts/DonutChart';
import LiveActivityFeed from '../../components/admin/LiveActivityFeed';
import { MUSCLE_LABELS, MUSCLE_COLORS } from '../../lib/muscles';
import { formatNumber, formatMinutesAsHours } from '../../lib/format';
import type { MuscleGroup } from '../../types';

interface CachedWorkoutsStats {
  byDay: WorkoutsStatsBucket[];
  byMuscle: Array<{ muscle: string; count: number }>;
}

export default function AdminDashboardPage() {
  // Hidratación inicial desde cache: si el admin abrió antes el dashboard,
  // el render es instantáneo con los últimos datos vistos. Si no, arrancamos
  // con valores vacíos y cargamos en paralelo sin bloquear el layout.
  const [overview, setOverview] = useState<AdminOverview | null>(
    () => readCache<AdminOverview>('admin:overview'),
  );
  const [growth, setGrowth] = useState<UsersGrowthPoint[]>(
    () => readCache<UsersGrowthPoint[]>('admin:growth') ?? [],
  );
  const cachedWs = readCache<CachedWorkoutsStats>('admin:workouts-stats');
  const [workoutsByDay, setWorkoutsByDay] = useState<WorkoutsStatsBucket[]>(cachedWs?.byDay ?? []);
  const [byMuscle, setByMuscle] = useState<Array<{ muscle: string; count: number }>>(
    cachedWs?.byMuscle ?? [],
  );
  const [revenue, setRevenue] = useState<RevenueGrowthPoint[]>(
    () => readCache<RevenueGrowthPoint[]>('admin:revenue') ?? [],
  );
  // Sólo bloqueamos con spinner si NO había nada en cache — primer visitante
  const hadCache = !!overview;
  const [loading, setLoading] = useState(!hadCache);
  const [health, setHealth] = useState<SystemHealth | null>(null);

  // Carga independiente de cada panel — ya no bloqueamos con Promise.all.
  // Si una llamada tarda, las otras se pintan igual. Si todas están en cache,
  // el render es inmediato y solo refrescamos los datos en background.
  useEffect(() => {
    let alive = true;
    let pending = 4;
    const onSettled = () => {
      pending--;
      if (pending === 0 && alive) setLoading(false);
    };

    void staleWhileRevalidate('admin:overview', () => adminService.overview(), (v) => {
      if (alive) setOverview(v);
    }).finally(onSettled);

    void staleWhileRevalidate(
      'admin:growth',
      () => adminService.usersGrowth(30).then((r) => r.points),
      (v) => { if (alive) setGrowth(v); },
    ).finally(onSettled);

    void staleWhileRevalidate(
      'admin:workouts-stats',
      () => adminService.workoutsStats(30),
      (v) => {
        if (!alive) return;
        setWorkoutsByDay(v.byDay);
        setByMuscle(v.byMuscle ?? []);
      },
    ).finally(onSettled);

    void staleWhileRevalidate(
      'admin:revenue',
      () => adminService.revenueGrowth(30).then((r) => r.points),
      (v) => { if (alive) setRevenue(v); },
    ).finally(onSettled);

    return () => { alive = false; };
  }, []);

  // Health check — fetches immediately and refreshes every 30 s
  useEffect(() => {
    let alive = true;
    const fetchHealth = () =>
      adminService.systemHealth()
        .then((h) => { if (alive) setHealth(h); })
        .catch(() => undefined);

    fetchHealth();
    const interval = setInterval(fetchHealth, 30_000);
    return () => { alive = false; clearInterval(interval); };
  }, []);

  // Sólo mostramos el spinner full-screen al usuario que entra POR PRIMERA
  // VEZ y no tenía ningún dato en cache. Cualquier visita posterior (que es
  // el caso del 99% del tiempo) ve la página completa al instante.
  if (loading && !overview) return <Spinner fullScreen label="Cargando analytics..." />;
  if (!overview) return <Spinner fullScreen label="Cargando analytics..." />;

  const top5Muscles = byMuscle.slice(0, 5);
  const totalRevenue30d = revenue.reduce((sum, r) => sum + r.revenueEur, 0);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-surface-900">Dashboard Admin</h1>
          <p className="text-surface-600 mt-1 text-sm">
            Visión global de la plataforma · datos en tiempo real
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <Pill icon={Users} text={`${overview.users.total} usuarios`} accent="brand" />
          <Pill icon={Crown} text={`${overview.premium.activeSubscriptions} premium`} accent="amber" />
          <Pill icon={Activity} text={`${overview.workouts.total} workouts`} accent="emerald" />
        </div>
      </header>

      {/* ─── System status ─────────────────────────────────────────────── */}
      <SystemStatusBanner system={overview.system} health={health} />

      {/* ─── KPIs principales ─────────────────────────────────────────── */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Usuarios totales"
          value={overview.users.total}
          hint={`+${overview.users.newThisMonth} este mes`}
          accent="brand"
        />
        <StatCard
          icon={TrendingUp}
          label="Activos (7d)"
          value={overview.users.activeLast7Days}
          hint={`${Math.round((overview.users.activeLast7Days / Math.max(overview.users.total, 1)) * 100)}% del total`}
          accent="accent"
        />
        <StatCard
          icon={Activity}
          label="Workouts totales"
          value={overview.workouts.total}
          hint={`${overview.workouts.thisMonth} este mes`}
          accent="orange"
        />
        <StatCard
          icon={Flame}
          label="Calorías quemadas"
          value={formatNumber(overview.workouts.totalCalories)}
          hint={formatMinutesAsHours(overview.workouts.totalMinutes, 0) + ' totales'}
          accent="red"
        />
      </section>

      {/* ─── Live activity feed ─────────────────────────────────────────── */}
      <LiveActivityFeed limit={20} />

      {/* ─── Premium / Ingresos ────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-amber-50 via-white to-orange-50 border border-amber-200 rounded-2xl p-5 sm:p-6 shadow-soft">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm">
              <Crown className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-surface-900">Premium · Suscripciones</h2>
              <p className="text-xs text-surface-600">
                Plan a {overview.premium.priceEur.toFixed(2)} €/mes
              </p>
            </div>
          </div>
          <Link
            to="/admin/subscriptions"
            className="hidden sm:inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700 transition-colors"
          >
            Ver todas
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <PremiumCard
            label="MRR"
            value={`€ ${overview.premium.mrrEur.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`}
            hint={`ARR ≈ € ${overview.premium.arrEur.toLocaleString('es-ES', { minimumFractionDigits: 0 })}`}
            icon={Euro}
            highlight
          />
          <PremiumCard
            label="Subs activas"
            value={overview.premium.activeSubscriptions.toString()}
            hint={`+${overview.premium.newPremiumThisMonth} este mes`}
            icon={CheckCircle2}
          />
          <PremiumCard
            label="Conversión"
            value={`${overview.premium.conversionRate.toFixed(1)} %`}
            hint={`${overview.premium.totalPremiumUsers}/${overview.users.total} usuarios`}
            icon={TrendingUp}
          />
          <PremiumCard
            label="Churn 30d"
            value={`${overview.premium.churnRate30d.toFixed(1)} %`}
            hint={`${overview.premium.canceledLast30Days} bajas`}
            icon={overview.premium.churnRate30d > 10 ? AlertTriangle : Heart}
            warning={overview.premium.churnRate30d > 10}
          />
        </div>

        {/* Subs en estados problemáticos */}
        {(overview.premium.pastDueSubscriptions > 0 || overview.premium.cancelingSubscriptions > 0) && (
          <div className="mt-4 flex flex-wrap gap-3">
            {overview.premium.pastDueSubscriptions > 0 && (
              <div className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg bg-red-100 text-red-700 font-semibold">
                <AlertTriangle className="w-3.5 h-3.5" />
                {overview.premium.pastDueSubscriptions} con pago vencido
              </div>
            )}
            {overview.premium.cancelingSubscriptions > 0 && (
              <div className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg bg-amber-100 text-amber-700 font-semibold">
                <XCircle className="w-3.5 h-3.5" />
                {overview.premium.cancelingSubscriptions} cancelando al final del periodo
              </div>
            )}
          </div>
        )}
      </section>

      {/* ─── Charts: revenue + crecimiento ─────────────────────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white border border-surface-200 rounded-2xl p-5 shadow-soft">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-bold text-surface-900">Ingresos · nuevas suscripciones</h2>
              <p className="text-xs text-surface-500 mt-0.5">Últimos 30 días</p>
            </div>
            <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-1 rounded">
              € {totalRevenue30d.toLocaleString('es-ES', { minimumFractionDigits: 2 })} en 30d
            </span>
          </div>
          <BarChart
            data={revenue.map((r) => ({
              label: r.date.slice(5),
              value: r.revenueEur,
              color: '#f59e0b',
            }))}
            height={200}
            formatter={(n) => `€ ${n.toFixed(2)}`}
          />
        </div>

        <div className="bg-white border border-surface-200 rounded-2xl p-5 shadow-soft">
          <h2 className="font-bold text-surface-900 mb-3">Top grupos musculares</h2>
          {top5Muscles.length === 0 ? (
            <p className="text-center text-sm text-surface-500 py-12">Sin datos</p>
          ) : (
            <>
              <div className="flex justify-center mb-4">
                <DonutChart
                  data={top5Muscles.map((s) => ({
                    label: MUSCLE_LABELS[s.muscle as MuscleGroup] ?? s.muscle,
                    value: s.count,
                    color: MUSCLE_COLORS[s.muscle as MuscleGroup]?.hex ?? '#64748b',
                  }))}
                  size={140}
                  thickness={22}
                  centerLabel={String(top5Muscles.reduce((sum, s) => sum + s.count, 0))}
                  centerSubLabel="Top 5"
                />
              </div>
              <div className="space-y-2">
                {top5Muscles.map((s) => (
                  <div key={s.muscle} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: MUSCLE_COLORS[s.muscle as MuscleGroup]?.hex ?? '#64748b' }}
                      />
                      <span className="text-surface-700 truncate">
                        {MUSCLE_LABELS[s.muscle as MuscleGroup] ?? s.muscle}
                      </span>
                    </div>
                    <span className="text-surface-900 font-semibold shrink-0">{s.count}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* ─── Crecimiento usuarios + workouts/día ─────────────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-surface-200 rounded-2xl p-5 shadow-soft">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-bold text-surface-900">Crecimiento de usuarios</h2>
              <p className="text-xs text-surface-500 mt-0.5">Últimos 30 días</p>
            </div>
            <span className="text-xs font-bold text-brand-600 bg-brand-50 px-2 py-1 rounded">
              +{overview.users.newThisMonth} este mes
            </span>
          </div>
          <LineChart
            data={growth.map((p) => ({
              label: p.date.slice(5),
              value: p.count,
            }))}
            height={200}
            color="#f97316"
          />
        </div>

        <div className="bg-white border border-surface-200 rounded-2xl p-5 shadow-soft">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-bold text-surface-900">Entrenamientos creados</h2>
              <p className="text-xs text-surface-500 mt-0.5">Últimos 30 días</p>
            </div>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
              {overview.workouts.thisMonth} este mes
            </span>
          </div>
          <BarChart
            data={workoutsByDay.map((w) => ({
              label: w.date.slice(5),
              value: w.count,
              color: '#10b981',
            }))}
            height={200}
            formatter={(n) => `${n} workouts`}
          />
        </div>
      </section>

      {/* ─── Engagement + IA + Estado ─────────────────────────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card title="Engagement" icon={Heart}>
          <Row icon={Heart} label="Likes totales" value={formatNumber(overview.engagement.totalLikes)} accent="text-red-500" />
          <Row icon={MessageCircle} label="Comentarios" value={formatNumber(overview.engagement.totalComments)} accent="text-brand-600" />
          <Row icon={Activity} label="Workouts/usuario" value={overview.engagement.avgWorkoutsPerUser.toFixed(1)} accent="text-emerald-600" />
        </Card>

        <Card title="Estado de usuarios" icon={Shield}>
          <Row icon={CheckCircle2} label="Activos" value={overview.users.active.toString()} accent="text-emerald-600" />
          <Row icon={AlertTriangle} label="Pendientes verificación" value={overview.users.pendingVerification.toString()} accent="text-amber-600" />
          <Row icon={XCircle} label="Baneados" value={overview.users.banned.toString()} accent="text-red-500" />
        </Card>

        <Card title="Uso de IA Premium" icon={Sparkles} accent="amber">
          <Row icon={Bot} label="Conversaciones" value={formatNumber(overview.ai.conversationsTotal)} accent="text-amber-600" hint={`+${overview.ai.conversationsThisMonth} este mes`} />
          <Row icon={Dumbbell} label="Rutinas generadas" value={formatNumber(overview.ai.generatedRoutines)} accent="text-orange-600" />
          <Row icon={Activity} label="Planes nutrición" value={formatNumber(overview.ai.nutritionPlans)} accent="text-emerald-600" />
          {overview.ai.pdfDownloadsTotal !== undefined && (
            <Row
              icon={FileDown}
              label="PDFs descargados"
              value={formatNumber(overview.ai.pdfDownloadsTotal)}
              accent="text-blue-600"
              hint={`${overview.ai.pdfDownloadsRoutines ?? 0} rutinas · ${overview.ai.pdfDownloadsNutrition ?? 0} dietas`}
            />
          )}
        </Card>
      </section>

      {/* ─── Engagement de "Rutina activa" ──────────────────────────────── */}
      {overview.ai.activeRoutines !== undefined && (
        <section className="bg-gradient-to-br from-brand-50 via-white to-amber-50 border border-brand-200 rounded-2xl p-5 shadow-soft">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-amber-500 flex items-center justify-center shadow-sm">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-surface-900">Engagement: rutinas activas</h3>
                <p className="text-xs text-surface-600">
                  Usuarios premium que están siguiendo una rutina IA día a día
                </p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <PremiumCard
              label="Rutinas activas"
              value={overview.ai.activeRoutines.toString()}
              hint="Usuarios siguiendo una rutina"
              icon={Sparkles}
              highlight
            />
            <PremiumCard
              label="Adopción premium"
              value={`${(overview.ai.activeRoutineAdoptionRate ?? 0).toFixed(1)} %`}
              hint={`${overview.ai.activeRoutines}/${overview.premium.totalPremiumUsers} usuarios premium`}
              icon={TrendingUp}
            />
            <PremiumCard
              label="Día medio"
              value={`Día ${((overview.ai.avgRoutineDayProgress ?? 0) + 1).toFixed(1)}`}
              hint="Posición media en la rotación"
              icon={Activity}
            />
          </div>
        </section>
      )}

      {/* ─── Hoy ────────────────────────────────────────────────────── */}
      <section className="bg-white border border-surface-200 rounded-2xl p-5 shadow-soft">
        <h3 className="font-bold text-surface-900 mb-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Hoy
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MiniStat icon={Users} label="Nuevos usuarios" value={`+${overview.users.newToday}`} accent="text-brand-600" />
          <MiniStat icon={Activity} label="Workouts creados" value={`+${overview.workouts.today}`} accent="text-emerald-600" />
          <MiniStat icon={TrendingUp} label="Activos esta semana" value={overview.users.activeLast7Days.toString()} accent="text-amber-600" />
        </div>
      </section>
    </div>
  );
}

// ─── Subcomponents ───────────────────────────────────────────────────────────

function SystemStatusBanner({
  system,
  health,
}: {
  system: AdminOverview['system'];
  health: SystemHealth | null;
}) {
  const configItems = [
    { ok: system.stripeConfigured, label: 'Stripe', icon: Euro },
    { ok: system.webhookConfigured, label: 'Webhook', icon: Server },
    { ok: system.aiConfigured, label: `IA (${system.aiModel.split('-')[0]})`, icon: Bot },
  ];

  const latencyColor = (ms: number | undefined) => {
    if (ms === undefined) return 'text-surface-400';
    if (ms < 100) return 'text-emerald-600';
    if (ms < 500) return 'text-amber-600';
    return 'text-red-600';
  };

  const infraItems = health
    ? [
        {
          ok: health.checks.database.status === 'ok',
          label: 'Database',
          icon: Server,
          latency: health.checks.database.latencyMs,
        },
        {
          ok: health.checks.redis.status === 'ok',
          label: 'Redis',
          icon: Activity,
          latency: health.checks.redis.latencyMs,
        },
      ]
    : null;

  const allConfigOk = configItems.every((i) => i.ok);
  const allInfraOk = infraItems ? infraItems.every((i) => i.ok) : true;
  const allOk = allConfigOk && allInfraOk;

  return (
    <div
      className={`flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 rounded-xl border ${
        allOk ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'
      }`}
    >
      <span className={`inline-flex items-center gap-1 text-xs font-bold shrink-0 ${allOk ? 'text-emerald-700' : 'text-amber-700'}`}>
        {allOk
          ? <><CheckCircle2 className="w-3.5 h-3.5" /> Sistema operativo</>
          : <><AlertTriangle className="w-3.5 h-3.5" /> Atención requerida</>}
      </span>

      {/* Config checks */}
      <div className="flex flex-wrap gap-2">
        {configItems.map((it) => (
          <span
            key={it.label}
            className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md ${
              it.ok
                ? 'bg-white text-emerald-700 border border-emerald-200'
                : 'bg-white text-red-600 border border-red-200'
            }`}
          >
            <it.icon className="w-3.5 h-3.5" />
            {it.label}
            {it.ok ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
          </span>
        ))}
      </div>

      {/* Separator */}
      <span className="hidden sm:block w-px h-4 bg-surface-300" />

      {/* Infra / latency checks */}
      <div className="flex flex-wrap gap-2">
        {infraItems === null ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md bg-white text-surface-400 border border-surface-200 animate-pulse">
            <Server className="w-3.5 h-3.5" />
            Comprobando infra…
          </span>
        ) : (
          infraItems.map((it) => (
            <span
              key={it.label}
              className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md ${
                it.ok
                  ? 'bg-white text-emerald-700 border border-emerald-200'
                  : 'bg-white text-red-600 border border-red-200'
              }`}
            >
              <it.icon className="w-3.5 h-3.5" />
              {it.label}
              {it.ok ? (
                <>
                  <CheckCircle2 className="w-3 h-3" />
                  {it.latency !== undefined && (
                    <span className={`font-bold tabular-nums ${latencyColor(it.latency)}`}>
                      {it.latency}ms
                    </span>
                  )}
                </>
              ) : (
                <XCircle className="w-3 h-3" />
              )}
            </span>
          ))
        )}
        {health && (
          <span className="text-xs text-surface-400 self-center">
            · actualizado {new Date(health.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        )}
      </div>
    </div>
  );
}

function PremiumCard({
  label,
  value,
  hint,
  icon: Icon,
  highlight = false,
  warning = false,
}: {
  label: string;
  value: string;
  hint: string;
  icon: React.ElementType;
  highlight?: boolean;
  warning?: boolean;
}) {
  return (
    <div
      className={`rounded-xl p-4 border transition-all ${
        highlight
          ? 'bg-gradient-to-br from-amber-500 to-orange-500 border-orange-400 text-white shadow-lg'
          : warning
          ? 'bg-white border-red-200'
          : 'bg-white border-surface-200'
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className={`text-xs font-semibold uppercase tracking-wide ${highlight ? 'text-white/80' : 'text-surface-500'}`}>
          {label}
        </span>
        <Icon className={`w-4 h-4 ${highlight ? 'text-white/80' : warning ? 'text-red-500' : 'text-surface-400'}`} />
      </div>
      <p className={`text-2xl font-bold tabular-nums ${highlight ? 'text-white' : 'text-surface-900'}`}>
        {value}
      </p>
      <p className={`text-xs mt-1 ${highlight ? 'text-white/80' : 'text-surface-500'}`}>{hint}</p>
    </div>
  );
}

function Pill({
  icon: Icon,
  text,
  accent = 'brand',
}: {
  icon: React.ElementType;
  text: string;
  accent?: 'brand' | 'emerald' | 'amber';
}) {
  const map = {
    brand: 'bg-brand-50 text-brand-700 border-brand-100',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-semibold border ${map[accent]}`}>
      <Icon className="w-3.5 h-3.5" />
      {text}
    </span>
  );
}

function Card({
  title,
  icon: Icon,
  accent = 'default',
  children,
}: {
  title: string;
  icon: React.ElementType;
  accent?: 'default' | 'amber';
  children: React.ReactNode;
}) {
  const ring = accent === 'amber' ? 'border-amber-200' : 'border-surface-200';
  return (
    <div className={`bg-white border ${ring} rounded-2xl p-5 shadow-soft`}>
      <h3 className="font-bold text-surface-900 mb-4 flex items-center gap-2">
        <Icon className={`w-4 h-4 ${accent === 'amber' ? 'text-amber-600' : 'text-surface-500'}`} />
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Row({
  icon: Icon,
  label,
  value,
  accent,
  hint,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  accent: string;
  hint?: string;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-surface-100 last:border-0">
      <div className="flex items-center gap-2.5 min-w-0">
        <Icon className={`w-4 h-4 shrink-0 ${accent}`} />
        <div className="min-w-0">
          <p className="text-sm text-surface-700 truncate">{label}</p>
          {hint && <p className="text-xs text-surface-400">{hint}</p>}
        </div>
      </div>
      <span className="text-sm font-bold text-surface-900 tabular-nums shrink-0">{value}</span>
    </div>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-50">
      <Icon className={`w-5 h-5 ${accent}`} />
      <div>
        <p className="text-xs text-surface-500">{label}</p>
        <p className="text-lg font-bold text-surface-900 tabular-nums">{value}</p>
      </div>
    </div>
  );
}
