import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Dumbbell, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import authService from '../../services/auth.service';
import { getErrorMessage } from '../../lib/errors';

const schema = z
  .object({
    password: z
      .string()
      .min(8, 'Mínimo 8 caracteres')
      .regex(/[A-Z]/, 'Debe incluir una mayúscula')
      .regex(/[a-z]/, 'Debe incluir una minúscula')
      .regex(/\d/, 'Debe incluir un número'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

type FormData = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    if (!token) return;
    setServerError(null);
    try {
      await authService.resetPassword(token, data.password);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: unknown) {
      setServerError(getErrorMessage(err, 'Error al restablecer la contraseña'));
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-surface-50 flex items-center justify-center px-6">
        <div className="max-w-sm w-full text-center animate-slide-up">
          <div className="w-16 h-16 rounded-full bg-accent-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8 text-accent-700" />
          </div>
          <h2 className="text-2xl font-bold text-surface-900 mb-3">¡Contraseña actualizada!</h2>
          <p className="text-surface-600 mb-4">
            Tu contraseña ha sido restablecida correctamente. Te redirigimos al inicio de sesión…
          </p>
          <Link to="/login" className="btn-primary">Ir al inicio de sesión</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-50 flex items-center justify-center px-6">
      <div className="w-full max-w-sm animate-slide-up">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center">
            <Dumbbell className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-surface-900">FitCommunity</span>
        </div>

        <h2 className="text-2xl font-bold text-surface-900 mb-1">Nueva contraseña</h2>
        <p className="text-surface-600 text-sm mb-8">Elige una contraseña segura para tu cuenta.</p>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
          {serverError && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 border border-red-300 text-red-600 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{serverError}</span>
            </div>
          )}

          <div>
            <label htmlFor="password" className="label">Nueva contraseña</label>
            <div className="relative">
              <input
                id="password"
                type={showPwd ? 'text' : 'password'}
                autoComplete="new-password"
                className={`input-field pr-10 ${errors.password ? 'input-field-error' : ''}`}
                {...register('password')}
              />
              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-600" onClick={() => setShowPwd(v => !v)} tabIndex={-1}>
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && <p className="error-message">{errors.password.message}</p>}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="label">Confirmar contraseña</label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirm ? 'text' : 'password'}
                autoComplete="new-password"
                className={`input-field pr-10 ${errors.confirmPassword ? 'input-field-error' : ''}`}
                {...register('confirmPassword')}
              />
              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-600" onClick={() => setShowConfirm(v => !v)} tabIndex={-1}>
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.confirmPassword && <p className="error-message">{errors.confirmPassword.message}</p>}
          </div>

          <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
            {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando…</> : 'Restablecer contraseña'}
          </button>
        </form>
      </div>
    </div>
  );
}
