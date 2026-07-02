const API_BASE = '/api/v1/auth';

export function OAuthButtons() {
  return (
    <div>
      <a href={`${API_BASE}/oauth/google`}>Continuar con Google</a>
      <a href={`${API_BASE}/oauth/microsoft`}>Continuar con Microsoft</a>
    </div>
  );
}
