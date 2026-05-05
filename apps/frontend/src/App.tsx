import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useInitAuth, useAuth } from './hooks/useAuth';

// ─── Layouts and guards (eager — pequeños y críticos para todas las rutas) ───
import AppLayout from './components/layout/AppLayout';
import AdminLayout from './components/layout/AdminLayout';
import PrivateRoute from './components/common/PrivateRoute';
import PublicRoute from './components/common/PublicRoute';
import LoadingScreen from './components/common/LoadingScreen';
import ErrorBoundary from './components/common/ErrorBoundary';
import Spinner from './components/ui/Spinner';
import Toaster from './components/ui/Toast';

// ─── Auth pages (eager — entrada inicial de la app) ──────────────────────────
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';

// ─── Resto de páginas (lazy — se cargan bajo demanda al navegar) ─────────────
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage'));
const VerifyEmailPage = lazy(() => import('./pages/auth/VerifyEmailPage'));

const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const WorkoutsListPage = lazy(() => import('./pages/workouts/WorkoutsListPage'));
const CreateWorkoutPage = lazy(() => import('./pages/workouts/CreateWorkoutPage'));
const EditWorkoutPage = lazy(() => import('./pages/workouts/EditWorkoutPage'));
const WorkoutDetailPage = lazy(() => import('./pages/workouts/WorkoutDetailPage'));
const LiveWorkoutPage = lazy(() => import('./pages/workouts/LiveWorkoutPage'));
const CalendarPage = lazy(() => import('./pages/CalendarPage'));
const FeedPage = lazy(() => import('./pages/FeedPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const PublicProfilePage = lazy(() => import('./pages/PublicProfilePage'));
const OnboardingPage = lazy(() => import('./pages/OnboardingPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const RecordsPage = lazy(() => import('./pages/RecordsPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

// Premium / Billing
const PricingPage = lazy(() => import('./pages/PricingPage'));
const CheckoutSuccessPage = lazy(() => import('./pages/billing/CheckoutSuccessPage'));
const CheckoutCancelPage = lazy(() => import('./pages/billing/CheckoutCancelPage'));

// AI (chunk separado: solo se descarga si el usuario va a estas rutas)
const CoachChatPage = lazy(() => import('./pages/ai/CoachChatPage'));
const RoutinesPage = lazy(() => import('./pages/ai/RoutinesPage'));
const NutritionPage = lazy(() => import('./pages/ai/NutritionPage'));
const ProgressAnalysisPage = lazy(() => import('./pages/ai/ProgressAnalysisPage'));

// Admin (chunk separado: solo lo descargan los admins)
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage'));
const AdminUsersPage = lazy(() => import('./pages/admin/AdminUsersPage'));
const AdminWorkoutsPage = lazy(() => import('./pages/admin/AdminWorkoutsPage'));
const AdminSubscriptionsPage = lazy(() => import('./pages/admin/AdminSubscriptionsPage'));
const AdminLogsPage = lazy(() => import('./pages/admin/AdminLogsPage'));
const AdminBroadcastsPage = lazy(() => import('./pages/admin/AdminBroadcastsPage'));

// ─── Fallback ligero para Suspense (no rompe el layout al navegar) ───────────
function RouteFallback() {
  return (
    <div className="p-8">
      <Spinner fullScreen label="Cargando..." />
    </div>
  );
}

function AppRoutes() {
  useInitAuth();

  return (
    <>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          {/* Public auth routes */}
          <Route element={<PublicRoute />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
          </Route>
          <Route path="/verify-email/:token" element={<VerifyEmailPage />} />

          {/* Onboarding (private, no layout) */}
          <Route element={<PrivateRoute />}>
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/billing/success" element={<CheckoutSuccessPage />} />
            <Route path="/billing/cancel" element={<CheckoutCancelPage />} />
          </Route>

          {/* Main authenticated app */}
          <Route element={<PrivateRoute />}>
            <Route element={<AppLayout />}>
              <Route
                path="/dashboard"
                element={
                  <Suspense fallback={<RouteFallback />}>
                    <DashboardPage />
                  </Suspense>
                }
              />

              {/* Workouts */}
              <Route
                path="/workouts"
                element={
                  <Suspense fallback={<RouteFallback />}>
                    <WorkoutsListPage />
                  </Suspense>
                }
              />
              <Route
                path="/workouts/new"
                element={
                  <Suspense fallback={<RouteFallback />}>
                    <CreateWorkoutPage />
                  </Suspense>
                }
              />
              <Route
                path="/workouts/live"
                element={
                  <Suspense fallback={<RouteFallback />}>
                    <LiveWorkoutPage />
                  </Suspense>
                }
              />
              <Route
                path="/workouts/:id"
                element={
                  <Suspense fallback={<RouteFallback />}>
                    <WorkoutDetailPage />
                  </Suspense>
                }
              />
              <Route
                path="/workouts/:id/edit"
                element={
                  <Suspense fallback={<RouteFallback />}>
                    <EditWorkoutPage />
                  </Suspense>
                }
              />

              <Route
                path="/calendar"
                element={
                  <Suspense fallback={<RouteFallback />}>
                    <CalendarPage />
                  </Suspense>
                }
              />
              <Route
                path="/feed"
                element={
                  <Suspense fallback={<RouteFallback />}>
                    <FeedPage />
                  </Suspense>
                }
              />

              <Route
                path="/profile"
                element={
                  <Suspense fallback={<RouteFallback />}>
                    <ProfilePage />
                  </Suspense>
                }
              />
              <Route
                path="/u/:idOrUsername"
                element={
                  <Suspense fallback={<RouteFallback />}>
                    <PublicProfilePage />
                  </Suspense>
                }
              />

              <Route
                path="/settings"
                element={
                  <Suspense fallback={<RouteFallback />}>
                    <SettingsPage />
                  </Suspense>
                }
              />
              <Route
                path="/notifications"
                element={
                  <Suspense fallback={<RouteFallback />}>
                    <NotificationsPage />
                  </Suspense>
                }
              />
              <Route
                path="/records"
                element={
                  <Suspense fallback={<RouteFallback />}>
                    <RecordsPage />
                  </Suspense>
                }
              />

              {/* Premium */}
              <Route
                path="/premium"
                element={
                  <Suspense fallback={<RouteFallback />}>
                    <PricingPage />
                  </Suspense>
                }
              />

              {/* AI (gated by PremiumGate inside each page) */}
              <Route
                path="/coach"
                element={
                  <Suspense fallback={<RouteFallback />}>
                    <CoachChatPage />
                  </Suspense>
                }
              />
              <Route
                path="/routines"
                element={
                  <Suspense fallback={<RouteFallback />}>
                    <RoutinesPage />
                  </Suspense>
                }
              />
              <Route
                path="/nutrition"
                element={
                  <Suspense fallback={<RouteFallback />}>
                    <NutritionPage />
                  </Suspense>
                }
              />
              <Route
                path="/progress-analysis"
                element={
                  <Suspense fallback={<RouteFallback />}>
                    <ProgressAnalysisPage />
                  </Suspense>
                }
              />
            </Route>
          </Route>

          {/* Admin */}
          <Route element={<PrivateRoute requiredRole="ADMIN" />}>
            <Route element={<AdminLayout />}>
              <Route
                path="/admin"
                element={
                  <Suspense fallback={<RouteFallback />}>
                    <AdminDashboardPage />
                  </Suspense>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <Suspense fallback={<RouteFallback />}>
                    <AdminUsersPage />
                  </Suspense>
                }
              />
              <Route
                path="/admin/subscriptions"
                element={
                  <Suspense fallback={<RouteFallback />}>
                    <AdminSubscriptionsPage />
                  </Suspense>
                }
              />
              <Route
                path="/admin/workouts"
                element={
                  <Suspense fallback={<RouteFallback />}>
                    <AdminWorkoutsPage />
                  </Suspense>
                }
              />
              <Route
                path="/admin/broadcasts"
                element={
                  <Suspense fallback={<RouteFallback />}>
                    <AdminBroadcastsPage />
                  </Suspense>
                }
              />
              <Route
                path="/admin/logs"
                element={
                  <Suspense fallback={<RouteFallback />}>
                    <AdminLogsPage />
                  </Suspense>
                }
              />
            </Route>
          </Route>

          <Route path="/" element={<RoleAwareHome />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
      <Toaster />
    </>
  );
}

/**
 * Sends the user to the right home depending on their role.
 * Admins go to /admin, everyone else (or anonymous) to /dashboard.
 */
function RoleAwareHome() {
  const { isAuthenticated, user } = useAuth();
  if (isAuthenticated && user?.role === 'ADMIN') {
    return <Navigate to="/admin" replace />;
  }
  return <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </ErrorBoundary>
  );
}
