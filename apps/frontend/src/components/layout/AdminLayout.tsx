import { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Shield,
  LayoutDashboard,
  Users,
  Dumbbell,
  ScrollText,
  LogOut,
  Menu,
  X,
  Crown,
  Megaphone,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import Avatar from '../ui/Avatar';
import Logo from '../ui/Logo';

const ADMIN_NAV = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/users', label: 'Usuarios', icon: Users },
  { to: '/admin/subscriptions', label: 'Suscripciones', icon: Crown },
  { to: '/admin/workouts', label: 'Entrenamientos', icon: Dumbbell },
  { to: '/admin/broadcasts', label: 'Comunicaciones', icon: Megaphone },
  { to: '/admin/logs', label: 'Audit log', icon: ScrollText },
];

export default function AdminLayout() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => setOpen(false), [location.pathname]);

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  function NavContent() {
    return (
      <>
        {/* Brand header */}
        <div className="h-16 flex items-center gap-3 px-5 border-b border-brand-200 bg-gradient-to-r from-brand-50 to-transparent">
          <Logo size={36} rounded="xl" className="shadow-soft" />
          <div>
            <p className="font-bold text-surface-900 text-base leading-none">FitCommunity</p>
            <p className="text-[10px] text-brand-600 uppercase tracking-wider mt-0.5 font-bold flex items-center gap-1">
              <Shield className="w-2.5 h-2.5" />
              Admin Panel
            </p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-1">
          <p className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider px-3 mb-2">
            Gestión
          </p>
          {ADMIN_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                 ${isActive
                  ? 'bg-brand-50 text-brand-700 ring-1 ring-brand-200'
                  : 'text-surface-600 hover:text-surface-900 hover:bg-surface-100'}`
              }
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User chip */}
        <div className="border-t border-surface-200 p-3">
          <div className="flex items-center gap-3 px-2 py-2">
            <Avatar
              src={user?.profile?.avatarUrl}
              name={user?.profile?.displayName ?? user?.email ?? 'Admin'}
              size="sm"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-surface-900 truncate">
                {user?.profile?.displayName ?? user?.email}
              </p>
              <p className="text-[10px] text-brand-600 uppercase tracking-wider font-bold">
                Administrador
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-surface-600 hover:text-red-600 hover:bg-red-50 transition-colors"
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="min-h-screen bg-surface-50 flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col fixed inset-y-0 w-64 bg-white border-r border-surface-200">
        <NavContent />
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="relative w-64 bg-white border-r border-surface-200 flex flex-col animate-slide-up">
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 z-10 p-2 rounded-lg text-surface-600 hover:text-surface-900 hover:bg-surface-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <NavContent />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 lg:ml-64 min-w-0 flex flex-col">
        <header className="h-16 bg-white/90 backdrop-blur border-b border-surface-200 flex items-center px-4 lg:px-6 sticky top-0 z-30">
          <button
            onClick={() => setOpen(true)}
            className="lg:hidden p-2 -ml-2 rounded-lg text-surface-600 hover:text-surface-900 hover:bg-surface-100 transition-colors"
            aria-label="Abrir menú"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 ml-2 lg:ml-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-600 bg-brand-50 ring-1 ring-brand-300 rounded-full px-2 py-1">
              ADMIN
            </span>
            <span className="text-sm text-surface-600 hidden sm:inline">Panel de administración</span>
          </div>
        </header>
        <main className="flex-1 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
