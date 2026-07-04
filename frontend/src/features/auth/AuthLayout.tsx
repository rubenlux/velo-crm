import { ReactNode } from 'react';

export function AuthLayout({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4 font-sans text-text">
      <div className="w-full max-w-[400px] animate-veloFade">
        <div className="mb-7 flex flex-col items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent-hover shadow-[0_2px_8px_-1px_rgba(234,99,33,.5)]">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M4 5l6 14 4-9 3 6h3" stroke="#fff" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="text-center">
            <div className="text-lg font-extrabold tracking-tight">VELO</div>
            <div className="text-[11px] font-semibold tracking-wide text-text-3">BUSINESS OS</div>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-7 shadow-lg">
          <h1 className="text-xl font-extrabold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-1.5 text-[13px] text-text-2">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function AuthInput(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, id, ...rest } = props;
  return (
    <div className="mb-4">
      <label htmlFor={id} className="mb-1.5 block text-[12px] font-bold text-text-2">
        {label}
      </label>
      <input
        id={id}
        {...rest}
        className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2.5 font-sans text-[13px] text-text outline-none transition-colors focus:border-accent focus:bg-surface"
      />
    </div>
  );
}

export function AuthError({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="mb-4 rounded-lg border border-red-soft bg-red-soft px-3 py-2 text-[12.5px] font-semibold text-red-text">
      {children}
    </p>
  );
}

export function AuthSubmit({ submitting, children }: { submitting: boolean; children: ReactNode }) {
  return (
    <button
      type="submit"
      disabled={submitting}
      className="w-full rounded-lg bg-accent py-2.5 text-[13px] font-bold text-white shadow-[0_2px_8px_-2px_rgba(234,99,33,.5)] transition-colors hover:bg-accent-hover disabled:opacity-60"
    >
      {children}
    </button>
  );
}
