import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, Crown, Sparkles, MessageSquare, Dumbbell, Apple, TrendingUp, X } from 'lucide-react';
import billingService from '../services/billing.service';
import { useAuth } from '../hooks/useAuth';
import Button from '../components/ui/Button';
import { toast } from '../components/ui/Toast';

const FREE_FEATURES = [
  'Registrar entrenamientos ilimitados',
  'Series, repes y peso por ejercicio',
  'Calendario y estadísticas básicas',
  'Marcas personales (PRs)',
  'Feed social y comunidad',
];

const PREMIUM_FEATURES = [
  { icon: MessageSquare, label: 'Coach IA con chat ilimitado' },
  { icon: Dumbbell, label: 'Generador de rutinas personalizadas' },
  { icon: Apple, label: 'Planes de nutrición a medida' },
  { icon: TrendingUp, label: 'Análisis de progreso con IA' },
  { icon: Sparkles, label: 'Estadísticas avanzadas' },
];

export default function PricingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  async function handleUpgrade() {
    setLoading(true);
    try {
      const { url } = await billingService.createCheckout();
      window.location.href = url;
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      toast.error('Error al iniciar el pago', e.response?.data?.error ?? 'Inténtalo de nuevo');
      setLoading(false);
    }
  }

  if (user?.isPremium) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto">
        <div className="bg-white border border-surface-200 rounded-3xl p-10 text-center shadow-soft">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-accent-400 to-brand-500 flex items-center justify-center shadow-glow mb-6">
            <Crown className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-surface-900 mb-2">Ya eres Premium</h1>
          <p className="text-surface-600 mb-6">Tienes acceso a todas las funciones de IA.</p>
          <div className="flex gap-2 justify-center">
            <Link to="/coach"><Button>Coach IA</Button></Link>
            <Link to="/settings"><Button variant="outline">Gestionar suscripción</Button></Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <button
        onClick={() => navigate(-1)}
        className="text-surface-600 hover:text-surface-900 text-sm font-medium mb-6"
      >
        ← Volver
      </button>

      <header className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-accent-100 to-brand-100 rounded-full mb-4">
          <Crown className="w-4 h-4 text-brand-700" />
          <span className="text-xs font-bold uppercase tracking-wider text-brand-700">FitCommunity Premium</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-bold text-surface-900 mb-3">
          Tu coach de gimnasio,<br />ahora con IA.
        </h1>
        <p className="text-surface-600 max-w-xl mx-auto text-lg">
          Por menos del precio de un café, desbloquea rutinas personalizadas,
          planes de dieta y un coach IA disponible 24/7.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Free */}
        <div className="bg-white border border-surface-200 rounded-2xl p-8">
          <div className="mb-6">
            <p className="text-xs font-bold uppercase tracking-wider text-surface-500">Free</p>
            <h2 className="text-3xl font-bold text-surface-900 mt-1">0€<span className="text-lg font-normal text-surface-500">/mes</span></h2>
          </div>
          <ul className="space-y-3 mb-8">
            {FREE_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-surface-700">
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                {f}
              </li>
            ))}
            <li className="flex items-start gap-2 text-sm text-surface-400">
              <X className="w-4 h-4 shrink-0 mt-0.5" />
              Coach IA y planes generados
            </li>
          </ul>
          <Button variant="outline" fullWidth disabled>
            Tu plan actual
          </Button>
        </div>

        {/* Premium */}
        <div className="relative bg-white border-2 border-brand-500 rounded-2xl p-8 shadow-glow">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-accent-400 to-brand-500 text-white text-xs font-bold uppercase tracking-wider rounded-full shadow-soft">
            Recomendado
          </div>
          <div className="mb-6">
            <p className="text-xs font-bold uppercase tracking-wider text-brand-700">Premium</p>
            <h2 className="text-3xl font-bold text-surface-900 mt-1">
              4,99€<span className="text-lg font-normal text-surface-500">/mes</span>
            </h2>
            <p className="text-xs text-surface-500 mt-1">Cancela cuando quieras</p>
          </div>
          <ul className="space-y-3 mb-8">
            <li className="flex items-start gap-2 text-sm text-surface-700 font-semibold">
              <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              Todo lo del plan Free
            </li>
            {PREMIUM_FEATURES.map((f) => (
              <li key={f.label} className="flex items-start gap-2 text-sm text-surface-700">
                <f.icon className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
                {f.label}
              </li>
            ))}
          </ul>
          <Button fullWidth loading={loading} onClick={handleUpgrade}
            leftIcon={<Crown className="w-4 h-4" />}>
            Hazte Premium · 4,99€/mes
          </Button>
          <p className="text-[10px] text-center text-surface-400 mt-3">
            Pago seguro con Stripe · IVA incluido
          </p>
        </div>
      </div>

      <div className="mt-10 bg-surface-100 rounded-2xl p-6 text-center">
        <p className="text-sm text-surface-700">
          <strong className="text-surface-900">Modo prueba:</strong> esta integración usa Stripe en modo test.
          Usa la tarjeta <code className="bg-white px-2 py-0.5 rounded font-mono">4242 4242 4242 4242</code>,
          cualquier fecha futura y cualquier CVC.
        </p>
      </div>
    </div>
  );
}
