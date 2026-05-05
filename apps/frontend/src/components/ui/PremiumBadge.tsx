import { Crown } from 'lucide-react';

export default function PremiumBadge({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const sizeClass = size === 'sm' ? 'text-[10px] px-1.5 py-0.5 gap-1' : 'text-xs px-2 py-1 gap-1.5';
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5';
  return (
    <span
      className={`inline-flex items-center rounded-full font-bold uppercase tracking-wider
                  bg-gradient-to-r from-accent-400 to-brand-500 text-white shadow-soft ${sizeClass}`}
    >
      <Crown className={iconSize} />
      Premium
    </span>
  );
}
