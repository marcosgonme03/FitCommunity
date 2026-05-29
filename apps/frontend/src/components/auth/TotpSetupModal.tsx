import { useEffect, useState } from 'react';
import {
  ShieldCheck,
  Loader2,
  AlertCircle,
  ArrowRight,
  X,
  Smartphone,
  KeyRound,
  Copy,
  Check,
} from 'lucide-react';
import authService from '../../services/auth.service';
import TotpCodeInput from './TotpCodeInput';

interface TotpSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  setupToken: string;
  /** Llamado cuando la verificación es exitosa, recibe el accessToken final */
  onSuccess: (accessToken: string) => Promise<void> | void;
}

type Step = 'qr' | 'verify';

/**
 * Modal de setup obligatorio de 2FA para admins. Muestra el QR + secret
 * manual, y al pulsar "Continuar" pide el código de 6 dígitos para confirmar
 * que la app autenticadora está bien configurada.
 */
export default function TotpSetupModal({
  isOpen,
  onClose,
  setupToken,
  onSuccess,
}: TotpSetupModalProps) {
  const [step, setStep] = useState<Step>('qr');
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState<string>('');
  const [pendingToken, setPendingToken] = useState<string>('');
  const [code, setCode] = useState('');
  const [loadingQr, setLoadingQr] = useState(false);
  const [loadingVerify, setLoadingVerify] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Al abrirse, pide el QR
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    (async () => {
      setLoadingQr(true);
      setError(null);
      try {
        const res = await authService.setup2FAChallenge(setupToken);
        if (cancelled) return;
        setQrCodeUrl(res.qrCodeUrl);
        setSecret(res.secret);
        setPendingToken(res.pendingToken);
      } catch (err) {
        if (cancelled) return;
        const e = err as { response?: { data?: { error?: string } }; message?: string };
        setError(
          e?.response?.data?.error ??
            e?.message ??
            'No se pudo generar el QR. Vuelve a iniciar sesión.'
        );
      } finally {
        if (!cancelled) setLoadingQr(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, setupToken]);

  // Reset al cerrar
  useEffect(() => {
    if (!isOpen) {
      setStep('qr');
      setQrCodeUrl(null);
      setSecret('');
      setPendingToken('');
      setCode('');
      setError(null);
      setCopied(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  function handleClose() {
    if (loadingVerify) return;
    onClose();
  }

  async function copySecret() {
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* noop */
    }
  }

  async function submitCode(value: string) {
    if (value.length !== 6 || loadingVerify || !pendingToken) return;
    setLoadingVerify(true);
    setError(null);
    try {
      const { accessToken } = await authService.verify2FAChallengeSetup(pendingToken, value);
      await onSuccess(accessToken);
      // El padre cierra el modal y navega
    } catch (err) {
      const e = err as { response?: { data?: { error?: string } }; message?: string };
      setError(e?.response?.data?.error ?? e?.message ?? 'Código inválido');
      setCode('');
      setLoadingVerify(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={handleClose}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <div
        className="relative bg-white border border-surface-200 rounded-2xl shadow-2xl
                   w-full max-w-md animate-slide-up overflow-hidden max-h-[95vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative bg-gradient-to-br from-surface-900 via-surface-800 to-brand-900 px-6 pt-6 pb-7 text-white overflow-hidden shrink-0">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-brand-500/30 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-accent-500/20 rounded-full blur-3xl pointer-events-none" />

          <button
            onClick={handleClose}
            disabled={loadingVerify}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30"
            aria-label="Cancelar"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="relative flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center mb-3 shadow-glow">
              <ShieldCheck className="w-7 h-7 text-brand-300" />
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight">
              Activa tu doble verificación
            </h2>
            <p className="text-sm text-white/70 mt-1.5 max-w-xs">
              Como administrador, debes proteger tu cuenta con una app autenticadora antes de continuar.
            </p>

            {/* Stepper */}
            <div className="flex items-center gap-2 mt-4 text-xs font-semibold">
              <span
                className={`px-2.5 py-1 rounded-full transition-colors ${
                  step === 'qr'
                    ? 'bg-brand-500 text-white'
                    : 'bg-white/10 text-white/60'
                }`}
              >
                1. Escanear
              </span>
              <span className="text-white/30">→</span>
              <span
                className={`px-2.5 py-1 rounded-full transition-colors ${
                  step === 'verify'
                    ? 'bg-brand-500 text-white'
                    : 'bg-white/10 text-white/60'
                }`}
              >
                2. Verificar
              </span>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-6 overflow-y-auto">
          {error && (
            <div className="flex items-start gap-3 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm mb-5 animate-fade-in">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          {step === 'qr' && (
            <div className="animate-fade-in space-y-5">
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-brand-50 border border-brand-100 text-surface-700 text-sm">
                <Smartphone className="w-4 h-4 mt-0.5 shrink-0 text-brand-600" />
                <span>
                  Usa <strong>Google Authenticator</strong>, <strong>Authy</strong> o <strong>1Password</strong>.
                  Escanea este QR con la app.
                </span>
              </div>

              {/* QR */}
              <div className="flex items-center justify-center">
                {loadingQr || !qrCodeUrl ? (
                  <div className="w-52 h-52 rounded-xl bg-surface-100 border-2 border-dashed border-surface-200 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-surface-400" />
                  </div>
                ) : (
                  <div className="p-3 bg-white rounded-2xl border-2 border-surface-200 shadow-sm">
                    <img
                      src={qrCodeUrl}
                      alt="QR para configurar 2FA"
                      className="w-48 h-48"
                    />
                  </div>
                )}
              </div>

              {/* Secret manual */}
              {secret && (
                <div className="rounded-xl border border-surface-200 bg-surface-50 p-3.5">
                  <div className="flex items-center gap-2 mb-2 text-xs font-semibold uppercase tracking-wider text-surface-600">
                    <KeyRound className="w-3.5 h-3.5" />
                    ¿No puedes escanear?
                  </div>
                  <p className="text-xs text-surface-600 mb-2">
                    Introduce este código manualmente en tu app:
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 rounded-lg bg-white border border-surface-200 text-sm font-mono tracking-wider text-surface-900 break-all">
                      {secret}
                    </code>
                    <button
                      type="button"
                      onClick={copySecret}
                      className="shrink-0 px-3 py-2 rounded-lg bg-white border border-surface-200 hover:border-brand-300 hover:bg-brand-50 transition-colors text-surface-700 text-xs font-semibold flex items-center gap-1.5"
                      aria-label="Copiar código"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-green-600" /> Copiado
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" /> Copiar
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => setStep('verify')}
                disabled={!qrCodeUrl || loadingQr}
                className="group btn-primary w-full !py-3 !text-base disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Ya lo escaneé, continuar
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          )}

          {step === 'verify' && (
            <div className="animate-fade-in space-y-5">
              <p className="text-sm text-surface-700 text-center">
                Introduce el código de 6 dígitos que muestra ahora tu app autenticadora.
              </p>

              <TotpCodeInput
                value={code}
                onChange={setCode}
                onComplete={submitCode}
                disabled={loadingVerify}
                hasError={!!error}
              />

              <p className="text-center text-xs text-surface-500">
                El código cambia cada 30 segundos.
              </p>

              <button
                type="button"
                onClick={() => submitCode(code)}
                disabled={code.length !== 6 || loadingVerify}
                className="group btn-primary w-full !py-3 !text-base disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingVerify ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Activando 2FA…
                  </>
                ) : (
                  <>
                    Activar y entrar
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep('qr');
                  setCode('');
                  setError(null);
                }}
                disabled={loadingVerify}
                className="w-full text-center text-sm text-surface-500 hover:text-surface-800 py-1.5 transition-colors disabled:opacity-50"
              >
                ← Volver al QR
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
