/**
 * Feed en directo de eventos recientes de la plataforma para el panel admin.
 * Polling cada 10s. Muestra: registros, workouts, suscripciones, likes, comentarios.
 *
 * Diseño pensado para servir como "demo perfecta": el tribunal ve la app viva
 * en pantalla sin necesidad de hacer nada — los nuevos eventos aparecen solos.
 */

import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  UserPlus, Activity, Crown, X as XIcon, Heart, MessageCircle, Radio,
} from 'lucide-react';
import adminService, { ActivityFeedEvent, ActivityEventType } from '../../services/admin.service';
import Avatar from '../ui/Avatar';

const POLL_INTERVAL_MS = 10_000;

const EVENT_CONFIG: Record<ActivityEventType, {
  icon: React.ElementType;
  color: string;
  label: (e: ActivityFeedEvent) => React.ReactNode;
}> = {
  USER_REGISTERED: {
    icon: UserPlus,
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    label: (e) => (
      <>
        <Strong>{displayName(e)}</Strong> se ha registrado
      </>
    ),
  },
  WORKOUT_CREATED: {
    icon: Activity,
    color: 'bg-brand-50 text-brand-700 border-brand-200',
    label: (e) => (
      <>
        <Strong>{displayName(e)}</Strong> ha creado un entrenamiento
        {e.meta?.title ? <> · <em className="not-italic text-surface-700">"{String(e.meta.title)}"</em></> : null}
      </>
    ),
  },
  SUBSCRIPTION_CREATED: {
    icon: Crown,
    color: 'bg-amber-50 text-amber-700 border-amber-200',
    label: (e) => (
      <>
        <Strong>{displayName(e)}</Strong> se ha hecho Premium
      </>
    ),
  },
  SUBSCRIPTION_CANCELED: {
    icon: XIcon,
    color: 'bg-red-50 text-red-700 border-red-200',
    label: (e) => (
      <>
        <Strong>{displayName(e)}</Strong> ha cancelado su suscripción
      </>
    ),
  },
  LIKE: {
    icon: Heart,
    color: 'bg-pink-50 text-pink-700 border-pink-200',
    label: (e) => (
      <>
        <Strong>{displayName(e)}</Strong> ha dado like
        {e.meta?.workoutTitle ? <> a <em className="not-italic text-surface-700">"{String(e.meta.workoutTitle)}"</em></> : null}
      </>
    ),
  },
  COMMENT: {
    icon: MessageCircle,
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    label: (e) => (
      <>
        <Strong>{displayName(e)}</Strong> ha comentado
        {e.meta?.workoutTitle ? <> en <em className="not-italic text-surface-700">"{String(e.meta.workoutTitle)}"</em></> : null}
      </>
    ),
  },
};

function displayName(e: ActivityFeedEvent): string {
  return e.actor.displayName ?? e.actor.username ?? 'Usuario';
}

function Strong({ children }: { children: React.ReactNode }) {
  return <span className="font-semibold text-surface-900">{children}</span>;
}

/** Convierte un timestamp a "hace 5s", "hace 2min", "hace 1h", etc. */
function formatRelative(ts: string, now: number): string {
  const diff = Math.max(0, Math.floor((now - new Date(ts).getTime()) / 1000));
  if (diff < 5) return 'ahora mismo';
  if (diff < 60) return `hace ${diff}s`;
  if (diff < 3600) return `hace ${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`;
  return `hace ${Math.floor(diff / 86400)}d`;
}

interface LiveActivityFeedProps {
  /** Cantidad de eventos a mostrar. Default 20. */
  limit?: number;
  /** Altura máxima del scroll interno. Default 480px. */
  maxHeight?: number;
}

export default function LiveActivityFeed({ limit = 20, maxHeight = 480 }: LiveActivityFeedProps) {
  const [items, setItems] = useState<ActivityFeedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => Date.now());
  const [highlighted, setHighlighted] = useState<Set<string>>(new Set());
  const knownIds = useRef<Set<string>>(new Set());

  // Polling de eventos
  useEffect(() => {
    let alive = true;

    async function tick() {
      try {
        const r = await adminService.getActivityFeed(limit);
        if (!alive) return;

        // Detectar eventos NUEVOS desde la última carga (para resaltarlos)
        const fresh = r.items.filter((e) => !knownIds.current.has(e.id));
        const isFirstLoad = knownIds.current.size === 0;
        for (const e of r.items) knownIds.current.add(e.id);

        if (!isFirstLoad && fresh.length > 0) {
          setHighlighted((h) => {
            const next = new Set(h);
            fresh.forEach((e) => next.add(e.id));
            return next;
          });
          // Quitar el highlight después de 3s
          setTimeout(() => {
            if (!alive) return;
            setHighlighted((h) => {
              const next = new Set(h);
              fresh.forEach((e) => next.delete(e.id));
              return next;
            });
          }, 3000);
        }

        setItems(r.items);
      } catch {
        // silent — no spamear el toast en cada polling fallido
      } finally {
        if (alive) setLoading(false);
      }
    }

    tick();
    const interval = setInterval(tick, POLL_INTERVAL_MS);

    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, [limit]);

  // Refresca el "hace Xs" cada 5s sin tener que volver a llamar al backend
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="bg-white border border-surface-200 rounded-2xl shadow-soft overflow-hidden">
      <header className="flex items-center justify-between px-5 py-4 border-b border-surface-200">
        <div className="flex items-center gap-2">
          <span className="relative flex w-2.5 h-2.5">
            <span className="animate-ping absolute inline-flex w-full h-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full w-2.5 h-2.5 bg-emerald-500" />
          </span>
          <h3 className="font-bold text-surface-900">Actividad en directo</h3>
        </div>
        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-surface-500">
          <Radio className="w-3 h-3" />
          Actualiza cada 10s
        </span>
      </header>

      <div className="overflow-y-auto" style={{ maxHeight }}>
        {loading && items.length === 0 ? (
          <div className="p-8 text-center text-sm text-surface-500">Cargando eventos...</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-sm text-surface-500">
            Sin actividad reciente. Aparecerán aquí los nuevos eventos.
          </div>
        ) : (
          <ul className="divide-y divide-surface-100">
            {items.map((e) => {
              const cfg = EVENT_CONFIG[e.type];
              const Icon = cfg.icon;
              const isNew = highlighted.has(e.id);
              return (
                <li
                  key={e.id}
                  className={`flex items-start gap-3 px-5 py-3 transition-colors ${
                    isNew ? 'bg-brand-50/60 animate-fade-in' : ''
                  }`}
                >
                  <div className="relative shrink-0">
                    <Avatar
                      src={e.actor.avatarUrl}
                      name={displayName(e)}
                      size="sm"
                    />
                    <span
                      className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center ring-2 ring-white border ${cfg.color}`}
                    >
                      <Icon className="w-2.5 h-2.5" />
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-surface-700 leading-snug">
                      {cfg.label(e)}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-surface-500">
                      <span>{formatRelative(e.timestamp, now)}</span>
                      {(e.type === 'WORKOUT_CREATED' || e.type === 'LIKE' || e.type === 'COMMENT') &&
                        e.meta?.workoutId ? (
                          <Link
                            to={`/workouts/${String(e.meta.workoutId)}`}
                            className="text-brand-600 hover:text-brand-700 font-semibold"
                          >
                            Ver
                          </Link>
                        ) : null}
                    </div>
                  </div>
                  {isNew && (
                    <span className="inline-flex items-center text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 border border-emerald-200 shrink-0">
                      Nuevo
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
