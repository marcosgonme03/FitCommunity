import { ButtonHTMLAttributes, forwardRef, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

const VARIANT_CLASSES: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white shadow-lg shadow-brand-500/20',
  secondary: 'bg-surface-100 hover:bg-surface-200 active:bg-surface-500 text-surface-900',
  ghost: 'text-surface-600 hover:text-surface-900 hover:bg-surface-100',
  danger: 'bg-red-500/90 hover:bg-red-500 active:bg-red-600 text-white shadow-lg shadow-red-500/20',
  outline: 'border border-surface-300 text-surface-800 hover:bg-surface-100 hover:border-surface-500',
};

const SIZE_CLASSES: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-md',
  md: 'px-4 py-2 text-sm rounded-lg',
  lg: 'px-6 py-3 text-base rounded-xl',
};

export default forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    leftIcon,
    rightIcon,
    fullWidth = false,
    children,
    disabled,
    className = '',
    ...props
  },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 font-semibold
                  transition-all duration-150
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400
                  focus-visible:ring-offset-2 focus-visible:ring-offset-surface-50
                  disabled:opacity-50 disabled:cursor-not-allowed
                  ${VARIANT_CLASSES[variant]}
                  ${SIZE_CLASSES[size]}
                  ${fullWidth ? 'w-full' : ''}
                  ${className}`}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : leftIcon ? (
        leftIcon
      ) : null}
      {children}
      {!loading && rightIcon}
    </button>
  );
});
