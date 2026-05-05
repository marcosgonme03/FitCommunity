import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Check, Crown } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useAuthStore } from '../../store/authStore';
import authService from '../../services/auth.service';
import Button from '../../components/ui/Button';

export default function CheckoutSuccessPage() {
  const { user } = useAuth();
  const { setUser } = useAuthStore();

  useEffect(() => {
    // Refresh user data after webhook updates is_premium
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      try {
        const fresh = await authService.getMe();
        setUser(fresh);
        if (fresh.isPremium || attempts >= 5) clearInterval(interval);
      } catch {
        if (attempts >= 5) clearInterval(interval);
      }
    }, 2000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-surface-50 flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-white border border-surface-200 rounded-3xl p-10 text-center shadow-soft">
        <div className="w-20 h-20 mx-auto rounded-full bg-emerald-100 flex items-center justify-center mb-6">
          <Check className="w-10 h-10 text-emerald-600" strokeWidth={3} />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-surface-900 mb-3">
          Pago completado
        </h1>
        <p className="text-surface-600 mb-2">
          Bienvenido a <strong className="text-brand-700">FitCommunity Premium</strong>.
        </p>
        <p className="text-sm text-surface-500 mb-8">
          {user?.isPremium
            ? 'Tu suscripción está activa.'
            : 'Estamos activando tu suscripción. Esto puede tardar unos segundos...'}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/coach">
            <Button leftIcon={<Crown className="w-4 h-4" />}>
              Empezar con el Coach IA
            </Button>
          </Link>
          <Link to="/dashboard">
            <Button variant="outline">Ir al dashboard</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
