import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowLeft, Check, Sparkles } from 'lucide-react';
import Logo from '../components/ui/Logo';
import { useAuthStore } from '../store/authStore';
import usersService from '../services/users.service';
import { FitnessGoal, ExperienceLevel } from '../types';
import Button from '../components/ui/Button';
import { FITNESS_GOAL_LABELS, EXPERIENCE_LABELS } from '../lib/muscles';
import { toast } from '../components/ui/Toast';

const STEPS = [
  { id: 'welcome', title: 'Bienvenido' },
  { id: 'identity', title: 'Sobre ti' },
  { id: 'physical', title: 'Métricas' },
  { id: 'goal', title: 'Objetivo' },
  { id: 'level', title: 'Nivel' },
  { id: 'review', title: 'Revisar' },
];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user, setUser } = useAuthStore();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const [data, setData] = useState({
    displayName: user?.profile?.displayName ?? user?.email?.split('@')[0] ?? '',
    username: user?.profile?.username ?? '',
    bio: '',
    heightCm: '',
    weightKg: '',
    fitnessGoal: '' as FitnessGoal | '',
    experienceLevel: '' as ExperienceLevel | '',
  });

  function update<K extends keyof typeof data>(key: K, value: (typeof data)[K]) {
    setData((d) => ({ ...d, [key]: value }));
  }

  function canProceed(): boolean {
    switch (STEPS[step].id) {
      case 'welcome': return true;
      case 'identity':
        return data.displayName.length >= 1 && /^[a-zA-Z0-9_]{3,30}$/.test(data.username);
      case 'physical': return true;
      case 'goal': return !!data.fitnessGoal;
      case 'level': return !!data.experienceLevel;
      case 'review': return true;
      default: return false;
    }
  }

  async function handleSubmit() {
    if (!data.fitnessGoal || !data.experienceLevel) return;
    setSubmitting(true);
    try {
      const updated = await usersService.completeOnboarding({
        displayName: data.displayName,
        username: data.username,
        bio: data.bio || undefined,
        heightCm: data.heightCm ? Number(data.heightCm) : undefined,
        weightKg: data.weightKg ? Number(data.weightKg) : undefined,
        fitnessGoal: data.fitnessGoal,
        experienceLevel: data.experienceLevel,
      });
      setUser(updated);
      toast.success('¡Bienvenido a FitCommunity!', 'Tu perfil está listo');
      navigate('/dashboard');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { code?: string; error?: string } } };
      if (e.response?.data?.code === 'USERNAME_TAKEN') {
        toast.error('Username en uso', 'Prueba con otro nombre');
        setStep(1);
      } else {
        toast.error('Error', e.response?.data?.error ?? 'No se pudo completar');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Logo size={32} rounded="lg" className="shadow-glow" />
              <span className="font-bold text-surface-900">FitCommunity</span>
            </div>
            <span className="text-xs text-surface-500 font-medium">
              Paso {step + 1} de {STEPS.length}
            </span>
          </div>
          <div className="h-1.5 bg-surface-200 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-brand-500 to-brand-400 transition-all duration-500"
              style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
          </div>
        </div>

        <div className="bg-white border border-surface-200 rounded-3xl p-6 sm:p-10 min-h-[400px] flex flex-col shadow-soft">
          <div className="flex-1">
            {STEPS[step].id === 'welcome' && (
              <div className="text-center py-8">
                <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-glow mb-6">
                  <Sparkles className="w-9 h-9 text-white" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-surface-900 mb-3">
                  ¡Bienvenido a FitCommunity!
                </h1>
                <p className="text-surface-600 max-w-md mx-auto">
                  Tu app para registrar entrenamientos de gimnasio: ejercicios, series, peso y progreso.
                  Te llevará menos de un minuto configurar el perfil.
                </p>
              </div>
            )}

            {STEPS[step].id === 'identity' && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-xl font-bold text-surface-900">¿Cómo te llamas?</h2>
                  <p className="text-sm text-surface-600 mt-1">Tu nombre y username serán visibles para otros.</p>
                </div>
                <div>
                  <label className="label">Nombre completo</label>
                  <input type="text" value={data.displayName}
                    onChange={(e) => update('displayName', e.target.value)}
                    className="input-field" placeholder="Marcos González" autoFocus />
                </div>
                <div>
                  <label className="label">Nombre de usuario</label>
                  <div className="flex items-center">
                    <span className="px-3 py-2.5 rounded-l-lg bg-surface-100 border border-r-0 border-surface-300 text-surface-500 text-sm">@</span>
                    <input type="text" value={data.username}
                      onChange={(e) => update('username', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                      className="input-field rounded-l-none" placeholder="marcos_lifts" maxLength={30} />
                  </div>
                  <p className="text-xs text-surface-500 mt-1.5">Letras, números y guión bajo. 3-30 caracteres.</p>
                </div>
                <div>
                  <label className="label">Bio (opcional)</label>
                  <textarea value={data.bio} onChange={(e) => update('bio', e.target.value)}
                    className="input-field resize-none" rows={3} maxLength={500}
                    placeholder="Cuéntanos qué te motiva del gimnasio." />
                </div>
              </div>
            )}

            {STEPS[step].id === 'physical' && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-xl font-bold text-surface-900">Tus métricas</h2>
                  <p className="text-sm text-surface-600 mt-1">
                    Necesarias para calcular calorías y personalizar la IA. Puedes saltarlas.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Altura (cm)</label>
                    <input type="number" min={50} max={250} value={data.heightCm}
                      onChange={(e) => update('heightCm', e.target.value)}
                      className="input-field" placeholder="180" />
                  </div>
                  <div>
                    <label className="label">Peso (kg)</label>
                    <input type="number" min={20} max={300} step="0.1" value={data.weightKg}
                      onChange={(e) => update('weightKg', e.target.value)}
                      className="input-field" placeholder="75" />
                  </div>
                </div>
              </div>
            )}

            {STEPS[step].id === 'goal' && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-xl font-bold text-surface-900">¿Cuál es tu objetivo?</h2>
                  <p className="text-sm text-surface-600 mt-1">Esto adapta los planes que te genera la IA.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(Object.entries(FITNESS_GOAL_LABELS) as Array<[FitnessGoal, string]>).map(([k, label]) => {
                    const active = data.fitnessGoal === k;
                    return (
                      <button key={k} type="button" onClick={() => update('fitnessGoal', k)}
                        className={`p-4 rounded-lg border text-left transition-all
                                    ${active ? 'bg-brand-50 border-brand-300 ring-1 ring-brand-200' : 'bg-white border-surface-200 hover:bg-surface-50'}`}>
                        <p className={`font-semibold text-sm ${active ? 'text-surface-900' : 'text-surface-700'}`}>{label}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {STEPS[step].id === 'level' && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-xl font-bold text-surface-900">¿Cuál es tu nivel?</h2>
                  <p className="text-sm text-surface-600 mt-1">Sé honesto. Sirve para emparejarte y para los planes IA.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(Object.entries(EXPERIENCE_LABELS) as Array<[ExperienceLevel, string]>).map(([k, label]) => {
                    const active = data.experienceLevel === k;
                    const desc: Record<ExperienceLevel, string> = {
                      BEGINNER: 'Acabo de empezar / menos de 6 meses',
                      INTERMEDIATE: 'Entreno regular 6 meses - 2 años',
                      ADVANCED: 'Entreno con plan estructurado, +2 años',
                      PROFESSIONAL: 'Soy coach o atleta profesional',
                    };
                    return (
                      <button key={k} type="button" onClick={() => update('experienceLevel', k)}
                        className={`p-4 rounded-lg border text-left transition-all
                                    ${active ? 'bg-brand-50 border-brand-300 ring-1 ring-brand-200' : 'bg-white border-surface-200 hover:bg-surface-50'}`}>
                        <p className={`font-semibold text-sm ${active ? 'text-surface-900' : 'text-surface-700'}`}>{label}</p>
                        <p className="text-xs text-surface-500 mt-1">{desc[k]}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {STEPS[step].id === 'review' && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-xl font-bold text-surface-900">¡Casi listo!</h2>
                  <p className="text-sm text-surface-600 mt-1">Revisa antes de continuar.</p>
                </div>
                <div className="space-y-3">
                  <Row label="Nombre" value={data.displayName} />
                  <Row label="Usuario" value={`@${data.username}`} />
                  {data.bio && <Row label="Bio" value={data.bio} />}
                  {data.heightCm && <Row label="Altura" value={`${data.heightCm} cm`} />}
                  {data.weightKg && <Row label="Peso" value={`${data.weightKg} kg`} />}
                  <Row label="Objetivo" value={data.fitnessGoal ? FITNESS_GOAL_LABELS[data.fitnessGoal] : '—'} />
                  <Row label="Nivel" value={data.experienceLevel ? EXPERIENCE_LABELS[data.experienceLevel] : '—'} />
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 pt-6 border-t border-surface-200 mt-8">
            <Button variant="ghost" disabled={step === 0}
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              leftIcon={<ArrowLeft className="w-4 h-4" />}>
              Atrás
            </Button>
            {step < STEPS.length - 1 ? (
              <Button disabled={!canProceed()} onClick={() => setStep((s) => s + 1)}
                rightIcon={<ArrowRight className="w-4 h-4" />}>
                {step === 0 ? 'Empezar' : 'Continuar'}
              </Button>
            ) : (
              <Button onClick={handleSubmit} loading={submitting}
                rightIcon={<Check className="w-4 h-4" />}>
                Crear mi cuenta
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-surface-100 last:border-0">
      <span className="text-xs text-surface-500 uppercase tracking-wider font-bold">{label}</span>
      <span className="text-sm text-surface-900 text-right max-w-[60%]">{value}</span>
    </div>
  );
}
