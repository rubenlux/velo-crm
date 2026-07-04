import { ReactNode } from 'react';

export function Modal({ open, onClose, children, width = 480 }: { open: boolean; onClose: () => void; children: ReactNode; width?: number }) {
  if (!open) return null;
  return (
    <div onClick={onClose} className="fixed inset-0 z-50 flex animate-veloFade items-center justify-center bg-black/45 p-6 backdrop-blur-sm">
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: `min(92vw, ${width}px)` }}
        className="animate-veloPop overflow-hidden rounded-2xl border border-border-strong bg-surface shadow-lg"
      >
        {children}
      </div>
    </div>
  );
}
