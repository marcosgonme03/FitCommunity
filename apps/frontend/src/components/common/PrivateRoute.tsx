import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import LoadingScreen from './LoadingScreen';

interface PrivateRouteProps {
  /** Required role to access this route */
  requiredRole?: 'USER' | 'ADMIN' | 'MODERATOR';
}

/**
 * Protects routes that require authentication.
 * Redirects to /login if not authenticated.
 * Optionally checks for a required role.
 */
export default function PrivateRoute({ requiredRole }: PrivateRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Admins must stay in /admin — the regular app is not for them
  if (user?.role === 'ADMIN' && requiredRole !== 'ADMIN') {
    return <Navigate to="/admin" replace />;
  }

  if (requiredRole && user?.role !== requiredRole && user?.role !== 'ADMIN') {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
