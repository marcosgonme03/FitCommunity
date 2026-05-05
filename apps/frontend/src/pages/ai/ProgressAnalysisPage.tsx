import { useState } from 'react';
import {
  TrendingUp, Sparkles, Activity, Clock, Flame, Dumbbell,
  Target, Zap, Heart, Shield, Scale, BarChart3, Trophy,
  ChevronDown, ChevronUp, MessageSquareQuote, RotateCcw,
} from 'lucide-react';
import aiService, { ProgressAnalysis, AnalysisFocus, AnalysisOptions } from '../../services/ai.service';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import StatCard from '../../components/ui/StatCard';
import EmptyState from '../../components/ui/EmptyState';
import PremiumGate from '../../components/common/PremiumGate';
import { formatNumber, formatMinutesAsHours } from '../../lib/format';
import { ALL_MUSCLES, MUSCLE_LABELS } from '../../lib/muscles';
import { toast } from '../../components/ui/Toast';

// ─── Configuración de focos ───────────────────────────────────────────────

const FOCUS_OPTIONS: Array<{
  value: AnalysisFocus;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
}> = [
  {
    value: 'GENERAL',
    label: 'Análisis general',
    description: 'Visión global equilibrada de tu progreso',
    icon: BarChart3,
    color: 'text-brand-600 bg-brand-50 border-brand-200',
  },
  {
    value: 'STRENGTH',
    label: 'Fuerza máxima',
    description: 'Foco en 1RM y desarrollo de fuerza',
    icon: Trophy,
    color: 'text-amber-600 bg-amber-50 border-amber-200',
  },
  {
    value: 'HYPERTROPHY',
    label: 'Hipertrofia',
    description: 'Ganancia de masa muscular y volumen',
    icon: Dumbbell,
    color: 'text-purple-600 bg-purple-50 border-purple-200',
  },
  {
    value: 'WEIGHT_LOSS',
    label: 'Pérdida de grasa',
    description: 'Composición corporal y déficit calórico',
    icon: Flame,
    color: 'text-red-600 bg-red-50 border-red-200',
  },
  {
    value: 'RECOVERY',
    label: 'Recuperación',
    description: 'Descanso y prevención de overtraining',
    icon: Heart,
    color: 'text-pink-600 bg-pink-50 border-pink-200',
  },
  {
    value: 'MUSCLE_BALANCE',
    label: 'Balance muscular',
    description: 'Detección de desequilibrios y simetría',
    icon: Scale,
    color: 'text-blue-600 bg-blue-50 border-blue-200',
  },
  {
    value: 'INJURY_PREVENTION',
    label: 'Prevención de lesiones',
    description: 'Técnica, sobrecarga y zonas de riesgo',
    icon: Shield,
    color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  },
];

const PERIOD_OPTIONS = [
  { value: 7, label: 'Última semana' },
  { value: 30, label: 'Último mes' },
  { value: 90, label: 'Últimos 3 meses' },
  { value: 180, label: 'Últimos 6 meses' },
  { value: 365, label: 'Último año' },
];

// ─── Markdown renderer simple (h2 + bullets + parrafos) ───────────────────
function MarkdownAnalysis({ text }: { text: string }) {
  const blocks = text.split(/\n(?=##\s)/g);
  return (
    <div className="space-y-5">
      {blocks.map((block, idx) => {
        const lines = block.split('\n');
        const headingMatch = lines[0]?.match(/^##\s+(.+)$/);
        if (headingMatch) {
          const heading = headingMatch[1];
          const content = lines.slice(1).join('\n').trim();
          return (
            <div key={idx} className="bg-white border border-surface-200 rounded-xl p-5">
              <h3 className="font-bold text-surface-900 text-base mb-3">{heading}</h3>
              <div className="text-sm text-surface-700 leading-relaxed whitespace-pre-wrap">
                {content}
              </div>
            </div>
          );
        }
        // Bloque sin heading (intro)
        return (
          <div key={idx} className="text-sm text-surface-700 leading-relaxed whitespace-pre-wrap">
            {block}
          </div>
        );
      })}
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────

function ProgressInner() {
  const [analysis, setAnalysis] = useState<ProgressAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [options, setOptions] = useState<Required<Pick<AnalysisOptions, 'periodDays' | 'focus'>> & {
    muscleFocus: string;
    customQuestion: string;
  }>({
    periodDays: 30,
    focus: 'GENERAL',
    muscleFocus: '',
    customQuestion: '',
  });

  async function analyze() {
    setLoading(true);
    try {
      const r = await aiService.analyzeProgress({
        periodDays: options.periodDays,
        focus: options.focus,
        muscleFocus: options.muscleFocus || undefined,
        customQuestion: options.customQuestion || undefined,
      });
      setAnalysis(r);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string; code?: string } } };
      const code = e.response?.data?.code;
      if (code === 'NOT_ENOUGH_DATA') {
        toast.warning('Sin datos suficientes', e.response?.data?.error ?? '');
      } else {
        toast.error('Error', e.response?.data?.error ?? 'No se pudo analizar');
      }
    } finally {
      setLoading(false);
    }
  }

  const selectedFocus = FOCUS_OPTIONS.find((f) => f.value === options.focus)!;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold text-surface-900">Análisis de progreso IA</h1>
        <p className="text-surface-600 mt-1 text-sm">
          La IA analiza tus datos y te da feedback experto y accionable según el foco que elijas.
        </p>
      </header>

      {/* ─── Panel de configuración ─────────────────────────────────────── */}
      <section className="bg-white border border-surface-200 rounded-2xl p-5 shadow-soft space-y-5">
        {/* Foco del análisis */}
        <div>
          <label className="label flex items-center gap-2 mb-3">
            <Target className="w-4 h-4 text-brand-600" />
            Foco del análisis
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {FOCUS_OPTIONS.map((f) => {
              const active = options.focus === f.value;
              return (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setOptions((o) => ({ ...o, focus: f.value }))}
                  className={`text-left p-3 rounded-xl border-2 transition-all
                              ${active
                                ? `${f.color} ring-1 ring-current/20`
                                : 'bg-white border-surface-200 hover:border-surface-300'}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <f.icon className={`w-4 h-4 ${active ? '' : 'text-surface-500'}`} />
                    <span className={`text-sm font-bold ${active ? '' : 'text-surface-900'}`}>
                      {f.label}
                    </span>
                  </div>
                  <p className={`text-[11px] leading-tight ${active ? 'opacity-80' : 'text-surface-500'}`}>
                    {f.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Periodo */}
        <div>
          <label className="label flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-brand-600" />
            Periodo a analizar
          </label>
          <div className="flex flex-wrap gap-2">
            {PERIOD_OPTIONS.map((p) => {
              const active = options.periodDays === p.value;
              return (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setOptions((o) => ({ ...o, periodDays: p.value }))}
                  className={`text-sm font-semibold px-4 py-2 rounded-lg border transition-all
                              ${active
                                ? 'bg-brand-100 text-brand-700 border-brand-300'
                                : 'bg-white text-surface-600 border-surface-200 hover:bg-surface-50'}`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Toggle avanzado */}
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="flex items-center gap-2 text-sm font-semibold text-brand-600 hover:text-brand-700 transition-colors"
        >
          {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          Opciones avanzadas
        </button>

        {showAdvanced && (
          <div className="space-y-4 pt-1 border-t border-surface-200 -mt-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
              {/* Grupo muscular específico */}
              <div>
                <label className="label flex items-center gap-2">
                  <Dumbbell className="w-4 h-4 text-brand-600" />
                  Grupo muscular específico (opcional)
                </label>
                <select
                  value={options.muscleFocus}
                  onChange={(e) => setOptions((o) => ({ ...o, muscleFocus: e.target.value }))}
                  className="input-field"
                >
                  <option value="">Todos los grupos</option>
                  {ALL_MUSCLES.map((m) => (
                    <option key={m} value={m}>{MUSCLE_LABELS[m]}</option>
                  ))}
                </select>
                <p className="text-xs text-surface-500 mt-1">
                  La IA prestará especial atención a este grupo muscular.
                </p>
              </div>
            </div>

            {/* Pregunta libre */}
            <div>
              <label className="label flex items-center gap-2">
                <MessageSquareQuote className="w-4 h-4 text-brand-600" />
                Pregunta o preocupación específica (opcional)
              </label>
              <textarea
                value={options.customQuestion}
                onChange={(e) => setOptions((o) => ({ ...o, customQuestion: e.target.value }))}
                maxLength={500}
                rows={3}
                className="input-field resize-none"
                placeholder="Ej: ¿Estoy entrenando demasiado las piernas? ¿Por qué no progreso en el press banca?"
              />
              <p className="text-xs text-surface-500 mt-1">
                {options.customQuestion.length}/500 caracteres
              </p>
            </div>
          </div>
        )}

        {/* Acción principal */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-surface-200">
          <Button
            leftIcon={<Sparkles className="w-4 h-4" />}
            onClick={analyze}
            loading={loading}
            fullWidth
            className="!py-3"
          >
            {analysis ? 'Volver a analizar' : 'Analizar mi progreso'}
          </Button>
          {analysis && (
            <Button
              variant="ghost"
              leftIcon={<RotateCcw className="w-4 h-4" />}
              onClick={() => setAnalysis(null)}
            >
              Limpiar
            </Button>
          )}
        </div>
      </section>

      {/* ─── Estado vacío inicial ────────────────────────────────────────── */}
      {!analysis && !loading && (
        <EmptyState
          icon={TrendingUp}
          title="Configura y analiza"
          description={`Foco actual: ${selectedFocus.label} · Periodo: ${PERIOD_OPTIONS.find((p) => p.value === options.periodDays)?.label}. Pulsa "Analizar" para que la IA revise tus datos.`}
        />
      )}

      {loading && <Spinner fullScreen label={`Analizando con foco en ${selectedFocus.label.toLowerCase()}…`} />}

      {/* ─── Resultados ──────────────────────────────────────────────────── */}
      {analysis && !loading && (
        <>
          {/* Stats */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={Activity}
              label="Entrenamientos"
              value={analysis.stats.totalWorkouts}
              hint={
                analysis.stats.workoutsPerWeek
                  ? `${analysis.stats.workoutsPerWeek}/semana`
                  : `últimos ${analysis.stats.periodDays ?? 30}d`
              }
              accent="brand"
            />
            <StatCard
              icon={Clock}
              label="Horas"
              value={formatMinutesAsHours(analysis.stats.totalMinutes)}
              hint={`media ${analysis.stats.avgMinutes} min`}
              accent="accent"
            />
            <StatCard
              icon={Flame}
              label="Calorías"
              value={formatNumber(analysis.stats.totalCalories)}
              hint="estimadas"
              accent="orange"
            />
            <StatCard
              icon={Dumbbell}
              label="Volumen total"
              value={analysis.stats.totalVolume ? `${formatNumber(analysis.stats.totalVolume)} kg` : '—'}
              hint={
                analysis.stats.totalSets ? `${formatNumber(analysis.stats.totalSets)} series` : 'sin peso'
              }
              accent="red"
            />
          </section>

          {/* Header del análisis */}
          <article className="bg-gradient-to-br from-brand-50 via-white to-accent-50 border border-brand-200 rounded-2xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-accent-400 to-brand-500 flex items-center justify-center shadow-glow">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-bold text-surface-900">Análisis del Coach IA</p>
                  <p className="text-xs text-surface-600">
                    Foco: {selectedFocus.label} · {analysis.params?.periodDays ?? options.periodDays} días
                    {analysis.params?.muscleFocus && ` · ${MUSCLE_LABELS[analysis.params.muscleFocus as keyof typeof MUSCLE_LABELS] ?? analysis.params.muscleFocus}`}
                  </p>
                </div>
              </div>
              <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-brand-700 bg-white border border-brand-200 px-2.5 py-1 rounded">
                <Zap className="w-3 h-3" />
                Generado por IA
              </div>
            </div>

            {/* Detected intent: muestra al usuario qué detectó la IA en su pregunta */}
            {analysis.detectedIntent && (
              analysis.detectedIntent.matchedExerciseName ||
              analysis.detectedIntent.matchedMuscle ||
              analysis.detectedIntent.mentionsProgress ||
              analysis.detectedIntent.mentionsRest ||
              analysis.detectedIntent.mentionsBalance
            ) && (
              <div className="mt-4 pt-4 border-t border-brand-100">
                <p className="text-[11px] font-bold uppercase tracking-wider text-surface-500 mb-2">
                  Datos específicos analizados para tu pregunta
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {analysis.detectedIntent.matchedExerciseName && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 bg-white border border-brand-200 px-2.5 py-1 rounded">
                      <Dumbbell className="w-3 h-3" />
                      {analysis.detectedIntent.matchedExerciseName}
                    </span>
                  )}
                  {analysis.detectedIntent.matchedMuscle && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 bg-white border border-brand-200 px-2.5 py-1 rounded">
                      <Target className="w-3 h-3" />
                      {MUSCLE_LABELS[analysis.detectedIntent.matchedMuscle as keyof typeof MUSCLE_LABELS] ?? analysis.detectedIntent.matchedMuscle}
                    </span>
                  )}
                  {analysis.detectedIntent.mentionsProgress && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 bg-white border border-brand-200 px-2.5 py-1 rounded">
                      <TrendingUp className="w-3 h-3" />
                      Progresión / estancamiento
                    </span>
                  )}
                  {analysis.detectedIntent.mentionsRest && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 bg-white border border-brand-200 px-2.5 py-1 rounded">
                      <Heart className="w-3 h-3" />
                      Descanso / fatiga
                    </span>
                  )}
                  {analysis.detectedIntent.mentionsBalance && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 bg-white border border-brand-200 px-2.5 py-1 rounded">
                      <Scale className="w-3 h-3" />
                      Balance muscular
                    </span>
                  )}
                </div>
              </div>
            )}
          </article>

          {/* Análisis */}
          <MarkdownAnalysis text={analysis.analysis} />

          {/* Distribución muscular si existe */}
          {analysis.stats.muscleDistribution && analysis.stats.muscleDistribution.length > 0 && (
            <article className="bg-white border border-surface-200 rounded-2xl p-5">
              <h3 className="font-bold text-surface-900 mb-3">Distribución por grupo muscular</h3>
              <div className="space-y-2">
                {analysis.stats.muscleDistribution.slice(0, 8).map((m) => {
                  const max = Math.max(...analysis.stats.muscleDistribution!.map((x) => x.count));
                  const pct = (m.count / max) * 100;
                  return (
                    <div key={m.muscle} className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-surface-700 w-24 shrink-0 truncate">
                        {MUSCLE_LABELS[m.muscle as keyof typeof MUSCLE_LABELS] ?? m.muscle}
                      </span>
                      <div className="flex-1 h-2 bg-surface-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-brand-400 to-brand-600 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-surface-900 w-10 text-right shrink-0">
                        {m.count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </article>
          )}
        </>
      )}
    </div>
  );
}

export default function ProgressAnalysisPage() {
  return (
    <PremiumGate featureName="el análisis de progreso">
      <ProgressInner />
    </PremiumGate>
  );
}
