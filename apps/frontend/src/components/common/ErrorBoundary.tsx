import { Component, ReactNode, ErrorInfo } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  /** Si se pasa, se llama al renderizar el fallback (útil para enviar a Sentry) */
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface State {
  error: Error | null;
}

/**
 * Captura cualquier error de render que se escape de los componentes hijos.
 *
 * Sin este boundary, un error como "React error #31 (Objects are not valid as
 * a React child)" desmontaba TODA la app y dejaba la página en blanco.
 * Con él, mostramos un fallback legible y un botón para recargar.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Log siempre para que el desarrollador lo vea en consola, incluso en prod.
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, info);
    this.props.onError?.(error, info);
  }

  reset = (): void => {
    this.setState({ error: null });
  };

  reload = (): void => {
    window.location.reload();
  };

  goHome = (): void => {
    window.location.href = '/';
  };

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="min-h-screen bg-surface-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl border border-surface-200 shadow-soft p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-5">
            <AlertCircle className="w-7 h-7 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-surface-900 mb-2">
            Algo se ha roto al cargar esta pantalla
          </h1>
          <p className="text-sm text-surface-600 mb-6">
            Hemos detectado un error inesperado. Puedes volver a intentarlo recargando la
            página, o regresar al inicio.
          </p>

          {import.meta.env.DEV && (
            <pre className="text-left text-xs bg-surface-100 text-surface-700 rounded-lg p-3 mb-5 overflow-auto max-h-40">
              {error.message}
              {'\n'}
              {error.stack}
            </pre>
          )}

          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <button
              onClick={this.reload}
              className="btn-primary inline-flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Recargar
            </button>
            <button
              onClick={this.goHome}
              className="btn-ghost inline-flex items-center justify-center gap-2"
            >
              <Home className="w-4 h-4" />
              Ir al inicio
            </button>
          </div>
        </div>
      </div>
    );
  }
}
