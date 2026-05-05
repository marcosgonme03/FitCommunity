import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Dumbbell, Calendar, Users2, User, Settings,
  Plus, Crown, MessageSquare, Apple, TrendingUp, Sparkles, Trophy,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import Logo from '../ui/Logo';

interface SidebarProps {
  onNavigate?: () => void;
}

const NAV_ITEMS = [
  { to: '/dashboard',  label: 'Dashboard',       icon: LayoutDashboard },
  { to: '/workouts',   label: 'Entrenamientos',   icon: Dumbbell },
  { to: '/calendar',   label: 'Calendario',       icon: Calendar },
  { to: '/records',    label: 'Mis marcas',        icon: Trophy },
  { to: '/feed',       label: 'Comunidad',        icon: Users2 },
  { to: '/profile',    label: 'Mi perfil',         icon: User },
];

const AI_ITEMS = [
  { to: '/coach',            label: 'Coach IA',    icon: MessageSquare },
  { to: '/routines',         label: 'Rutinas IA',  icon: Sparkles },
  { to: '/nutrition',        label: 'Nutrición',   icon: Apple },
  { to: '/progress-analysis',label: 'Análisis IA', icon: TrendingUp },
];

const activeClass   = 'bg-brand-50 text-brand-700 ring-1 ring-brand-200';
const inactiveClass = 'text-surface-600 hover:text-surface-900 hover:bg-surface-100';

export default function Sidebar({ onNavigate }: SidebarProps) {
  const { user } = useAuth();
  const isPremium = user?.isPremium ?? false;

  return (
    <aside className="h-full w-64 bg-white border-r border-surface-200 flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center gap-3 px-5 border-b border-surface-200">
        <Logo size={36} rounded="xl" className="shadow-soft" />
        <div>
          <p className="font-bold text-surface-900 text-base leading-none">FitCommunity</p>
          <p className="text-[10px] text-surface-500 uppercase tracking-wider mt-0.5">Tu app de gimnasio</p>
        </div>
      </div>

      {/* Quick action */}
      <div className="px-3 pt-4">
        <NavLink
          to="/workouts/new"
          onClick={onNavigate}
          className="flex items-center justify-center gap-2 w-full bg-brand-500 hover:bg-brand-600 active:bg-brand-700
                     text-white font-semibold text-sm rounded-lg py-2.5 px-4 transition-colors shadow-glow"
        >
          <Plus className="w-4 h-4" /> Nuevo entrenamiento
        </NavLink>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-1">
        <p className="text-[10px] font-bold text-surface-500 uppercase tracking-wider px-3 mb-2">Principal</p>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            end={item.to === '/dashboard'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
               ${isActive ? activeClass : inactiveClass}`
            }
          >
            <item.icon className="w-4 h-4" />
            {item.label}
          </NavLink>
        ))}

        {/* IA section */}
        <p className="text-[10px] font-bold text-surface-500 uppercase tracking-wider px-3 mt-6 mb-2 flex items-center gap-1">
          <Crown className="w-3 h-3 text-accent-600" />
          IA Coach
          {!isPremium && (
            <span className="ml-auto text-[9px] bg-accent-100 text-accent-700 px-1.5 py-0.5 rounded-full font-bold">
              PRO
            </span>
          )}
        </p>
        {AI_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
               ${isActive ? activeClass : inactiveClass}
               ${!isPremium ? 'opacity-70' : ''}`
            }
          >
            <item.icon className="w-4 h-4" />
            {item.label}
          </NavLink>
        ))}

        {!isPremium && (
          <NavLink
            to="/premium"
            onClick={onNavigate}
            className="flex items-center justify-center gap-2 mt-3 mx-1 py-2.5 rounded-lg text-sm font-bold
                       text-white bg-gradient-to-r from-accent-500 to-brand-500 hover:from-accent-600 hover:to-brand-600
                       shadow-glow transition-all"
          >
            <Crown className="w-4 h-4" /> Hazte Premium
          </NavLink>
        )}

        <p className="text-[10px] font-bold text-surface-500 uppercase tracking-wider px-3 mt-6 mb-2">Cuenta</p>
        <NavLink
          to="/settings"
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
             ${isActive ? 'bg-surface-100 text-surface-900' : inactiveClass}`
          }
        >
          <Settings className="w-4 h-4" /> Ajustes
        </NavLink>
      </nav>

      <div className="px-5 py-3 border-t border-surface-200 text-[10px] text-surface-400">
        FitCommunity TFG · v2.0
      </div>
    </aside>
  );
}
