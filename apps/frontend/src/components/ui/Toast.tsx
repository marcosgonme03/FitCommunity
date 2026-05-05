import { create } from 'zustand';
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-react';
import { useEffect } from 'react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  description?: string;
}

interface ToastStore {
  toasts: ToastItem[];
  push: (t: Omit<ToastItem, 'id'>) => void;
  remove: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  push: (t) =>
    set((s) => ({
      toasts: [...s.toasts, { ...t, id: `t_${Date.now()}_${Math.random().toString(36).slice(2)}` }],
    })),
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
}));

export const toast = {
  success: (message: string, description?: string) =>
    useToastStore.getState().push({ type: 'success', message, description }),
  error: (message: string, description?: string) =>
    useToastStore.getState().push({ type: 'error', message, description }),
  info: (message: string, description?: string) =>
    useToastStore.getState().push({ type: 'info', message, description }),
  warning: (message: string, description?: string) =>
    useToastStore.getState().push({ type: 'warning', message, description }),
};

const ICONS: Record<ToastType, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
};

const COLORS: Record<ToastType, string> = {
  success: 'border-accent-500/50 text-accent-700',
  error:   'border-red-500/50 text-red-600',
  info:    'border-brand-500/50 text-brand-600',
  warning: 'border-orange-500/50 text-brand-600',
};

function ToastItemEl({ item }: { item: ToastItem }) {
  const remove = useToastStore((s) => s.remove);
  const Icon = ICONS[item.type];

  useEffect(() => {
    const timer = setTimeout(() => remove(item.id), 4000);
    return () => clearTimeout(timer);
  }, [item.id, remove]);

  return (
    <div
      className={`pointer-events-auto bg-white backdrop-blur border ${COLORS[item.type]}
                  rounded-xl p-4 pr-3 shadow-2xl flex items-start gap-3 min-w-[280px] max-w-md
                  animate-slide-up`}
    >
      <Icon className="w-5 h-5 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-surface-900">{item.message}</p>
        {item.description && <p className="text-xs text-surface-600 mt-0.5">{item.description}</p>}
      </div>
      <button
        onClick={() => remove(item.id)}
        className="text-surface-500 hover:text-surface-900 p-1 -m-1 rounded transition-colors"
        aria-label="Cerrar"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export default function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2 pointer-events-none">
      {toasts.map((t) => (
        <ToastItemEl key={t.id} item={t} />
      ))}
    </div>
  );
}
