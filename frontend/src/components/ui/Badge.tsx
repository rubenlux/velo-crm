import { ReactNode } from 'react';

export type BadgeTone = 'accent' | 'green' | 'red' | 'amber' | 'blue' | 'purple' | 'neutral';

const tones: Record<BadgeTone, string> = {
  accent: 'bg-accent-soft text-accent-text',
  green: 'bg-green-soft text-green-text',
  red: 'bg-red-soft text-red-text',
  amber: 'bg-amber-soft text-[color:var(--amber)]',
  blue: 'bg-blue-soft text-blue',
  purple: 'bg-purple-soft text-purple',
  neutral: 'bg-surface-3 text-text-2',
};

export function Badge({ tone = 'neutral', children }: { tone?: BadgeTone; children: ReactNode }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${tones[tone]}`}>{children}</span>;
}
