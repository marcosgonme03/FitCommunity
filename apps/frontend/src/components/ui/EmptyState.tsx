import { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-center py-12 px-6 ${className}`}>
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-surface-100 to-surface-50 border border-surface-200 flex items-center justify-center mb-4">
        <Icon className="w-7 h-7 text-surface-500" />
      </div>
      <h3 className="text-base font-bold text-surface-900">{title}</h3>
      {description && (
        <p className="text-sm text-surface-600 mt-2 max-w-md">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
