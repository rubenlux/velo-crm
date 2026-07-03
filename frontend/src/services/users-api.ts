import { AuthApiError } from './auth-api';

const API_BASE = '/api/v1/users';

export interface UserProfile {
  id: string;
  email: string;
  emailVerified: boolean;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  language: string;
  timezone: string;
  preferences: Record<string, unknown>;
  status: 'Pending' | 'Active' | 'Inactive' | 'Suspended' | 'Deleted';
}

export interface MyAuditLogEntry {
  id: string;
  organizationId: string | null;
  actorUserId: string | null;
  action: string;
  metadata: Record<string, unknown>;
  occurredAt: string;
}

export interface MyOrganization {
  id: string;
  name: string;
  plan: string;
  status: string;
  role: string;
}

export interface AccessHistoryEntry {
  id: string;
  device: { userAgent: string; approxLocation: string | null };
  status: 'active' | 'revoked';
  createdAt: string;
  lastActivityAt: string;
}

function authHeaders(accessToken: string): Record<string, string> {
  return { Authorization: `Bearer ${accessToken}` };
}

async function parseOrThrow<T>(response: Response, fallbackMessage: string): Promise<T> {
  if (!response.ok) {
    const payload = await response.json().catch(() => ({ message: fallbackMessage }));
    throw new AuthApiError(payload.message ?? fallbackMessage, response.status);
  }
  return response.json() as Promise<T>;
}

export async function getMyProfile(accessToken: string): Promise<UserProfile> {
  const response = await fetch(`${API_BASE}/me`, { headers: authHeaders(accessToken) });
  return parseOrThrow<UserProfile>(response, 'get_profile_failed');
}

export async function updateMyProfile(
  accessToken: string,
  updates: Partial<{ firstName: string; lastName: string; avatarUrl: string; language: string; timezone: string }>,
): Promise<UserProfile> {
  const response = await fetch(`${API_BASE}/me/profile`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders(accessToken) },
    body: JSON.stringify(updates),
  });
  return parseOrThrow<UserProfile>(response, 'update_profile_failed');
}

export async function updateMyPreferences(
  accessToken: string,
  preferences: Record<string, unknown>,
): Promise<UserProfile> {
  const response = await fetch(`${API_BASE}/me/preferences`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders(accessToken) },
    body: JSON.stringify({ preferences }),
  });
  return parseOrThrow<UserProfile>(response, 'update_preferences_failed');
}

export async function listMyAuditLog(accessToken: string): Promise<MyAuditLogEntry[]> {
  const response = await fetch(`${API_BASE}/me/audit-log`, { headers: authHeaders(accessToken) });
  return parseOrThrow<MyAuditLogEntry[]>(response, 'list_my_audit_log_failed');
}

export async function listMyOrganizations(accessToken: string): Promise<MyOrganization[]> {
  const response = await fetch(`${API_BASE}/me/organizations`, { headers: authHeaders(accessToken) });
  return parseOrThrow<MyOrganization[]>(response, 'list_my_organizations_failed');
}

export async function listAccessHistory(accessToken: string): Promise<AccessHistoryEntry[]> {
  const response = await fetch(`${API_BASE}/me/access-history`, { headers: authHeaders(accessToken) });
  return parseOrThrow<AccessHistoryEntry[]>(response, 'list_access_history_failed');
}

function memberHeaders(accessToken: string, organizationId: string): Record<string, string> {
  return { ...authHeaders(accessToken), 'X-Organization-Id': organizationId };
}

export async function deactivateMember(accessToken: string, organizationId: string, userId: string): Promise<void> {
  const response = await fetch(`/api/v1/organizations/${organizationId}/members/${userId}/deactivate`, {
    method: 'POST',
    headers: memberHeaders(accessToken, organizationId),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({ message: 'deactivate_member_failed' }));
    throw new AuthApiError(payload.message ?? 'deactivate_member_failed', response.status);
  }
}

export async function reactivateMember(accessToken: string, organizationId: string, userId: string): Promise<void> {
  const response = await fetch(`/api/v1/organizations/${organizationId}/members/${userId}/reactivate`, {
    method: 'POST',
    headers: memberHeaders(accessToken, organizationId),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({ message: 'reactivate_member_failed' }));
    throw new AuthApiError(payload.message ?? 'reactivate_member_failed', response.status);
  }
}

export async function deleteMember(accessToken: string, organizationId: string, userId: string): Promise<void> {
  const response = await fetch(`/api/v1/organizations/${organizationId}/members/${userId}`, {
    method: 'DELETE',
    headers: memberHeaders(accessToken, organizationId),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({ message: 'delete_member_failed' }));
    throw new AuthApiError(payload.message ?? 'delete_member_failed', response.status);
  }
}
