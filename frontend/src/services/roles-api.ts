import { AuthApiError } from './auth-api';

const API_BASE = '/api/v1/organizations';

export interface Role {
  id: string;
  organizationId: string | null;
  name: string;
  isDefault: boolean;
  inheritsFromRoleId: string | null;
  permissions: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PermissionDefinition {
  key: string;
  module: string | null;
}

export interface EffectivePermissions {
  userId: string;
  permissions: string[];
}

function authHeaders(accessToken: string, organizationId: string): Record<string, string> {
  return { Authorization: `Bearer ${accessToken}`, 'X-Organization-Id': organizationId };
}

async function parseOrThrow<T>(response: Response, fallbackMessage: string): Promise<T> {
  if (!response.ok) {
    const payload = await response.json().catch(() => ({ message: fallbackMessage }));
    throw new AuthApiError(payload.message ?? fallbackMessage, response.status);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

export async function listRoles(accessToken: string, organizationId: string): Promise<Role[]> {
  const response = await fetch(`${API_BASE}/${organizationId}/roles`, {
    headers: authHeaders(accessToken, organizationId),
  });
  return parseOrThrow<Role[]>(response, 'list_roles_failed');
}

export async function createCustomRole(
  accessToken: string,
  organizationId: string,
  input: { name: string; permissions: string[]; inheritsFromRoleId?: string },
): Promise<Role> {
  const response = await fetch(`${API_BASE}/${organizationId}/roles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(accessToken, organizationId) },
    body: JSON.stringify(input),
  });
  return parseOrThrow<Role>(response, 'create_custom_role_failed');
}

export async function updateCustomRole(
  accessToken: string,
  organizationId: string,
  roleId: string,
  updates: Partial<{ name: string; permissions: string[]; inheritsFromRoleId: string | null }>,
): Promise<Role> {
  const response = await fetch(`${API_BASE}/${organizationId}/roles/${roleId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders(accessToken, organizationId) },
    body: JSON.stringify(updates),
  });
  return parseOrThrow<Role>(response, 'update_custom_role_failed');
}

export async function deleteCustomRole(accessToken: string, organizationId: string, roleId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/${organizationId}/roles/${roleId}`, {
    method: 'DELETE',
    headers: authHeaders(accessToken, organizationId),
  });
  return parseOrThrow<void>(response, 'delete_custom_role_failed');
}

export async function assignRole(
  accessToken: string,
  organizationId: string,
  userId: string,
  roleId: string,
): Promise<void> {
  const response = await fetch(`${API_BASE}/${organizationId}/members/${userId}/roles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(accessToken, organizationId) },
    body: JSON.stringify({ roleId }),
  });
  return parseOrThrow<void>(response, 'assign_role_failed');
}

export async function revokeRole(
  accessToken: string,
  organizationId: string,
  userId: string,
  roleId: string,
): Promise<void> {
  const response = await fetch(`${API_BASE}/${organizationId}/members/${userId}/roles/${roleId}`, {
    method: 'DELETE',
    headers: authHeaders(accessToken, organizationId),
  });
  return parseOrThrow<void>(response, 'revoke_role_failed');
}

export async function grantPermission(
  accessToken: string,
  organizationId: string,
  userId: string,
  permission: string,
): Promise<void> {
  const response = await fetch(`${API_BASE}/${organizationId}/members/${userId}/permissions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(accessToken, organizationId) },
    body: JSON.stringify({ permission }),
  });
  return parseOrThrow<void>(response, 'grant_permission_failed');
}

export async function revokePermission(
  accessToken: string,
  organizationId: string,
  userId: string,
  permission: string,
): Promise<void> {
  const response = await fetch(`${API_BASE}/${organizationId}/members/${userId}/permissions/${permission}`, {
    method: 'DELETE',
    headers: authHeaders(accessToken, organizationId),
  });
  return parseOrThrow<void>(response, 'revoke_permission_failed');
}

export async function getEffectivePermissions(
  accessToken: string,
  organizationId: string,
  userId: string,
): Promise<EffectivePermissions> {
  const response = await fetch(`${API_BASE}/${organizationId}/members/${userId}/effective-permissions`, {
    headers: authHeaders(accessToken, organizationId),
  });
  return parseOrThrow<EffectivePermissions>(response, 'get_effective_permissions_failed');
}

export async function listAvailablePermissions(
  accessToken: string,
  organizationId: string,
): Promise<PermissionDefinition[]> {
  const response = await fetch(`${API_BASE}/${organizationId}/permissions/catalog`, {
    headers: authHeaders(accessToken, organizationId),
  });
  return parseOrThrow<PermissionDefinition[]>(response, 'list_available_permissions_failed');
}
