import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, AlertCircle, CheckCircle2, Loader2, Check } from 'lucide-react';
import authService from '../../services/auth.service';
import Logo from '../../components/ui/Logo';

const registerSchema = z
  .object({
    email: z.string().email('Email inválido'),
    username: z
      .string()
      .min(3, 'Mínimo 3 caracteres')
      .max(30, 'Máximo 30 caracteres')
      .regex(/^[a-zA-Z0-9_]+$/, 'Solo letras, números y guiones bajos'),
    displayName: z.string().min(2, 'Mínimo 2 caracteres').max(50, 'Máximo 50 caracteres').trim(),
    password: z
      .string()
      .min(8, 'Mínimo 8 caracteres')
      .regex(/[A-Z]/, 'Debe incluir una mayúscula')
      .regex(/[a-z]/, 'Debe incluir una minúscula')
      .regex(/\d/, 'Debe incluir un número'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

type RegisterForm = z.infer<typeof registerSchema>;

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: '8+ caracteres', ok: password.length >= 8 },
    { label: 'Mayúscula', ok: /[A-Z]/.test(password) },
    { label: 'Minúscula', ok: /[a-z]/.test(password) },
    { label: 'Número', ok: /\d/.test(password) },
  ];

  if (!password) return null;

  return (
    <div className="flex gap-2 mt-2 flex-wrap">
      {checks.map(({ label, ok }) => (
        <span
          key={label}
          className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full transition-colors ${
            ok
              ? 'bg-accent-100 text-accent-700'
              : 'bg-surface-100 text-surface-500'
          }`}
        >
          {ok && <Check className="w-3 h-3" />}{label}
        </span>
      ))}
    </div>
  );
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) });

  const passwordValue = watch('password', '');

  const onSubmit = async (data: RegisterForm) => {
    setServerError(null);
    try {
      await authService.register({
        email: data.email,
        password: data.password,
        username: data.username,
        displayName: data.displayName,
      });
      setSuccess(true);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setServerError(error?.response?.data?.error ?? 'Error al registrarse');
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-surface-50 flex items-center justify-center px-6">
        <div className="max-w-sm w-full text-center animate-slide-up">
          <div className="w-16 h-16 rounded-full bg-accent-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8 text-accent-700" />
          </div>
          <h2 className="text-2xl font-bold text-surface-900 mb-3">¡Cuenta creada!</h2>
          <p className="text-surface-600 mb-8">
            Te hemos enviado un email de verificación. Revisa tu bandeja de entrada y haz clic en el
            enlace para activar tu cuenta.
          </p>
          <Link to="/login" className="btn-primary">
            Ir al inicio de sesión
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-50 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm animate-slide-up">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-8">
          <Logo size={36} rounded="xl" className="shadow-soft" />
          <span className="font-bold text-surface-900">FitCommunity</span>
        </div>

        <h2 className="text-2xl font-bold text-surface-900 mb-1">Crear cuenta</h2>
        <p className="text-surface-600 text-sm mb-8">
          Únete a la comunidad. Es gratis.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
          {/* Error alert */}
          {serverError && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 border border-red-300 text-red-600 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{serverError}</span>
            </div>
          )}

          {/* Display name */}
          <div>
            <label htmlFor="displayName" className="label">Nombre completo</label>
            <input
              id="displayName"
              type="text"
              autoComplete="name"
              placeholder="Marcos González"
              className={`input-field ${errors.displayName ? 'input-field-error' : ''}`}
              {...register('displayName')}
            />
            {errors.displayName && <p className="error-message">{errors.displayName.message}</p>}
          </div>

          {/* Username */}
          <div>
            <label htmlFor="username" className="label">Nombre de usuario</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500 text-sm">@</span>
              <input
                id="username"
                type="text"
                autoComplete="username"
                placeholder="marcos_fit"
                className={`input-field pl-7 ${errors.username ? 'input-field-error' : ''}`}
                {...register('username')}
              />
            </div>
            {errors.username && <p className="error-message">{errors.username.message}</p>}
          </div>

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
            <label htmlFor="password" className="label">Contraseña</label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Mínimo 8 caracteres"
                className={`input-field pr-10 ${errors.password ? 'input-field-error' : ''}`}
                {...register('password')}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-600 hover:text-surface-700"
                onClick={() => setShowPassword((v) => !v)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && <p className="error-message">{errors.password.message}</p>}
            <PasswordStrength password={passwordValue} />
          </div>

          {/* Confirm password */}
          <div>
            <label htmlFor="confirmPassword" className="label">Confirmar contraseña</label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirm ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Repite tu contraseña"
                className={`input-field pr-10 ${errors.confirmPassword ? 'input-field-error' : ''}`}
                {...register('confirmPassword')}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-600 hover:text-surface-700"
                onClick={() => setShowConfirm((v) => !v)}
                tabIndex={-1}
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="error-message">{errors.confirmPassword.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary w-full mt-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creando cuenta…
              </>
            ) : (
              'Crear cuenta'
            )}
          </button>

          <p className="text-xs text-surface-500 text-center">
            Al registrarte aceptas nuestros{' '}
            <Link to="/terms" className="text-brand-600 hover:underline">Términos de servicio</Link>{' '}
            y{' '}
            <Link to="/privacy" className="text-brand-600 hover:underline">Política de privacidad</Link>.
          </p>
        </form>

        <p className="text-center text-sm text-surface-600 mt-6">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="text-brand-600 hover:text-brand-700 font-medium transition-colors">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
