import { getInitials } from '../../lib/format';

interface AvatarProps {
  src?: string | null;
  name?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  ring?: boolean;
}

const SIZE_CLASSES: Record<NonNullable<AvatarProps['size']>, string> = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-base',
  xl: 'w-20 h-20 text-xl',
  '2xl': 'w-28 h-28 text-3xl',
};

export default function Avatar({ src, name, size = 'md', className = '', ring = false }: AvatarProps) {
  const initials = getInitials(name ?? '?');
  const sizeClass = SIZE_CLASSES[size];
  const ringClass = ring ? 'ring-2 ring-brand-300 ring-offset-2 ring-offset-surface-50' : '';

  if (src) {
    return (
      <img
        src={src}
        alt={name ?? 'Avatar'}
        className={`${sizeClass} rounded-full object-cover bg-surface-100 ${ringClass} ${className}`}
        onError={(e) => {
          // Fall back to initials if image fails
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-full flex items-center justify-center
                  bg-gradient-to-br from-brand-100 to-brand-700/30
                  text-brand-700 font-bold ${ringClass} ${className}`}
    >
      {initials || '?'}
    </div>
  );
}
