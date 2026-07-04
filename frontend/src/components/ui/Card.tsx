import { HTMLAttributes, ReactNode } from 'react';

export function Card({ children, className = '', ...rest }: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <div className={`rounded-xl border border-border bg-surface shadow-sm ${className}`} {...rest}>
      {children}
    </div>
  );
}
