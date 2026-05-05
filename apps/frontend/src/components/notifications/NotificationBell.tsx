import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bell,
  Heart,
  MessageCircle,
  UserPlus,
  Trophy,
  Award,
  Megaphone,
  Check,
} from 'lucide-react';
import notificationsService, { NotificationItem, NotificationType } from '../../services/notifications.service';
import { useAuth } from '../../hooks/useAuth';
import Avatar from '../ui/Avatar';
import { timeAgo } from '../../lib/format';

const POLL_INTERVAL_MS = 45_000; // 45s — buena cadencia para una app web ligera

const ICONS: Record<NotificationType, React.ElementType> = {
  LIKE: Heart,
  COMMENT: MessageCircle,
  FOLLOW: UserPlus,
  PR_ACHIEVED: Trophy,
  BADGE_EARNED: Award,
  SYSTEM: Megaphone,
};

const ICON_COLORS: Record<NotificationType, string> = {
  LIKE: 'text-red-500 bg-red-50',
  COMMENT: 'text-brand-600 bg-brand-50',
  FOLLOW: 'text-blue-600 bg-blue-50',
  PR_ACHIEVED: 'text-amber-600 bg-amber-50',
  BADGE_EARNED: 'text-purple-600 bg-purple-50',
  SYSTEM: 'text-surface-700 bg-surface-100',
};

export default function NotificationBell() {
  const { isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [marking, setMarking] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // ── Click fuera cierra el dropdown ────────────────────────────────
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  // ── Polling del unread count ──────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      return;
    }

    let cancelled = false;
    const tick = async () => {
      try {
        const c = await notificationsService.unreadCount();
        if (!cancelled) setUnreadCount(c);
      } catch {
        // Silenciado: evitar spam de errores en consola si la red parpadea
      }
    };

    tick();
    const interval = setInterval(tick, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isAuthenticated]);

  // ── Cargar últimas 5 al abrir el dropdown ────────────────────────
  async function handleOpen() {
    setOpen((v) => !v);
    if (open) return; // se está cerrando
    setLoading(true);
    try {
      const res = await notificationsService.list({ page: 1, limit: 5 });
      setItems(res.items);
      setUnreadCount(res.unreadCount);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkAllRead() {
    if (marking || unreadCount === 0) return;
    setMarking(true);
    try {
      await notificationsService.markAllRead();
      setUnreadCount(0);
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {
      // silent
    } finally {
      setMarking(false);
    }
  }

  if (!isAuthenticated) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleOpen}
        className="relative p-2 rounded-lg text-surface-600 hover:text-surface-900 hover:bg-surface-100 transition-colors"
        aria-label={`Notificaciones${unreadCount > 0 ? ` (${unreadCount} sin leer)` : ''}`}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-brand-500 text-white text-[10px] font-bold ring-2 ring-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[360px] sm:w-[380px] bg-white border border-surface-200 rounded-xl shadow-2xl overflow-hidden animate-fade-in z-40">
          <header className="flex items-center justify-between px-4 py-3 border-b border-surface-200">
            <h3 className="font-bold text-surface-900">Notificaciones</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={marking}
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                Marcar todas
              </button>
            )}
          </header>

          <div className="max-h-[420px] overflow-y-auto">
            {loading ? (
              <div className="py-10 text-center text-sm text-surface-500">Cargando…</div>
            ) : items.length === 0 ? (
              <div className="py-10 px-4 text-center">
                <Bell className="w-8 h-8 text-surface-300 mx-auto mb-2" />
                <p className="text-sm text-surface-500">Sin notificaciones todavía</p>
                <p className="text-xs text-surface-400 mt-1">
                  Aquí verás cuando alguien interactúe con tus entrenamientos.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-surface-100">
                {items.map((n) => (
                  <NotificationListItem
                    key={n.id}
                    item={n}
                    onClick={() => setOpen(false)}
                  />
                ))}
              </ul>
            )}
          </div>

          <footer className="px-4 py-2 border-t border-surface-200 bg-surface-50">
            <Link
              to="/notifications"
              onClick={() => setOpen(false)}
              className="block text-center text-xs font-semibold text-brand-600 hover:text-brand-700"
            >
              Ver todas las notificaciones
            </Link>
          </footer>
        </div>
      )}
    </div>
  );
}

// ─── List item ──────────────────────────────────────────────────────────────

interface NotificationListItemProps {
  item: NotificationItem;
  onClick?: () => void;
}

export function NotificationListItem({ item, onClick }: NotificationListItemProps) {
  const navigate = useNavigate();
  const Icon = ICONS[item.type];
  const colorClass = ICON_COLORS[item.type];
  const senderName =
    item.sender?.profile?.display_name ?? item.sender?.profile?.username ?? null;

  function targetHref(): string | null {
    if (item.entity_type === 'workout' && item.entity_id) {
      return `/workouts/${item.entity_id}`;
    }
    if (item.entity_type === 'user' && item.entity_id) {
      return `/u/${item.entity_id}`;
    }
    return null;
  }

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    if (!item.is_read) {
      try {
        await notificationsService.markRead(item.id);
      } catch {
        // silent
      }
    }
    onClick?.();
    const href = targetHref();
    if (href) navigate(href);
  }

  return (
    <li>
      <a
        href={targetHref() ?? '#'}
        onClick={handleClick}
        className={`flex items-start gap-3 px-4 py-3 hover:bg-surface-50 transition-colors ${
          !item.is_read ? 'bg-brand-50/40' : ''
        }`}
      >
        {/* Avatar del sender o icono según tipo */}
        {item.sender?.profile?.avatar_url || senderName ? (
          <div className="relative shrink-0">
            <Avatar
              src={item.sender?.profile?.avatar_url ?? null}
              name={senderName ?? '?'}
              size="sm"
            />
            <span
              className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center ring-2 ring-white ${colorClass}`}
            >
              <Icon className="w-2.5 h-2.5" />
            </span>
          </div>
        ) : (
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${colorClass}`}
          >
            <Icon className="w-4 h-4" />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className="text-sm text-surface-900 line-clamp-2">{item.title}</p>
          {item.body && (
            <p className="text-xs text-surface-500 mt-0.5 line-clamp-2">{item.body}</p>
          )}
          <p className="text-[11px] text-surface-400 mt-1">
            {timeAgo(item.created_at)}
          </p>
        </div>

        {!item.is_read && (
          <span className="w-2 h-2 rounded-full bg-brand-500 shrink-0 mt-2" aria-label="No leída" />
        )}
      </a>
    </li>
  );
}
