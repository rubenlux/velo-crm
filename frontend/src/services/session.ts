import { AuthUser } from './auth-api';

export interface StoredSession {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

const STORAGE_KEY = 'velo.session';

export function saveSession(session: StoredSession): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function getSession(): StoredSession | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? (JSON.parse(raw) as StoredSession) : null;
}

export function clearSession(): void {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(ACTIVE_ORGANIZATION_KEY);
}

const ACTIVE_ORGANIZATION_KEY = 'velo.activeOrganizationId';

export function setActiveOrganizationId(organizationId: string): void {
  localStorage.setItem(ACTIVE_ORGANIZATION_KEY, organizationId);
}

export function getActiveOrganizationId(): string | null {
  return localStorage.getItem(ACTIVE_ORGANIZATION_KEY);
}
