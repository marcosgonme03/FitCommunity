import { useState } from 'react';
import { ShieldCheck, Loader2, AlertCircle, ArrowRight, X } from 'lucide-react';
import TotpCodeInput from './TotpCodeInput';

interface TotpVerifyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerify: (code: string) => Promise<void>;
}

/**
 * Modal de verificación 2FA. Aparece tras introducir password como admin
 * cuando ya hay 2FA activado. Pide el código de 6 dígitos del authenticator.
 */
export default function TotpVerifyModal({
  isOpen,
  onClose,
  onVerify,
}: TotpVerifyModalProps) {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  async function submit(value: string) {
    if (value.length !== 6 || loading) return;
    setLoading(true);
    setError(null);
    try {
      await onVerify(value);
      // El padre cerrará el modal y redirigirá al recibir éxito
    } catch (err) {
      const e = err as { response?: { data?: { error?: string } }; message?: string };
      setError(e?.response?.data?.error ?? e?.message ?? 'Código inválido');
      setCode('');
      setLoading(false);
    }
  }

  function handleClose() {
    if (loading) return;
    setCode('');
    setError(null);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={handleClose}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <div
        className="relative bg-white border border-surface-200 rounded-2xl shadow-2xl
                   w-full max-w-md animate-slide-up overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header con gradiente */}
        <div className="relative bg-gradient-to-br from-surface-900 via-surface-800 to-brand-900 px-6 pt-6 pb-8 text-white overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-brand-500/30 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-accent-500/20 rounded-full blur-3xl pointer-events-none" />

          <button
            onClick={handleClose}
            disabled={loading}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30"
            aria-label="Cancelar"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="relative flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center mb-4 shadow-glow">
              <ShieldCheck className="w-7 h-7 text-brand-300" />
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight">Verificación en dos pasos</h2>
            <p className="text-sm text-white/70 mt-1.5 max-w-xs">
              Abre tu app autenticadora e introduce el código de 6 dígitos.
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-6">
          {error && (
            <div className="flex items-start gap-3 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm mb-5 animate-fade-in">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          <TotpCodeInput
            value={code}
            onChange={setCode}
            onComplete={submit}
            disabled={loading}
            hasError={!!error}
          />

          <p className="text-center text-xs text-surface-500 mt-4">
            El código cambia cada 30 segundos.
          </p>

          <button
            type="button"
            onClick={() => submit(code)}
            disabled={code.length !== 6 || loading}
            className="group btn-primary w-full !py-3 !text-base mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Verificando…
              </>
            ) : (
              <>
                Verificar e iniciar sesión
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="w-full text-center text-sm text-surface-500 hover:text-surface-800 mt-3 py-2 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
