const API_BASE = '/api/v1/auth';

export function OAuthButtons() {
  return (
    <div className="mt-5 flex flex-col gap-2 border-t border-border pt-5">
      <a
        href={`${API_BASE}/oauth/google`}
        className="flex items-center justify-center rounded-lg border border-border bg-surface py-2.5 text-[12.5px] font-bold text-text-2 transition-colors hover:border-border-strong hover:text-text"
      >
        Continuar con Google
      </a>
      <a
        href={`${API_BASE}/oauth/microsoft`}
        className="flex items-center justify-center rounded-lg border border-border bg-surface py-2.5 text-[12.5px] font-bold text-text-2 transition-colors hover:border-border-strong hover:text-text"
      >
        Continuar con Microsoft
      </a>
    </div>
  );
}
