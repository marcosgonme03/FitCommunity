import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Eye, EyeOff, AlertCircle, Loader2, Activity, Users, TrendingUp,
  Sparkles, Trophy, Heart, ArrowRight, ShieldCheck,
} from 'lucide-react';
import authService from '../../services/auth.service';
import { useAuthStore } from '../../store/authStore';
import Logo from '../../components/ui/Logo';
import { getErrorMessage, getErrorCode } from '../../lib/errors';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Contraseña requerida'),
  totpCode: z.string().optional(),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [showPassword, setShowPassword] = useState(false);
  const [needsTotp, setNeedsTotp] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/dashboard';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginForm) => {
    setServerError(null);
    try {
      const { accessToken } = await authService.login(data);
      const user = await authService.getMe();
      setAuth(user, accessToken);

      if (user.role === 'ADMIN') {
        navigate('/admin', { replace: true });
        return;
      }

      if (!user.profile?.onboardingCompleted) {
        navigate('/onboarding', { replace: true });
      } else {
        navigate(from, { replace: true });
      }
    } catch (err: unknown) {
      const code = getErrorCode(err);
      const message = getErrorMessage(err, 'Error al iniciar sesión');

      if (code === 'TOTP_REQUIRED') {
        setNeedsTotp(true);
        setServerError('Introduce tu código 2FA');
      } else {
        setServerError(message);
      }
    }
  };

  return (
    <div className="min-h-screen flex bg-surface-50 relative overflow-hidden">
      {/* ─── Decoración de fondo (subtle, solo en mobile/tablet) ─────────── */}
      <div className="lg:hidden absolute -top-32 -right-32 w-96 h-96 bg-brand-200/30 rounded-full blur-3xl pointer-events-none" />
      <div className="lg:hidden absolute -bottom-32 -left-32 w-96 h-96 bg-accent-200/30 rounded-full blur-3xl pointer-events-none" />

      {/* ─── Panel izquierdo: hero (solo desktop) ────────────────────────── */}
      <div className="hidden lg:flex flex-col justify-between w-[520px] p-12 relative overflow-hidden bg-gradient-to-br from-surface-900 via-surface-800 to-brand-900 text-white">
        {/* Patrones decorativos */}
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-brand-500/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-20 w-96 h-96 bg-accent-500/20 rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(249,115,22,0.15),transparent_50%)]" />

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <Logo size={44} rounded="xl" className="shadow-glow" />
          <div>
            <span className="text-xl font-extrabold tracking-tight">FitCommunity</span>
            <p className="text-[10px] uppercase tracking-[0.2em] text-brand-300 font-bold">Tu app de gimnasio</p>
          </div>
        </div>

        {/* Hero copy */}
        <div className="relative space-y-6 max-w-md">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-xs font-semibold text-brand-200">
            <Sparkles className="w-3 h-3" />
            Con Coach IA · Análisis avanzado · Comunidad activa
          </div>
          <h1 className="text-5xl font-extrabold leading-[1.05] tracking-tight">
            Entrena.<br />
            Progresa.<br />
            <span className="bg-gradient-to-r from-brand-400 to-accent-400 bg-clip-text text-transparent">
              Comparte.
            </span>
          </h1>
          <p className="text-white/80 text-base leading-relaxed">
            Registra cada serie, sigue tu progreso con gráficas avanzadas y comparte tus
            logros con una comunidad de atletas que entrenan tan duro como tú.
          </p>

          {/* Features */}
          <div className="space-y-3 pt-2">
            <FeatureRow icon={Activity} text="Más de 200 ejercicios y 20 deportes" />
            <FeatureRow icon={TrendingUp} text="Estadísticas, PRs y volumen en tiempo real" />
            <FeatureRow icon={Sparkles} text="Coach IA personalizado (Premium)" />
            <FeatureRow icon={Users} text="Feed social con likes y comentarios" />
          </div>
        </div>

        {/* Social proof */}
        <div className="relative grid grid-cols-3 gap-3 text-center">
          <SocialProof icon={Trophy} value="20+" label="Deportes" />
          <SocialProof icon={Activity} value="200+" label="Ejercicios" />
          <SocialProof icon={Heart} value="100%" label="Gratis (MVP)" />
        </div>
      </div>

      {/* ─── Panel derecho: formulario ────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 relative">
        <div className="w-full max-w-md animate-slide-up">
          {/* Logo móvil */}
          <div className="flex lg:hidden items-center gap-3 mb-10">
            <Logo size={40} rounded="xl" className="shadow-glow" />
            <div>
              <span className="font-extrabold text-surface-900 text-lg">FitCommunity</span>
              <p className="text-[10px] uppercase tracking-wider text-brand-600 font-bold leading-none">
                Tu app de gimnasio
              </p>
            </div>
          </div>

          {/* Encabezado */}
          <div className="mb-8">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-surface-900 tracking-tight">
              Bienvenido de vuelta
            </h2>
            <p className="text-surface-600 text-sm mt-2">
              Inicia sesión para ver tu progreso y seguir entrenando.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
            {/* Error alert */}
            {serverError && (
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm animate-fade-in">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span className="font-medium">{serverError}</span>
              </div>
            )}

            {/* Email */}
            <div>
              <label htmlFor="email" className="label">Email</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="tu@email.com"
                className={`input-field ${errors.email ? 'input-field-error' : ''}`}
                {...register('email')}
              />
              {errors.email && <p className="error-message">{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="label mb-0">Contraseña</label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-brand-600 hover:text-brand-700 transition-colors font-semibold"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Tu contraseña"
                  className={`input-field pr-10 ${errors.password ? 'input-field-error' : ''}`}
                  {...register('password')}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-500 hover:text-surface-700 transition-colors"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="error-message">{errors.password.message}</p>}
            </div>

            {/* 2FA code (shown when needed) */}
            {needsTotp && (
              <div className="animate-fade-in p-4 rounded-xl bg-brand-50 border border-brand-200">
                <label htmlFor="totpCode" className="label flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-brand-600" />
                  Código 2FA
                </label>
                <input
                  id="totpCode"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  className="input-field tracking-[0.5em] text-center text-lg font-bold"
                  autoComplete="one-time-code"
                  autoFocus
                  {...register('totpCode')}
                />
                <p className="text-xs text-surface-600 mt-2">
                  Introduce el código de 6 dígitos de tu app autenticadora.
                </p>
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="group btn-primary w-full !py-3 !text-base mt-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Iniciando sesión…
                </>
              ) : (
                <>
                  Iniciar sesión
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>

          {/* Separador */}
          <div className="flex items-center gap-3 my-8">
            <div className="flex-1 h-px bg-surface-200" />
            <span className="text-xs uppercase tracking-wider text-surface-500 font-semibold">o</span>
            <div className="flex-1 h-px bg-surface-200" />
          </div>

          {/* CTA registro */}
          <div className="text-center">
            <p className="text-sm text-surface-600 mb-3">¿No tienes cuenta todavía?</p>
            <Link
              to="/register"
              className="inline-flex items-center justify-center gap-2 w-full px-5 py-3 rounded-lg
                         border-2 border-surface-200 hover:border-brand-300 hover:bg-brand-50/50
                         text-surface-900 font-semibold text-sm transition-all"
            >
              Crear cuenta gratis
              <ArrowRight className="w-4 h-4" />
            </Link>
            <p className="text-[11px] text-surface-500 mt-4 leading-relaxed">
              Al continuar aceptas nuestros{' '}
              <a href="#" className="text-surface-700 underline hover:text-brand-700 transition-colors">
                Términos
              </a>{' '}
              y la{' '}
              <a href="#" className="text-surface-700 underline hover:text-brand-700 transition-colors">
                Política de privacidad
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Subcomponents del hero ──────────────────────────────────────────────────

function FeatureRow({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-white/10 backdrop-blur-sm border border-white/15 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-brand-300" />
      </div>
      <span className="text-sm text-white/90">{text}</span>
    </div>
  );
}

function SocialProof({
  icon: Icon,
  value,
  label,
}: {
  icon: React.ElementType;
  value: string;
  label: string;
}) {
  return (
    <div className="rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 p-3">
      <Icon className="w-5 h-5 text-brand-400 mx-auto mb-1.5" />
      <p className="text-xl font-extrabold text-white">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-white/60 mt-0.5">{label}</p>
    </div>
  );
}
