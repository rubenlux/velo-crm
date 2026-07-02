const API_BASE = '/api/v1/auth';

export interface AuthUser {
  id: string;
  email: string;
  emailVerified: boolean;
}

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface RegisterResult {
  id: string;
  email: string;
  emailVerified: boolean;
  emailVerificationToken: string;
}

export class AuthApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'AuthApiError';
  }
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({ message: response.statusText }));
    throw new AuthApiError(payload.message ?? 'request_failed', response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function register(email: string, password: string): Promise<RegisterResult> {
  return postJson<RegisterResult>('/register', { email, password });
}

export function login(email: string, password: string, rememberMe = false): Promise<LoginResult> {
  return postJson<LoginResult>('/login', { email, password, rememberMe });
}

export function logout(accessToken: string, refreshToken: string): Promise<void> {
  return fetch(`${API_BASE}/logout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ refreshToken }),
  }).then((response) => {
    if (!response.ok) {
      throw new AuthApiError('logout_failed', response.status);
    }
  });
}

export function verifyEmail(token: string): Promise<{ verified: boolean }> {
  return postJson<{ verified: boolean }>('/verify-email', { token });
}
