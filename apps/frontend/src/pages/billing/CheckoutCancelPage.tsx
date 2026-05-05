import { Link } from 'react-router-dom';
import { XCircle } from 'lucide-react';
import Button from '../../components/ui/Button';

export default function CheckoutCancelPage() {
  return (
    <div className="min-h-screen bg-surface-50 flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-white border border-surface-200 rounded-3xl p-10 text-center shadow-soft">
        <div className="w-20 h-20 mx-auto rounded-full bg-surface-100 flex items-center justify-center mb-6">
          <XCircle className="w-10 h-10 text-surface-500" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-surface-900 mb-3">
          Pago cancelado
        </h1>
        <p className="text-surface-600 mb-8">
          No se ha procesado ningún cargo. Puedes intentarlo de nuevo cuando quieras.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/premium">
            <Button>Volver a intentar</Button>
          </Link>
          <Link to="/dashboard">
            <Button variant="outline">Ir al dashboard</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
