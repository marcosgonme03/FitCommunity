import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, LogOut, User, Settings, ChevronDown } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import Avatar from '../ui/Avatar';
import NotificationBell from '../notifications/NotificationBell';

interface TopbarProps {
  onOpenSidebar?: () => void;
}

export default function Topbar({ onOpenSidebar }: TopbarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  const displayName = user?.profile?.displayName ?? user?.email ?? 'Atleta';

  return (
    <header className="h-16 bg-white/90 backdrop-blur border-b border-surface-200 flex items-center px-4 lg:px-6 sticky top-0 z-30">
      {/* Mobile menu button */}
      <button
        onClick={onOpenSidebar}
        className="lg:hidden p-2 -ml-2 rounded-lg text-surface-600 hover:text-surface-900 hover:bg-surface-100 transition-colors"
        aria-label="Abrir menú"
      >
        <Menu className="w-5 h-5" />
      </button>

      <div className="flex-1 ml-2 lg:ml-0" />

      {/* Right side */}
      <div className="flex items-center gap-1">
        {/* Notifications */}
        <NotificationBell />

        {/* User menu */}
        <div ref={menuRef} className="relative ml-1">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg hover:bg-surface-100 transition-colors"
          >
            <Avatar src={user?.profile?.avatarUrl} name={displayName} size="sm" />
            <div className="hidden sm:block text-left">
              <p className="text-sm font-semibold text-surface-900 leading-none">{displayName}</p>
              <p className="text-[11px] text-surface-500 leading-none mt-0.5">
                @{user?.profile?.username ?? user?.email?.split('@')[0]}
              </p>
            </div>
            <ChevronDown className="w-4 h-4 text-surface-500" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-surface-200 rounded-xl shadow-2xl py-1 animate-fade-in">
              <div className="px-4 py-3 border-b border-surface-200">
                <p className="text-sm font-semibold text-surface-900 truncate">{displayName}</p>
                <p className="text-xs text-surface-600 truncate">{user?.email}</p>
              </div>
              <Link
                to="/profile"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-2 text-sm text-surface-700 hover:bg-surface-100 transition-colors"
              >
                <User className="w-4 h-4" />
                Mi perfil
              </Link>
              <Link
                to="/settings"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-2 text-sm text-surface-700 hover:bg-surface-100 transition-colors"
              >
                <Settings className="w-4 h-4" />
                Ajustes
              </Link>
              <div className="border-t border-surface-200 mt-1 pt-1">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors w-full text-left"
                >
                  <LogOut className="w-4 h-4" />
                  Cerrar sesión
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
