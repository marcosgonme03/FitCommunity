import { useEffect, useState, useCallback } from 'react';
import {
  Megaphone,
  Send,
  Users,
  Clock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Zap,
  Flame,
  Star,
  Bell,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import adminService, { BroadcastSegment, BroadcastCampaign } from '../../services/admin.service';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import { toast } from '../../components/ui/Toast';
import { formatDate } from '../../lib/format';

// ─── Templates predefinidas ──────────────────────────────────────────────────

interface Template {
  key: string;
  icon: React.ReactNode;
  label: string;
  title: string;
  body: string;
  segment: BroadcastSegment;
  segmentLabel: string;
  color: string;
}

const TEMPLATES: Template[] = [
  {
    key: 'weekly_motivation',
    icon: <Flame className="w-5 h-5" />,
    label: 'Motivación semanal',
    title: 'Nueva semana, nuevas metas',
    body: '¿Cuántos entrenamientos te propones esta semana? Cada repetición te acerca más a tu objetivo. ¡A por ello!',
    segment: 'ALL',
    segmentLabel: 'Todos los usuarios activos',
    color: 'bg-orange-50 border-orange-200 text-orange-700',
  },
  {
    key: 'inactive_7d',
    icon: <Clock className="w-5 h-5" />,
    label: 'Recordatorio 7 días',
    title: 'Te echamos de menos',
    body: 'Llevas más de una semana sin entrenar. Cualquier entrenamiento, por pequeño que sea, te acerca a tu objetivo. ¡Vuelve!',
    segment: 'INACTIVE_7D',
    segmentLabel: 'Usuarios sin entrenar +7 días',
    color: 'bg-yellow-50 border-yellow-200 text-yellow-700',
  },
  {
    key: 'inactive_14d',
    icon: <Bell className="w-5 h-5" />,
    label: 'Reactivación 14 días',
    title: 'Han pasado 2 semanas',
    body: 'No te rindas. Retomar el hábito es tan sencillo como un único entrenamiento. ¡Te esperamos de vuelta en FitCommunity!',
    segment: 'INACTIVE_14D',
    segmentLabel: 'Usuarios sin entrenar +14 días',
    color: 'bg-red-50 border-red-200 text-red-700',
  },
  {
    key: 'premium_ai',
    icon: <Star className="w-5 h-5" />,
    label: 'Promoción IA Premium',
    title: 'Tu Coach IA te espera',
    body: 'Como usuario Premium tienes acceso ilimitado al Coach IA. ¿Ya generaste tu rutina personalizada esta semana?',
    segment: 'PREMIUM',
    segmentLabel: 'Solo usuarios Premium',
    color: 'bg-purple-50 border-purple-200 text-purple-700',
  },
  {
    key: 'new_user_welcome',
    icon: <Zap className="w-5 h-5" />,
    label: 'Bienvenida nuevos',
    title: 'Bienvenido a FitCommunity',
    body: 'Empieza registrando tu primer entrenamiento y conecta con la comunidad. ¡Tienes todo lo que necesitas para alcanzar tus metas!',
    segment: 'NEW_USERS_7D',
    segmentLabel: 'Registrados esta semana',
    color: 'bg-green-50 border-green-200 text-green-700',
  },
];

// ─── Segmento labels / colores ────────────────────────────────────────────────

const SEGMENT_LABELS: Record<BroadcastSegment, string> = {
  ALL: 'Todos los usuarios activos',
  PREMIUM: 'Solo Premium',
  INACTIVE_7D: 'Inactivos +7 días',
  INACTIVE_14D: 'Inactivos +14 días',
  NEW_USERS_7D: 'Nuevos esta semana',
};

const SEGMENT_COLORS: Record<BroadcastSegment, string> = {
  ALL: 'bg-brand-100 text-brand-700',
  PREMIUM: 'bg-purple-100 text-purple-700',
  INACTIVE_7D: 'bg-yellow-100 text-yellow-700',
  INACTIVE_14D: 'bg-red-100 text-red-700',
  NEW_USERS_7D: 'bg-green-100 text-green-700',
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminBroadcastsPage() {
  // Compose form
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [segment, setSegment] = useState<BroadcastSegment>('ALL');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  // Preview count
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Send state
  const [showConfirm, setShowConfirm] = useState(false);
  const [sending, setSending] = useState(false);

  // History
  const [campaigns, setCampaigns] = useState<BroadcastCampaign[]>([]);
  const [histLoading, setHistLoading] = useState(true);
  const [histPage, setHistPage] = useState(1);
  const [histPagination, setHistPagination] = useState({ totalPages: 1, total: 0 });

  // Active tab
  const [tab, setTab] = useState<'compose' | 'history'>('compose');

  // ── Load preview on segment change ──────────────────────────────────────────
  const loadPreview = useCallback(async (seg: BroadcastSegment) => {
    setPreviewLoading(true);
    setPreviewCount(null);
    try {
      const { count } = await adminService.broadcastPreview(seg);
      setPreviewCount(count);
    } catch {
      setPreviewCount(null);
    } finally {
      setPreviewLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPreview(segment);
  }, [segment, loadPreview]);

  // ── Load history ─────────────────────────────────────────────────────────────
  const loadHistory = useCallback(async (page: number) => {
    setHistLoading(true);
    try {
      const res = await adminService.listCampaigns(page);
      setCampaigns(res.items);
      setHistPagination({ totalPages: res.pagination.totalPages, total: res.pagination.total });
    } catch {
      toast.error('Error', 'No se pudo cargar el historial');
    } finally {
      setHistLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'history') loadHistory(histPage);
  }, [tab, histPage, loadHistory]);

  // ── Apply template ────────────────────────────────────────────────────────────
  function applyTemplate(t: Template) {
    setTitle(t.title);
    setBody(t.body);
    setSegment(t.segment);
    setSelectedTemplate(t.key);
    // scroll to form
    document.getElementById('compose-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ── Send ─────────────────────────────────────────────────────────────────────
  async function handleSend() {
    setSending(true);
    try {
      const result = await adminService.sendBroadcast({
        title,
        body,
        segment,
        templateKey: selectedTemplate ?? undefined,
      });
      toast.success(
        '¡Enviado!',
        `Notificación enviada a ${result.recipients} usuario${result.recipients !== 1 ? 's' : ''}`
      );
      setTitle('');
      setBody('');
      setSelectedTemplate(null);
      setShowConfirm(false);
      // refresh history if on that tab
      if (tab === 'history') loadHistory(1);
    } catch {
      toast.error('Error', 'No se pudo enviar la notificación');
    } finally {
      setSending(false);
    }
  }

  const canSend = title.trim().length >= 3 && body.trim().length >= 5;

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-lg shadow-brand-500/20">
          <Megaphone className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-surface-900">Comunicaciones</h1>
          <p className="text-sm text-surface-500">Mensajes masivos y directos a usuarios</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setTab('compose')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === 'compose'
              ? 'bg-white text-surface-900 shadow-sm'
              : 'text-surface-500 hover:text-surface-700'
          }`}
        >
          <span className="flex items-center gap-2">
            <Send className="w-4 h-4" />
            Nuevo mensaje
          </span>
        </button>
        <button
          onClick={() => setTab('history')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === 'history'
              ? 'bg-white text-surface-900 shadow-sm'
              : 'text-surface-500 hover:text-surface-700'
          }`}
        >
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Historial
            {histPagination.total > 0 && (
              <span className="bg-brand-100 text-brand-700 text-xs rounded-full px-1.5 py-0.5 font-bold">
                {histPagination.total}
              </span>
            )}
          </span>
        </button>
      </div>

      {/* ── COMPOSE TAB ─────────────────────────────────────────────────────── */}
      {tab === 'compose' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Templates panel */}
          <div className="lg:col-span-1 space-y-3">
            <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider px-1">
              Plantillas rápidas
            </p>
            {TEMPLATES.map((t) => (
              <button
                key={t.key}
                onClick={() => applyTemplate(t)}
                className={`w-full text-left p-3 rounded-xl border-2 transition-all hover:shadow-md ${
                  selectedTemplate === t.key
                    ? 'border-brand-400 bg-brand-50 shadow-sm'
                    : 'border-surface-200 bg-white hover:border-surface-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-1.5 rounded-lg ${t.color} shrink-0`}>{t.icon}</div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-surface-900 leading-tight">{t.label}</p>
                    <p className="text-xs text-surface-500 mt-0.5">{t.segmentLabel}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Compose form */}
          <div id="compose-form" className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-2xl border border-surface-200 shadow-sm p-6 space-y-5">
              <div className="flex items-center gap-2 mb-1">
                <MessageSquare className="w-4 h-4 text-brand-500" />
                <h2 className="text-sm font-semibold text-surface-800">Redactar mensaje</h2>
              </div>

              {/* Título */}
              <div>
                <label className="block text-xs font-semibold text-surface-700 mb-1.5 uppercase tracking-wide">
                  Título
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setSelectedTemplate(null);
                  }}
                  placeholder="Ej: ¡Nueva semana, nuevas metas!"
                  maxLength={100}
                  className="w-full px-3 py-2.5 rounded-xl border border-surface-300 text-sm text-surface-900 bg-white placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition"
                />
                <p className="text-xs text-surface-400 mt-1 text-right">{title.length}/100</p>
              </div>

              {/* Cuerpo */}
              <div>
                <label className="block text-xs font-semibold text-surface-700 mb-1.5 uppercase tracking-wide">
                  Mensaje
                </label>
                <textarea
                  value={body}
                  onChange={(e) => {
                    setBody(e.target.value);
                    setSelectedTemplate(null);
                  }}
                  placeholder="Escribe el contenido de la notificación..."
                  maxLength={500}
                  rows={4}
                  className="w-full px-3 py-2.5 rounded-xl border border-surface-300 text-sm text-surface-900 bg-white placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition resize-none"
                />
                <p className="text-xs text-surface-400 mt-1 text-right">{body.length}/500</p>
              </div>

              {/* Segmento */}
              <div>
                <label className="block text-xs font-semibold text-surface-700 mb-1.5 uppercase tracking-wide">
                  Destinatarios
                </label>
                <select
                  value={segment}
                  onChange={(e) => {
                    setSegment(e.target.value as BroadcastSegment);
                    setSelectedTemplate(null);
                  }}
                  className="w-full px-3 py-2.5 rounded-xl border border-surface-300 text-sm text-surface-900 bg-white placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition"
                >
                  {(Object.keys(SEGMENT_LABELS) as BroadcastSegment[]).map((s) => (
                    <option key={s} value={s}>
                      {SEGMENT_LABELS[s]}
                    </option>
                  ))}
                </select>
              </div>

              {/* Preview count */}
              <div className="flex items-center gap-2 p-3 rounded-xl bg-surface-50 border border-surface-200">
                <Users className="w-4 h-4 text-surface-400 shrink-0" />
                {previewLoading ? (
                  <span className="text-sm text-surface-500 flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Calculando destinatarios...
                  </span>
                ) : previewCount === null ? (
                  <span className="text-sm text-surface-400">—</span>
                ) : previewCount === 0 ? (
                  <span className="text-sm text-yellow-600 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Ningún usuario cumple este segmento ahora mismo
                  </span>
                ) : (
                  <span className="text-sm text-surface-700">
                    <span className="font-bold text-brand-600">{previewCount.toLocaleString()}</span>{' '}
                    usuario{previewCount !== 1 ? 's' : ''} recibirán esta notificación
                  </span>
                )}
              </div>

              {/* Preview card */}
              {(title || body) && (
                <div className="border border-surface-200 rounded-xl p-4 bg-surface-50">
                  <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-2">
                    Vista previa
                  </p>
                  <div className="bg-white rounded-xl border border-surface-200 p-3 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shrink-0">
                        <Bell className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-surface-900 leading-tight">
                          {title || 'Título del mensaje'}
                        </p>
                        <p className="text-xs text-surface-500 mt-1 leading-relaxed">
                          {body || 'Cuerpo del mensaje...'}
                        </p>
                        <p className="text-[10px] text-surface-400 mt-1.5">Ahora mismo · FitCommunity</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Send button */}
              <Button
                onClick={() => setShowConfirm(true)}
                disabled={!canSend || previewCount === 0}
                className="w-full"
                size="lg"
              >
                <Send className="w-4 h-4" />
                Enviar a {previewCount !== null ? `${previewCount.toLocaleString()} usuarios` : 'usuarios'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── HISTORY TAB ─────────────────────────────────────────────────────── */}
      {tab === 'history' && (
        <div className="space-y-4">
          {histLoading ? (
            <div className="flex justify-center py-20">
              <Spinner />
            </div>
          ) : campaigns.length === 0 ? (
            <EmptyState
              icon={<Megaphone className="w-8 h-8 text-surface-300" />}
              title="Sin campañas todavía"
              description="Cuando envíes tu primer broadcast, aparecerá aquí."
            />
          ) : (
            <>
              <div className="space-y-3">
                {campaigns.map((c) => (
                  <div
                    key={c.id}
                    className="bg-white rounded-2xl border border-surface-200 shadow-sm p-4 flex items-start gap-4"
                  >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shrink-0">
                      <Megaphone className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div>
                          <p className="text-sm font-semibold text-surface-900 leading-tight">{c.title}</p>
                          <p className="text-xs text-surface-500 mt-0.5 line-clamp-2">{c.body}</p>
                        </div>
                        <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${SEGMENT_COLORS[c.segment]}`}>
                          {SEGMENT_LABELS[c.segment]}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-xs text-surface-400">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {c.recipients.toLocaleString()} usuarios
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(c.created_at)}
                        </span>
                        <span>
                          por{' '}
                          <span className="font-medium text-surface-600">
                            {c.admin.profile?.display_name ?? c.admin.email}
                          </span>
                        </span>
                        {c.template_key && (
                          <span className="bg-surface-100 text-surface-500 rounded px-1.5 py-0.5 font-medium">
                            plantilla
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {histPagination.totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => setHistPage((p) => Math.max(1, p - 1))}
                    disabled={histPage === 1}
                    className="p-2 rounded-lg border border-surface-200 text-surface-600 hover:bg-surface-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm text-surface-600">
                    {histPage} / {histPagination.totalPages}
                  </span>
                  <button
                    onClick={() => setHistPage((p) => Math.min(histPagination.totalPages, p + 1))}
                    disabled={histPage === histPagination.totalPages}
                    className="p-2 rounded-lg border border-surface-200 text-surface-600 hover:bg-surface-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Confirm send dialog ──────────────────────────────────────────────── */}
      <ConfirmDialog
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        title="¿Confirmar envío?"
        message={`Se enviará "${title}" a ${previewCount?.toLocaleString() ?? 0} usuario${previewCount !== 1 ? 's' : ''} del segmento "${SEGMENT_LABELS[segment]}". Esta acción no se puede deshacer.`}
        confirmLabel="Sí, enviar"
        onConfirm={handleSend}
        loading={sending}
        variant="primary"
      />
    </div>
  );
}
