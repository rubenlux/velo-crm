import { BadgeTone } from './Badge';

const tones: Record<BadgeTone, string> = {
  accent: 'bg-accent-soft text-accent-text',
  green: 'bg-green-soft text-green-text',
  red: 'bg-red-soft text-red-text',
  amber: 'bg-amber-soft text-[color:var(--amber)]',
  blue: 'bg-blue-soft text-blue',
  purple: 'bg-purple-soft text-purple',
  neutral: 'bg-surface-3 text-text-2',
};

const sizeClasses = {
  sm: 'w-6 h-6 text-[10px] rounded-md',
  md: 'w-8 h-8 text-[11px] rounded-lg',
  lg: 'w-11 h-11 text-sm rounded-xl',
  xl: 'w-16 h-16 text-xl rounded-2xl',
};

export function Avatar({
  initials,
  tone = 'accent',
  size = 'md',
  gradient,
}: {
  initials: string;
  tone?: BadgeTone;
  size?: keyof typeof sizeClasses;
  /** e.g. 'linear-gradient(140deg,#5B93EA,#7C6BDD)' for the user-footer / profile style avatars */
  gradient?: string;
}) {
  return (
    <div
      className={`flex flex-shrink-0 items-center justify-center font-extrabold ${sizeClasses[size]} ${gradient ? 'text-white' : tones[tone]}`}
      style={gradient ? { background: gradient } : undefined}
    >
      {initials}
    </div>
  );
}
