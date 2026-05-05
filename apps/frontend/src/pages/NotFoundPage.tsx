import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-surface-50 flex items-center justify-center px-6">
      <div className="text-center animate-slide-up">
        <p className="text-8xl font-extrabold text-brand-200 mb-4">404</p>
        <h1 className="text-2xl font-bold text-surface-900 mb-3">Página no encontrada</h1>
        <p className="text-surface-600 mb-8">
          La página que buscas no existe o fue movida.
        </p>
        <Link to="/" className="btn-primary">
          <ArrowLeft className="w-4 h-4" />
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
