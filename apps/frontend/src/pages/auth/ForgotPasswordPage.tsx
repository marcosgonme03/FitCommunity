import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dumbbell, AlertCircle, CheckCircle2, Loader2, ArrowLeft } from 'lucide-react';
import authService from '../../services/auth.service';

const schema = z.object({
  email: z.string().email('Email inválido'),
});
type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setServerError(null);
    try {
      await authService.forgotPassword(data.email);
      setSent(true);
    } catch {
      setServerError('Error al enviar el email. Inténtalo de nuevo.');
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-surface-50 flex items-center justify-center px-6">
        <div className="max-w-sm w-full text-center animate-slide-up">
          <div className="w-16 h-16 rounded-full bg-brand-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8 text-brand-600" />
          </div>
          <h2 className="text-2xl font-bold text-surface-900 mb-3">Email enviado</h2>
          <p className="text-surface-600 mb-8">
            Si esa dirección está registrada, recibirás un enlace para restablecer tu contraseña en
            los próximos minutos.
          </p>
          <Link to="/login" className="btn-primary">
            Volver al inicio de sesión
          </Link>
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

        <Link to="/login" className="flex items-center gap-1.5 text-sm text-surface-600 hover:text-surface-900 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Volver
        </Link>

        <h2 className="text-2xl font-bold text-surface-900 mb-1">¿Olvidaste tu contraseña?</h2>
        <p className="text-surface-600 text-sm mb-8">
          Introduce tu email y te enviaremos un enlace para restablecerla.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
          {serverError && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 border border-red-300 text-red-600 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{serverError}</span>
            </div>
          )}

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

          <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
            {isSubmitting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Enviando…</>
            ) : (
              'Enviar enlace'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
