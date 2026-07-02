import { AuthApiError } from './auth-api';

const API_BASE = '/api/v1/organizations';

export interface Organization {
  id: string;
  name: string;
  timezone: string;
  currency: string;
  language: string;
  logoUrl: string | null;
  customDomain: string | null;
  taxSettings: Record<string, unknown>;
  enabledModules: string[];
  plan: 'Free' | 'Pro' | 'Enterprise';
  status: 'active' | 'suspended';
}

export interface AuditLogEntry {
  id: string;
  organizationId: string;
  actorUserId: string | null;
  action: string;
  metadata: Record<string, unknown>;
  occurredAt: string;
}

export type MembershipRole =
  | 'Propietario'
  | 'Administrador'
  | 'Gerente'
  | 'Ventas'
  | 'Soporte'
  | 'Contabilidad'
  | 'Inventario'
  | 'RRHH'
  | 'Lector';

export interface Membership {
  id: string;
  userId: string;
  organizationId: string;
  role: MembershipRole;
  status: 'active';
  createdAt: string;
}

export interface Invitation {
  id: string;
  organizationId: string;
  email: string;
  role: MembershipRole;
  status: 'pending' | 'accepted' | 'cancelled' | 'expired';
  createdAt: string;
  expiresAt: string;
}

export interface IssuedInvitation {
  id: string;
  email: string;
  role: MembershipRole;
  status: string;
  invitationToken: string;
}

function authHeaders(accessToken: string, organizationId?: string): Record<string, string> {
  const headers: Record<string, string> = { Authorization: `Bearer ${accessToken}` };
  if (organizationId) {
    headers['X-Organization-Id'] = organizationId;
  }
  return headers;
}

async function parseOrThrow<T>(response: Response, fallbackMessage: string): Promise<T> {
  if (!response.ok) {
    const payload = await response.json().catch(() => ({ message: fallbackMessage }));
    throw new AuthApiError(payload.message ?? fallbackMessage, response.status);
  }
  return response.json() as Promise<T>;
}

export async function createOrganization(
  accessToken: string,
  input: { name: string; timezone: string; currency: string; language: string },
): Promise<Organization> {
  const response = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(accessToken) },
    body: JSON.stringify(input),
  });
  return parseOrThrow<Organization>(response, 'create_organization_failed');
}

export async function getOrganization(accessToken: string, organizationId: string): Promise<Organization> {
  const response = await fetch(`${API_BASE}/${organizationId}`, {
    headers: authHeaders(accessToken, organizationId),
  });
  return parseOrThrow<Organization>(response, 'get_organization_failed');
}

export async function updateOrganization(
  accessToken: string,
  organizationId: string,
  updates: Partial<{ name: string; timezone: string; currency: string; language: string }>,
): Promise<Organization> {
  const response = await fetch(`${API_BASE}/${organizationId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders(accessToken, organizationId) },
    body: JSON.stringify(updates),
  });
  return parseOrThrow<Organization>(response, 'update_organization_failed');
}

export async function listAuditLog(accessToken: string, organizationId: string): Promise<AuditLogEntry[]> {
  const response = await fetch(`${API_BASE}/${organizationId}/audit-log`, {
    headers: authHeaders(accessToken, organizationId),
  });
  return parseOrThrow<AuditLogEntry[]>(response, 'list_audit_log_failed');
}

export async function updateBranding(
  accessToken: string,
  organizationId: string,
  updates: { logoUrl?: string; customDomain?: string },
): Promise<Organization> {
  const response = await fetch(`${API_BASE}/${organizationId}/branding`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders(accessToken, organizationId) },
    body: JSON.stringify(updates),
  });
  return parseOrThrow<Organization>(response, 'update_branding_failed');
}

export async function updateTaxSettings(
  accessToken: string,
  organizationId: string,
  taxSettings: Record<string, unknown>,
): Promise<Organization> {
  const response = await fetch(`${API_BASE}/${organizationId}/tax-settings`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders(accessToken, organizationId) },
    body: JSON.stringify({ taxSettings }),
  });
  return parseOrThrow<Organization>(response, 'update_tax_settings_failed');
}

export async function updateModules(
  accessToken: string,
  organizationId: string,
  enabledModules: string[],
): Promise<Organization> {
  const response = await fetch(`${API_BASE}/${organizationId}/modules`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders(accessToken, organizationId) },
    body: JSON.stringify({ enabledModules }),
  });
  return parseOrThrow<Organization>(response, 'update_modules_failed');
}

export async function listMembers(accessToken: string, organizationId: string): Promise<Membership[]> {
  const response = await fetch(`${API_BASE}/${organizationId}/members`, {
    headers: authHeaders(accessToken, organizationId),
  });
  return parseOrThrow<Membership[]>(response, 'list_members_failed');
}

export async function listInvitations(accessToken: string, organizationId: string): Promise<Invitation[]> {
  const response = await fetch(`${API_BASE}/${organizationId}/invitations`, {
    headers: authHeaders(accessToken, organizationId),
  });
  return parseOrThrow<Invitation[]>(response, 'list_invitations_failed');
}

export async function inviteMember(
  accessToken: string,
  organizationId: string,
  email: string,
  role: MembershipRole,
): Promise<IssuedInvitation> {
  const response = await fetch(`${API_BASE}/${organizationId}/invitations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(accessToken, organizationId) },
    body: JSON.stringify({ email, role }),
  });
  return parseOrThrow<IssuedInvitation>(response, 'invite_member_failed');
}

export async function cancelInvitation(
  accessToken: string,
  organizationId: string,
  invitationId: string,
): Promise<void> {
  const response = await fetch(`${API_BASE}/${organizationId}/invitations/${invitationId}`, {
    method: 'DELETE',
    headers: authHeaders(accessToken, organizationId),
  });
  if (!response.ok) {
    throw new AuthApiError('cancel_invitation_failed', response.status);
  }
}

export async function changePlan(
  accessToken: string,
  organizationId: string,
  plan: Organization['plan'],
): Promise<Organization> {
  const response = await fetch(`${API_BASE}/${organizationId}/plan`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders(accessToken, organizationId) },
    body: JSON.stringify({ plan }),
  });
  return parseOrThrow<Organization>(response, 'change_plan_failed');
}
