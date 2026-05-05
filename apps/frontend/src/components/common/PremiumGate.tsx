import { Link } from 'react-router-dom';
import { Crown, Sparkles } from 'lucide-react';
import { ReactNode } from 'react';
import { useAuth } from '../../hooks/useAuth';
import Button from '../ui/Button';

interface PremiumGateProps {
  children: ReactNode;
  featureName?: string;
  description?: string;
}

export default function PremiumGate({ children, featureName = 'esta función', description }: PremiumGateProps) {
  const { user } = useAuth();
  if (user?.isPremium || user?.role === 'ADMIN') {
    return <>{children}</>;
  }
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto">
      <div className="bg-white border border-surface-200 rounded-3xl p-8 sm:p-12 text-center shadow-soft">
        <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-accent-400 to-brand-500 flex items-center justify-center shadow-glow mb-6">
          <Crown className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-surface-900 mb-3">
          {featureName.charAt(0).toUpperCase() + featureName.slice(1)} es Premium
        </h1>
        <p className="text-surface-600 max-w-md mx-auto mb-6">
          {description ?? 'Hazte Premium por solo 4,99€/mes y desbloquea el coach IA, generador de rutinas, planes de dieta y análisis de progreso.'}
        </p>
        <ul className="text-left max-w-sm mx-auto space-y-2 mb-8">
          {[
            'Coach IA con chat ilimitado',
            'Generador de rutinas personalizadas',
            'Planes de nutrición a medida',
            'Análisis de progreso con IA',
          ].map((b) => (
            <li key={b} className="flex items-start gap-2 text-sm text-surface-700">
              <Sparkles className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
              {b}
            </li>
          ))}
        </ul>
        <Link to="/premium">
          <Button size="lg" leftIcon={<Crown className="w-4 h-4" />}>
            Hazte Premium
          </Button>
        </Link>
      </div>
    </div>
  );
}
