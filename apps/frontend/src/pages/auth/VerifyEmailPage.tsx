import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2, Dumbbell } from 'lucide-react';
import authService from '../../services/auth.service';

export default function VerifyEmailPage() {
  const { token } = useParams<{ token: string }>();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Token inválido o ausente.');
      return;
    }

    authService
      .verifyEmail(token)
      .then(() => {
        setStatus('success');
        setMessage('Tu email ha sido verificado correctamente. Ya puedes iniciar sesión.');
      })
      .catch((err: unknown) => {
        const error = err as { response?: { data?: { error?: string } } };
        setStatus('error');
        setMessage(error?.response?.data?.error ?? 'No se pudo verificar el email.');
      });
  }, [token]);

  return (
    <div className="min-h-screen bg-surface-50 flex items-center justify-center px-6">
      <div className="w-full max-w-sm text-center animate-slide-up">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center">
            <Dumbbell className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-surface-900">FitCommunity</span>
        </div>

        {status === 'loading' && (
          <>
            <div className="w-16 h-16 rounded-full bg-brand-100 flex items-center justify-center mx-auto mb-6">
              <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
            </div>
            <h2 className="text-2xl font-bold text-surface-900 mb-3">Verificando email…</h2>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 rounded-full bg-accent-100 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-8 h-8 text-accent-700" />
            </div>
            <h2 className="text-2xl font-bold text-surface-900 mb-3">¡Email verificado!</h2>
            <p className="text-surface-600 mb-8">{message}</p>
            <Link to="/login" className="btn-primary">Iniciar sesión</Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-surface-900 mb-3">Error de verificación</h2>
            <p className="text-surface-600 mb-8">{message}</p>
            <Link to="/login" className="btn-secondary">Volver al inicio de sesión</Link>
          </>
        )}
      </div>
    </div>
  );
}
