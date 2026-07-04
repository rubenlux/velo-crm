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

export interface MfaLoginResult {
  mfaRequired: true;
  mfaChallengeToken: string;
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
    // Full JSON error body, for callers that need fields beyond `message` (e.g. the
    // Lead conversion duplicate-warning candidates, specs/010-leads/contracts).
    public readonly payload?: unknown,
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

export function login(
  email: string,
  password: string,
  rememberMe = false,
): Promise<LoginResult | MfaLoginResult> {
  return postJson<LoginResult | MfaLoginResult>('/login', { email, password, rememberMe });
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

export interface MfaEnrollResult {
  otpauthUrl: string;
  recoveryCodes: string[];
}

export function enrollMfa(accessToken: string): Promise<MfaEnrollResult> {
  return fetch(`${API_BASE}/mfa/enroll`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  }).then(async (response) => {
    if (!response.ok) {
      throw new AuthApiError('mfa_enroll_failed', response.status);
    }
    return response.json();
  });
}

export function enableMfa(accessToken: string, code: string): Promise<{ enabled: boolean }> {
  return fetch(`${API_BASE}/mfa/enable`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ code }),
  }).then(async (response) => {
    if (!response.ok) {
      throw new AuthApiError('mfa_enable_failed', response.status);
    }
    return response.json();
  });
}

export function verifyMfa(mfaChallengeToken: string, code: string): Promise<LoginResult> {
  return postJson<LoginResult>('/mfa/verify', { mfaChallengeToken, code });
}

export function requestPasswordReset(email: string): Promise<{ requested?: boolean; passwordResetToken?: string }> {
  return postJson('/password/reset-request', { email });
}

export function confirmPasswordReset(token: string, newPassword: string): Promise<{ reset: boolean }> {
  return postJson('/password/reset-confirm', { token, newPassword });
}

export interface SessionSummary {
  id: string;
  device: { id: string; userAgent: string; approxLocation: string | null };
  rememberMe: boolean;
  lastActivityAt: string;
  createdAt: string;
  expiresAt: string;
}

function authorizedFetch(path: string, accessToken: string, method: string): Promise<Response> {
  return fetch(`${API_BASE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function listSessions(accessToken: string): Promise<SessionSummary[]> {
  const response = await authorizedFetch('/sessions', accessToken, 'GET');
  if (!response.ok) {
    throw new AuthApiError('list_sessions_failed', response.status);
  }
  return response.json();
}

export async function revokeSession(accessToken: string, sessionId: string): Promise<void> {
  const response = await authorizedFetch(`/sessions/${sessionId}`, accessToken, 'DELETE');
  if (!response.ok) {
    throw new AuthApiError('revoke_session_failed', response.status);
  }
}

export async function revokeAllSessions(accessToken: string): Promise<void> {
  const response = await authorizedFetch('/sessions', accessToken, 'DELETE');
  if (!response.ok) {
    throw new AuthApiError('revoke_all_sessions_failed', response.status);
  }
}

export function changePassword(
  accessToken: string,
  currentPassword: string,
  newPassword: string,
): Promise<{ changed: boolean }> {
  return fetch(`${API_BASE}/password/change`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ currentPassword, newPassword }),
  }).then(async (response) => {
    if (!response.ok) {
      const payload = await response.json().catch(() => ({ message: response.statusText }));
      throw new AuthApiError(payload.message ?? 'request_failed', response.status);
    }
    return response.json();
  });
}
