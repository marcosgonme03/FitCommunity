import { useEffect, useState } from 'react';
import { ScrollText } from 'lucide-react';
import adminService from '../../services/admin.service';
import EmptyState from '../../components/ui/EmptyState';
import Spinner from '../../components/ui/Spinner';
import { formatDate, formatTime } from '../../lib/format';

interface LogItem {
  id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  metadata: unknown;
  ip_address: string | null;
  created_at: string;
  admin: {
    id: string;
    email: string;
    profile: { username: string | null; display_name: string | null } | null;
  };
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  BAN_USER: { label: 'Baneo', color: 'text-amber-700 bg-amber-100 border-amber-200' },
  UNBAN_USER: { label: 'Desbaneo', color: 'text-success-700 bg-success-100 border-success-200' },
  DELETE_USER: { label: 'Eliminó usuario', color: 'text-red-700 bg-red-100 border-red-200' },
  DELETE_WORKOUT: { label: 'Eliminó workout', color: 'text-red-700 bg-red-100 border-red-200' },
  UPDATE_USER_ROLE: { label: 'Cambio de rol', color: 'text-purple-700 bg-purple-100 border-purple-200' },
};

export default function AdminLogsPage() {
  const [items, setItems] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminService
      .logs(1, 100)
      .then((res) => setItems(res.items as LogItem[]))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner fullScreen label="Cargando audit log..." />;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold text-surface-900">Audit log</h1>
        <p className="text-surface-600 mt-1 text-sm">
          Historial de acciones administrativas. Todas las acciones quedan registradas.
        </p>
      </header>

      {items.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="Sin registros aún"
          description="Las acciones administrativas aparecerán aquí cuando ocurran."
        />
      ) : (
        <div className="bg-white border border-surface-200 rounded-2xl shadow-soft overflow-hidden">
          <ul className="divide-y divide-surface-100">
            {items.map((log) => {
              const meta = ACTION_LABELS[log.action] ?? {
                label: log.action,
                color: 'text-surface-700 bg-surface-100 border-surface-200',
              };
              return (
                <li key={log.id} className="p-4 hover:bg-surface-50 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${meta.color}`}>
                          {meta.label}
                        </span>
                        <span className="text-xs text-surface-500">
                          por <span className="font-semibold text-surface-700">
                            {log.admin.profile?.display_name ?? log.admin.email}
                          </span>
                        </span>
                      </div>
                      <p className="text-xs text-surface-500 mt-1">
                        {log.target_type && log.target_id && (
                          <span>Target: {log.target_type} #{log.target_id.slice(0, 8)}</span>
                        )}
                        {log.metadata != null && (
                          <span className="ml-2">
                            · {JSON.stringify(log.metadata)}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-surface-700 font-medium">{formatDate(log.created_at)}</p>
                      <p className="text-[10px] text-surface-500">{formatTime(log.created_at)}</p>
                      {log.ip_address && (
                        <p className="text-[10px] text-surface-400 mt-0.5 font-mono">{log.ip_address}</p>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
