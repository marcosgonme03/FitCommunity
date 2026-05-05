import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Bell, User as UserIcon, Lock, Crown, ExternalLink, Download, AlertTriangle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useAuthStore } from '../store/authStore';
import usersService from '../services/users.service';
import billingService from '../services/billing.service';
import { SubscriptionInfo } from '../types';
import Button from '../components/ui/Button';
import PremiumBadge from '../components/ui/PremiumBadge';
import { formatDate } from '../lib/format';
import { toast } from '../components/ui/Toast';

export default function SettingsPage() {
  const { user } = useAuth();
  const { setUser } = useAuthStore();
  const profile = user?.profile;
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [loadingSub, setLoadingSub] = useState(true);
  const [opening, setOpening] = useState(false);
  const [canceling, setCanceling] = useState(false);

  const [privacy, setPrivacy] = useState({
    isProfilePublic: profile?.isProfilePublic ?? true,
    showWorkouts: profile?.showWorkouts ?? true,
    showStats: profile?.showStats ?? true,
  });

  useEffect(() => {
    billingService.getSubscription()
      .then((r) => setSubscription(r.subscription))
      .catch(() => undefined)
      .finally(() => setLoadingSub(false));
  }, []);

  async function savePrivacy() {
    setSaving(true);
    try {
      const updated = await usersService.updateMe(privacy);
      setUser(updated);
      toast.success('Preferencias guardadas');
    } catch {
      toast.error('Error', 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  }

  async function openPortal() {
    setOpening(true);
    try {
      const { url } = await billingService.openPortal();
      window.location.href = url;
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      toast.error('Error', e.response?.data?.error ?? 'No se pudo abrir');
      setOpening(false);
    }
  }

  async function exportData() {
    setExporting(true);
    try {
      await usersService.exportMyData();
      toast.success('Exportación completada', 'Tu fichero JSON se ha descargado.');
    } catch {
      toast.error('Error', 'No se pudo exportar. Inténtalo de nuevo.');
    } finally {
      setExporting(false);
    }
  }

  async function cancelSub() {
    if (!confirm('¿Cancelar tu suscripción al final del período?')) return;
    setCanceling(true);
    try {
      await billingService.cancel();
      toast.success('Suscripción cancelada', 'Mantienes acceso hasta el final del período.');
      const r = await billingService.getSubscription();
      setSubscription(r.subscription);
    } catch {
      toast.error('Error');
    } finally {
      setCanceling(false);
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold text-surface-900">Ajustes</h1>
        <p className="text-surface-600 mt-1 text-sm">Configura tu cuenta y suscripción.</p>
      </header>

      {/* Account info */}
      <section className="bg-white border border-surface-200 rounded-2xl p-5 shadow-soft">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg bg-brand-100 flex items-center justify-center">
            <UserIcon className="w-4 h-4 text-brand-600" />
          </div>
          <div>
            <h2 className="font-bold text-surface-900">Cuenta</h2>
            <p className="text-xs text-surface-500">Información básica</p>
          </div>
        </div>
        <dl className="space-y-2 text-sm">
          <Row label="Email" value={user?.email ?? ''} />
          <Row label="Email verificado" value={user?.isEmailVerified ? 'Sí' : 'No'}
            valueClassName={user?.isEmailVerified ? 'text-emerald-600' : 'text-yellow-600'} />
          <Row label="Rol" value={user?.role ?? ''} />
        </dl>
      </section>

      {/* Subscription */}
      <section className="bg-white border border-surface-200 rounded-2xl p-5 shadow-soft">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-accent-100 to-brand-100 flex items-center justify-center">
            <Crown className="w-4 h-4 text-brand-700" />
          </div>
          <div>
            <h2 className="font-bold text-surface-900">Suscripción</h2>
            <p className="text-xs text-surface-500">Plan actual y facturación</p>
          </div>
          {user?.isPremium && <div className="ml-auto"><PremiumBadge size="sm" /></div>}
        </div>

        {loadingSub ? (
          <p className="text-sm text-surface-500">Cargando...</p>
        ) : !user?.isPremium || !subscription ? (
          <div>
            <p className="text-sm text-surface-700 mb-3">
              Estás en el <strong>plan Free</strong>. Hazte Premium por 4,99€/mes para desbloquear el coach IA.
            </p>
            <Link to="/premium">
              <Button leftIcon={<Crown className="w-4 h-4" />}>Hazte Premium</Button>
            </Link>
          </div>
        ) : (
          <div>
            <dl className="space-y-2 text-sm mb-4">
              <Row label="Estado" value={subscription.status === 'ACTIVE' ? 'Activa' : subscription.status} />
              <Row label="Próxima renovación" value={formatDate(subscription.currentPeriodEnd)} />
              {subscription.cancelAtPeriodEnd && (
                <p className="inline-flex items-start gap-2 text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 px-3 py-2 rounded-lg">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>Suscripción cancelada. Mantienes acceso hasta {formatDate(subscription.currentPeriodEnd)}.</span>
                </p>
              )}
            </dl>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" leftIcon={<ExternalLink className="w-3.5 h-3.5" />}
                onClick={openPortal} loading={opening}>
                Gestionar en Stripe
              </Button>
              {!subscription.cancelAtPeriodEnd && (
                <Button variant="ghost" onClick={cancelSub} loading={canceling}>
                  Cancelar suscripción
                </Button>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Privacy */}
      <section className="bg-white border border-surface-200 rounded-2xl p-5 shadow-soft">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center">
            <Shield className="w-4 h-4 text-purple-600" />
          </div>
          <div>
            <h2 className="font-bold text-surface-900">Privacidad</h2>
            <p className="text-xs text-surface-500">Quién puede ver qué</p>
          </div>
        </div>
        <div className="space-y-1">
          <Toggle label="Perfil público" description="Cualquier usuario podrá ver tu perfil"
            value={privacy.isProfilePublic}
            onChange={(v) => setPrivacy({ ...privacy, isProfilePublic: v })} />
          <Toggle label="Mostrar entrenamientos" description="Visibles en tu perfil público"
            value={privacy.showWorkouts}
            onChange={(v) => setPrivacy({ ...privacy, showWorkouts: v })} />
          <Toggle label="Mostrar estadísticas" description="Stats visibles en tu perfil público"
            value={privacy.showStats}
            onChange={(v) => setPrivacy({ ...privacy, showStats: v })} />
        </div>
        <div className="flex justify-end mt-4">
          <Button onClick={savePrivacy} loading={saving}>Guardar cambios</Button>
        </div>
      </section>

      {/* Security */}
      <section className="bg-white border border-surface-200 rounded-2xl shadow-soft">
        <div className="p-5 border-b border-surface-200 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center">
            <Lock className="w-4 h-4 text-red-600" />
          </div>
          <div>
            <h2 className="font-bold text-surface-900">Seguridad</h2>
            <p className="text-xs text-surface-500">Acceso a tu cuenta</p>
          </div>
        </div>
        <div className="divide-y divide-surface-100">
          <div className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm font-semibold text-surface-900">Autenticación 2FA</p>
              <p className="text-xs text-surface-500 mt-0.5">
                {user?.twoFaEnabled ? 'Activada' : 'No activada'}
              </p>
            </div>
            <span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded ${user?.twoFaEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-surface-100 text-surface-500'}`}>
              {user?.twoFaEnabled ? 'Activa' : 'Inactiva'}
            </span>
          </div>
        </div>
      </section>

      {/* Notifications placeholder */}
      <section className="bg-white dark:bg-surface-100 border border-surface-200 rounded-2xl p-5 shadow-soft opacity-60">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-lg bg-yellow-100 flex items-center justify-center">
            <Bell className="w-4 h-4 text-yellow-600" />
          </div>
          <div>
            <h2 className="font-bold text-surface-900">Notificaciones</h2>
            <p className="text-xs text-surface-500">Disponible próximamente</p>
          </div>
        </div>
      </section>

      {/* GDPR — Data export */}
      <section className="bg-white dark:bg-surface-100 border border-surface-200 rounded-2xl p-5 shadow-soft">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <Download className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h2 className="font-bold text-surface-900">Mis datos (GDPR)</h2>
            <p className="text-xs text-surface-500">
              Descarga una copia completa de todos tus datos personales
            </p>
          </div>
        </div>
        <p className="text-sm text-surface-700 mb-4">
          De acuerdo con el Reglamento General de Protección de Datos (RGPD/GDPR), tienes derecho
          a obtener una copia de todos los datos que FitCommunity almacena sobre ti: cuenta,
          perfil, entrenamientos, seguidos y notificaciones.
        </p>
        <Button
          variant="outline"
          leftIcon={<Download className="w-4 h-4" />}
          onClick={exportData}
          loading={exporting}
        >
          Exportar mis datos
        </Button>
      </section>
    </div>
  );
}

function Row({ label, value, valueClassName = '' }: { label: string; value: string; valueClassName?: string }) {
  return (
    <div className="flex justify-between py-2 border-b border-surface-100 last:border-0">
      <dt className="text-surface-500">{label}</dt>
      <dd className={`text-surface-900 font-medium ${valueClassName}`}>{value}</dd>
    </div>
  );
}

function Toggle({ label, description, value, onChange }: { label: string; description: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-sm font-semibold text-surface-900">{label}</p>
        <p className="text-xs text-surface-500 mt-0.5">{description}</p>
      </div>
      <button type="button" role="switch" aria-checked={value} onClick={() => onChange(!value)}
        className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0
                    ${value ? 'bg-brand-500' : 'bg-surface-300'}`}>
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform
                          ${value ? 'translate-x-5' : ''}`} />
      </button>
    </div>
  );
}
