import { useEffect, useState } from 'react';
import { Plus, Apple, Trash2, Sparkles, Download, Lightbulb } from 'lucide-react';
import aiService, { GenerateNutritionPayload } from '../../services/ai.service';
import { NutritionPlan, FitnessGoal } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import EmptyState from '../../components/ui/EmptyState';
import Spinner from '../../components/ui/Spinner';
import PremiumGate from '../../components/common/PremiumGate';
import { FITNESS_GOAL_LABELS } from '../../lib/muscles';
import { formatDate } from '../../lib/format';
import { toast } from '../../components/ui/Toast';

const ACTIVITY_OPTS: Array<{ v: GenerateNutritionPayload['activityLevel']; label: string }> = [
  { v: 'SEDENTARY', label: 'Sedentario' },
  { v: 'LIGHT', label: 'Ligero (1-3 días)' },
  { v: 'MODERATE', label: 'Moderado (3-5 días)' },
  { v: 'INTENSE', label: 'Intenso (6-7 días)' },
  { v: 'EXTREME', label: 'Atleta' },
];

function NutritionInner() {
  const { user } = useAuth();
  const [items, setItems] = useState<NutritionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [detail, setDetail] = useState<NutritionPlan | null>(null);

  const [form, setForm] = useState<GenerateNutritionPayload>({
    goal: user?.profile?.fitnessGoal ?? 'GAIN_MUSCLE',
    heightCm: user?.profile?.heightCm ?? 180,
    weightKg: user?.profile?.weightKg ?? 75,
    age: 25,
    sex: 'MALE',
    activityLevel: 'MODERATE',
  });

  function load() {
    setLoading(true);
    aiService.listNutritionPlans().then((r) => setItems(r.items)).finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function generate() {
    setGenerating(true);
    try {
      const r = await aiService.generateNutrition(form);
      toast.success('¡Plan nutricional generado!');
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

  async function deletePlan(id: string) {
    if (!confirm('¿Borrar plan?')) return;
    try {
      await aiService.deleteNutritionPlan(id);
      load();
      if (detail?.id === id) setDetail(null);
    } catch { toast.error('Error'); }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-surface-900">Planes de nutrición</h1>
          <p className="text-surface-600 mt-1 text-sm">Macros y plan semanal con IA.</p>
        </div>
        <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setShowForm(true)}>
          Generar plan
        </Button>
      </header>

      {loading ? <Spinner label="Cargando..." /> :
       items.length === 0 ? (
        <EmptyState icon={Apple} title="Aún no tienes planes nutricionales"
          description="Calculamos tus macros y te creamos un plan semanal."
          action={<Button onClick={() => setShowForm(true)}>Generar plan</Button>} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((p) => (
            <div key={p.id} className="bg-white border border-surface-200 rounded-2xl p-5 shadow-soft hover:border-brand-300 transition-colors group">
              <div className="flex items-start justify-between mb-3">
                <button onClick={() => setDetail(p)} className="text-left flex-1 min-w-0">
                  <h3 className="font-bold text-surface-900 group-hover:text-brand-700 transition-colors truncate">{p.title}</h3>
                  <p className="text-xs text-surface-500 mt-0.5">{FITNESS_GOAL_LABELS[p.goal]}</p>
                </button>
                <button onClick={() => deletePlan(p.id)}
                  className="p-1.5 rounded-lg text-surface-400 hover:text-red-600 hover:bg-red-50">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center">
                <Stat label="kcal" value={p.daily_calories} />
                <Stat label="P" value={`${p.protein_g}g`} />
                <Stat label="C" value={`${p.carbs_g}g`} />
                <Stat label="G" value={`${p.fat_g}g`} />
              </div>
              <p className="text-xs text-surface-400 mt-3">{formatDate(p.created_at)}</p>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} size="lg"
        title="Generar plan nutricional"
        description="Calcularemos tus calorías y macros, y te crearemos un plan semanal."
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
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">Edad</label>
              <input type="number" min={14} max={100} value={form.age}
                onChange={(e) => setForm({ ...form, age: Number(e.target.value) })}
                className="input-field" />
            </div>
            <div>
              <label className="label">Altura (cm)</label>
              <input type="number" min={120} max={250} value={form.heightCm}
                onChange={(e) => setForm({ ...form, heightCm: Number(e.target.value) })}
                className="input-field" />
            </div>
            <div>
              <label className="label">Peso (kg)</label>
              <input type="number" step="0.1" min={30} max={250} value={form.weightKg}
                onChange={(e) => setForm({ ...form, weightKg: Number(e.target.value) })}
                className="input-field" />
            </div>
          </div>
          <div>
            <label className="label">Sexo</label>
            <select value={form.sex}
              onChange={(e) => setForm({ ...form, sex: e.target.value as 'MALE' | 'FEMALE' | 'OTHER' })}
              className="input-field">
              <option value="MALE">Hombre</option>
              <option value="FEMALE">Mujer</option>
              <option value="OTHER">Otro / prefiero no decir</option>
            </select>
          </div>
          <div>
            <label className="label">Nivel de actividad</label>
            <select value={form.activityLevel}
              onChange={(e) => setForm({ ...form, activityLevel: e.target.value as GenerateNutritionPayload['activityLevel'] })}
              className="input-field">
              {ACTIVITY_OPTS.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
            </select>
          </div>
        </div>
      </Modal>

      {detail && <NutritionDetail plan={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-surface-50 rounded p-2">
      <p className="text-[10px] text-surface-500 uppercase font-bold">{label}</p>
      <p className="text-sm font-bold text-surface-900">{value}</p>
    </div>
  );
}

function NutritionDetail({ plan, onClose }: { plan: NutritionPlan; onClose: () => void }) {
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    if (downloading) return;
    setDownloading(true);
    try {
      await aiService.downloadNutritionPdf(
        plan.id,
        `dieta-${plan.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`
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
      title={plan.title}
      description={plan.plan_json.summary}
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
        <div className="grid grid-cols-4 gap-2 bg-brand-50 rounded-xl p-3">
          <div className="text-center">
            <p className="text-[10px] text-brand-700 font-bold uppercase">Kcal</p>
            <p className="text-xl font-bold text-brand-900">{plan.daily_calories}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-brand-700 font-bold uppercase">Proteína</p>
            <p className="text-xl font-bold text-brand-900">{plan.protein_g}g</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-brand-700 font-bold uppercase">Carbs</p>
            <p className="text-xl font-bold text-brand-900">{plan.carbs_g}g</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-brand-700 font-bold uppercase">Grasas</p>
            <p className="text-xl font-bold text-brand-900">{plan.fat_g}g</p>
          </div>
        </div>
        {plan.plan_json.weekly_plan?.map((d, idx) => (
          <div key={idx} className="bg-surface-50 border border-surface-200 rounded-xl p-4">
            <p className="font-bold text-surface-900 mb-2">{d.day}</p>
            <div className="space-y-2">
              {d.meals?.map((m, i) => (
                <div key={i} className="bg-white rounded-lg p-3 border border-surface-100">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-semibold text-sm text-surface-900">{m.name}</p>
                    <span className="text-xs text-surface-500">{m.kcal} kcal</span>
                  </div>
                  <ul className="text-xs text-surface-600 list-disc list-inside space-y-0.5">
                    {m.items?.map((it, j) => <li key={j}>{it}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        ))}
        {plan.plan_json.tips?.length ? (
          <div className="bg-brand-50 border border-brand-200 rounded-xl p-4">
            <p className="font-bold text-brand-900 text-sm mb-2 flex items-center gap-1.5">
              <Lightbulb className="w-4 h-4" />
              Consejos
            </p>
            <ul className="text-sm text-brand-800 space-y-1 list-disc list-inside">
              {plan.plan_json.tips.map((t, i) => <li key={i}>{t}</li>)}
            </ul>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}

export default function NutritionPage() {
  return (
    <PremiumGate featureName="los planes nutricionales">
      <NutritionInner />
    </PremiumGate>
  );
}
