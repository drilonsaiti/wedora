import { cn } from '@/lib/utils';

interface GuestAvatarProps {
  initials: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const colorMap: Record<string, string> = {
  A: 'bg-rose-100 text-rose-700',
  B: 'bg-blue-100 text-blue-700',
  C: 'bg-amber-100 text-amber-700',
  D: 'bg-emerald-100 text-emerald-700',
  E: 'bg-indigo-100 text-indigo-700',
  F: 'bg-pink-100 text-pink-700',
  G: 'bg-orange-100 text-orange-700',
  H: 'bg-cyan-100 text-cyan-700',
  I: 'bg-violet-100 text-violet-700',
  J: 'bg-fuchsia-100 text-fuchsia-700',
  K: 'bg-lime-100 text-lime-700',
  L: 'bg-sky-100 text-sky-700',
  M: 'bg-teal-100 text-teal-700',
  N: 'bg-slate-100 text-slate-700',
  O: 'bg-yellow-100 text-yellow-700',
  P: 'bg-purple-100 text-purple-700',
  Q: 'bg-red-100 text-red-700',
  R: 'bg-rose-100 text-rose-700',
  S: 'bg-blue-100 text-blue-700',
  T: 'bg-amber-100 text-amber-700',
  U: 'bg-emerald-100 text-emerald-700',
  V: 'bg-indigo-100 text-indigo-700',
  W: 'bg-pink-100 text-pink-700',
  X: 'bg-orange-100 text-orange-700',
  Y: 'bg-cyan-100 text-cyan-700',
  Z: 'bg-violet-100 text-violet-700',
};

export function GuestAvatar({ initials, className, size = 'md' }: GuestAvatarProps) {
  const firstLetter = initials.charAt(0).toUpperCase();
  const colors = colorMap[firstLetter] || 'bg-secondary text-secondary-foreground';
  
  const sizeClasses = {
    sm: 'w-8 h-8 text-[10px]',
    md: 'w-10 h-10 text-xs',
    lg: 'w-14 h-14 text-base',
    xl: 'w-16 h-16 text-lg',
  };

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full font-sans font-semibold tracking-tighter shadow-sm border border-white/50',
        colors,
        sizeClasses[size],
        className
      )}
    >
      {initials}
    </div>
  );
}
