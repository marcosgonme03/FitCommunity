import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import LoadingScreen from './LoadingScreen';

/**
 * Redirects authenticated users away from auth pages (login, register).
 * Admins go straight to /admin, regular users to /dashboard.
 */
export default function PublicRoute() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (isAuthenticated) {
    const target = user?.role === 'ADMIN' ? '/admin' : '/dashboard';
    return <Navigate to={target} replace />;
  }

  return <Outlet />;
}
