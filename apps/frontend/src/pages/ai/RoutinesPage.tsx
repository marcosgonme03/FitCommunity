import { useEffect, useRef, useState } from 'react';
import { Plus, Dumbbell, Star, Trash2, Sparkles, CheckCircle2, Play, Download, Lightbulb, CalendarCheck } from 'lucide-react';
import aiService, { GenerateRoutinePayload } from '../../services/ai.service';
import { GeneratedRoutine, FitnessGoal, ExperienceLevel } from '../../types';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import EmptyState from '../../components/ui/EmptyState';
import Spinner from '../../components/ui/Spinner';
import PremiumGate from '../../components/common/PremiumGate';
import { FITNESS_GOAL_LABELS, EXPERIENCE_LABELS } from '../../lib/muscles';
import { formatDate } from '../../lib/format';
import { toast } from '../../components/ui/Toast';

const EQUIPMENT_OPTS: Array<{ value: 'FULL_GYM' | 'DUMBBELLS' | 'BANDS' | 'BODYWEIGHT_ONLY'; label: string }> = [
  { value: 'FULL_GYM', label: 'Gimnasio completo' },
  { value: 'DUMBBELLS', label: 'Solo mancuernas' },
  { value: 'BANDS', label: 'Bandas elásticas' },
  { value: 'BODYWEIGHT_ONLY', label: 'Solo peso corporal' },
];

function RoutinesInner() {
  const [items, setItems] = useState<GeneratedRoutine[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [detail, setDetail] = useState<GeneratedRoutine | null>(null);

  const [form, setForm] = useState<GenerateRoutinePayload>({
    goal: 'GAIN_MUSCLE',
    daysPerWeek: 4,
    sessionMinutes: 60,
    experienceLevel: 'INTERMEDIATE',
    equipment: ['FULL_GYM'],
    notes: '',
  });

  function load() {
    setLoading(true);
    aiService.listRoutines().then((r) => setItems(r.items)).finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function generate() {
    setGenerating(true);
    try {
      const r = await aiService.generateRoutine(form);
      toast.success('¡Rutina generada!');
      setShowForm(false);
      setDetail(r);
      load();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      toast.error('Error', e.response?.data?.error ?? 'No se pudo generar');
    } finally {
      setGenerating(false);
    }
  }

  async function toggleFav(id: string) {
    try {
      await aiService.toggleRoutineFavorite(id);
      load();
    } catch { toast.error('Error'); }
  }

  async function deleteRoutine(id: string) {
    if (!confirm('¿Borrar rutina?')) return;
    try {
      await aiService.deleteRoutine(id);
      load();
      if (detail?.id === id) setDetail(null);
    } catch { toast.error('Error'); }
  }

  async function activateRoutine(id: string) {
    try {
      await aiService.activateRoutine(id);
      toast.success('Rutina activada', 'Tu sesión del día aparecerá en el Dashboard');
      load();
    } catch { toast.error('Error', 'No se pudo activar la rutina'); }
  }

  async function deactivateRoutine() {
    if (!confirm('¿Desactivar la rutina actual? Dejarás de ver el bloque "hoy te toca..." en el dashboard.')) return;
    try {
      await aiService.deactivateRoutine();
      toast.success('Rutina desactivada');
      load();
    } catch { toast.error('Error'); }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-surface-900">Rutinas con IA</h1>
          <p className="text-surface-600 mt-1 text-sm">Genera rutinas personalizadas con IA.</p>
        </div>
        <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setShowForm(true)}>
          Generar nueva
        </Button>
      </header>

      {loading ? (
        <Spinner label="Cargando..." />
      ) : items.length === 0 ? (
        <EmptyState icon={Sparkles} title="Aún no tienes rutinas"
          description="Genera tu primera rutina personalizada con la IA."
          action={<Button onClick={() => setShowForm(true)}>Generar rutina</Button>} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((r) => {
            const totalDays = r.plan_json.weekly_plan?.length ?? r.days_per_week;
            const idx = Math.min(r.current_day_idx ?? 0, Math.max(0, totalDays - 1));
            const todayFocus = r.plan_json.weekly_plan?.[idx]?.focus;
            return (
              <div key={r.id} className={`bg-white border rounded-2xl p-5 shadow-soft transition-colors group
                            ${r.is_active ? 'border-brand-400 ring-1 ring-brand-200' : 'border-surface-200 hover:border-brand-300'}`}>
                {r.is_active && (
                  <div className="mb-3 space-y-1.5">
                    <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-brand-700 bg-brand-50 px-2 py-1 rounded">
                      <CheckCircle2 className="w-3 h-3" />
                      Rutina activa · Día {idx + 1} / {totalDays}
                    </div>
                    {todayFocus && (
                      <p className="text-xs text-surface-700 flex items-center gap-1.5">
                        <CalendarCheck className="w-3 h-3 text-brand-600" />
                        <span>Hoy te toca: <strong className="text-brand-700">{todayFocus}</strong></span>
                      </p>
                    )}
                  </div>
                )}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <button onClick={() => setDetail(r)} className="text-left flex-1 min-w-0">
                    <h3 className="font-bold text-surface-900 group-hover:text-brand-700 transition-colors">{r.title}</h3>
                    <p className="text-xs text-surface-500 mt-0.5">
                      {r.days_per_week} días · {r.session_minutes} min · {FITNESS_GOAL_LABELS[r.goal]}
                    </p>
                  </button>
                  <div className="flex gap-1">
                    <button onClick={() => toggleFav(r.id)}
                      className={`p-1.5 rounded-lg transition-colors ${r.is_favorite ? 'text-accent-600 bg-accent-50' : 'text-surface-400 hover:text-accent-600'}`}
                      title={r.is_favorite ? 'Quitar favorita' : 'Marcar favorita'}>
                      <Star className={`w-4 h-4 ${r.is_favorite ? 'fill-current' : ''}`} />
                    </button>
                    <button onClick={() => deleteRoutine(r.id)}
                      className="p-1.5 rounded-lg text-surface-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Eliminar">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <p className="text-sm text-surface-600 line-clamp-3">{r.plan_json.summary}</p>
                <div className="flex items-center justify-between gap-2 mt-4">
                  <p className="text-xs text-surface-400">{formatDate(r.created_at)}</p>
                  {r.is_active ? (
                    <button
                      onClick={deactivateRoutine}
                      className="text-xs font-semibold text-surface-600 hover:text-red-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50">
                      Desactivar
                    </button>
                  ) : (
                    <button
                      onClick={() => activateRoutine(r.id)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-brand-500 hover:bg-brand-600 transition-colors px-3 py-1.5 rounded-lg shadow-soft">
                      <Play className="w-3 h-3 fill-current" />
                      Activar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} size="lg"
        title="Generar nueva rutina"
        description="Cuéntanos qué necesitas y la IA te generará un plan personalizado."
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowForm(false)} disabled={generating}>Cancelar</Button>
            <Button onClick={generate} loading={generating} leftIcon={<Sparkles className="w-4 h-4" />}>
              Generar
            </Button>
          </>
        }>
        <div className="space-y-4">
          <div>
            <label className="label">Objetivo</label>
            <select value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value as FitnessGoal })}
              className="input-field">
              {Object.entries(FITNESS_GOAL_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Días/semana</label>
              <input type="number" min={1} max={7} value={form.daysPerWeek}
                onChange={(e) => setForm({ ...form, daysPerWeek: Number(e.target.value) })}
                className="input-field" />
            </div>
            <div>
              <label className="label">Min/sesión</label>
              <input type="number" min={15} max={180} value={form.sessionMinutes}
                onChange={(e) => setForm({ ...form, sessionMinutes: Number(e.target.value) })}
                className="input-field" />
            </div>
          </div>
          <div>
            <label className="label">Nivel de experiencia</label>
            <select value={form.experienceLevel}
              onChange={(e) => setForm({ ...form, experienceLevel: e.target.value as ExperienceLevel })}
              className="input-field">
              {Object.entries(EXPERIENCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Equipamiento disponible</label>
            <div className="grid grid-cols-2 gap-2">
              {EQUIPMENT_OPTS.map((opt) => {
                const active = form.equipment.includes(opt.value);
                return (
                  <button key={opt.value} type="button"
                    onClick={() => setForm({
                      ...form,
                      equipment: active
                        ? form.equipment.filter((e) => e !== opt.value)
                        : [...form.equipment, opt.value],
                    })}
                    className={`p-3 rounded-lg border text-sm font-semibold transition-all
                                ${active ? 'bg-brand-50 border-brand-300 text-brand-700' : 'bg-white border-surface-200 text-surface-700 hover:bg-surface-50'}`}>
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="label">Notas adicionales (opcional)</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
              maxLength={500} rows={3} className="input-field resize-none"
              placeholder="Lesiones, ejercicios que prefieres evitar..." />
          </div>
        </div>
      </Modal>

      {detail && <RoutineDetail routine={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}

function RoutineDetail({ routine, onClose }: { routine: GeneratedRoutine; onClose: () => void }) {
  const [downloading, setDownloading] = useState(false);
  const todayRef = useRef<HTMLDivElement | null>(null);

  // Dia actual SOLO si la rutina esta activa. Usamos el indice (0-based) como
  // fuente de verdad - igual que hace el Dashboard - para que ambos lados
  // muestren siempre el mismo dia.
  const totalDays = routine.plan_json.weekly_plan?.length ?? 0;
  const activeDayIdx = routine.is_active && totalDays > 0
    ? Math.min(routine.current_day_idx ?? 0, totalDays - 1)
    : null;
  const todayDay = activeDayIdx !== null
    ? routine.plan_json.weekly_plan?.[activeDayIdx] ?? null
    : null;

  // Auto-scroll al dia de hoy al abrir el modal (solo si hay rutina activa).
  useEffect(() => {
    if (todayRef.current) {
      const t = setTimeout(() => {
        todayRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 80);
      return () => clearTimeout(t);
    }
  }, [routine.id, activeDayIdx]);

  async function handleDownload() {
    if (downloading) return;
    setDownloading(true);
    try {
      await aiService.downloadRoutinePdf(
        routine.id,
        `rutina-${routine.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`
      );
      toast.success('Descarga iniciada');
    } catch {
      toast.error('Error', 'No se pudo generar el PDF');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      size="xl"
      title={routine.title}
      description={routine.plan_json.summary}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cerrar</Button>
          <Button
            variant="outline"
            loading={downloading}
            leftIcon={<Download className="w-4 h-4" />}
            onClick={handleDownload}
          >
            Descargar PDF
          </Button>
        </>
      }
    >
      <div className="space-y-3 max-h-[60vh] overflow-y-auto -mx-2 px-2">
        {todayDay && activeDayIdx !== null && (
          <div className="bg-gradient-to-br from-brand-50 to-accent-50 border border-brand-200 rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center shrink-0">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-brand-700">
                Día {activeDayIdx + 1} de {totalDays}
              </p>
              <p className="font-bold text-surface-900 truncate">
                Hoy te toca: <span className="text-brand-700">{todayDay.focus}</span>
              </p>
            </div>
          </div>
        )}

        {routine.plan_json.weekly_plan?.map((d, idx) => {
          const isToday = idx === activeDayIdx;
          // Usamos idx + 1 como numero visual (fuente de verdad consistente
          // con el dashboard) en lugar de d.day, que viene del JSON de la IA
          // y podria no ser secuencial.
          const dayNumber = idx + 1;
          return (
            <div
              key={idx}
              ref={isToday ? todayRef : undefined}
              className={
                isToday
                  ? 'bg-gradient-to-br from-brand-50 to-white border-2 border-brand-400 rounded-xl p-4 shadow-soft ring-2 ring-brand-100'
                  : 'bg-surface-50 border border-surface-200 rounded-xl p-4'
              }
            >
              <div className="flex items-center gap-2 mb-3">
                <div
                  className={
                    isToday
                      ? 'w-7 h-7 rounded-md bg-brand-500 text-white flex items-center justify-center font-bold text-sm'
                      : 'w-7 h-7 rounded-md bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-sm'
                  }
                >
                  {dayNumber}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-surface-900">{d.focus}</p>
                    {isToday && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-white bg-brand-500 px-2 py-0.5 rounded">
                        <CalendarCheck className="w-3 h-3" />
                        Hoy
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {d.warmup && <p className="text-xs text-surface-600 mb-2"><strong>Calentamiento:</strong> {d.warmup}</p>}
              <div className="space-y-2">
                {d.exercises?.map((ex, i) => (
                  <div key={i} className="bg-white rounded-lg p-2.5 border border-surface-100">
                    <div className="flex items-center gap-2">
                      <Dumbbell className="w-3.5 h-3.5 text-brand-600" />
                      <span className="text-sm font-semibold text-surface-900">{ex.name}</span>
                    </div>
                    <p className="text-xs text-surface-600 mt-1">
                      {ex.sets}×{ex.reps} reps · descanso {ex.rest_sec}s
                      {ex.notes && ` · ${ex.notes}`}
                    </p>
                  </div>
                ))}
              </div>
              {d.cooldown && <p className="text-xs text-surface-600 mt-2"><strong>Vuelta a la calma:</strong> {d.cooldown}</p>}
            </div>
          );
        })}
        {routine.plan_json.tips?.length ? (
          <div className="bg-brand-50 border border-brand-200 rounded-xl p-4">
            <p className="font-bold text-brand-900 text-sm mb-2 flex items-center gap-1.5">
              <Lightbulb className="w-4 h-4" />
              Consejos
            </p>
            <ul className="text-sm text-brand-800 space-y-1 list-disc list-inside">
              {routine.plan_json.tips.map((t, i) => <li key={i}>{t}</li>)}
            </ul>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}

export default function RoutinesPage() {
  return (
    <PremiumGate featureName="el generador de rutinas">
      <RoutinesInner />
    </PremiumGate>
  );
}
