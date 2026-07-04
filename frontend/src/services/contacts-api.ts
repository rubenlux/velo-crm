import { AuthApiError } from './auth-api';
import { CustomerPriority } from './customers-api';

const API_BASE = '/api/v1/organizations';

export type ContactStatus = 'active' | 'inactive' | 'archived';

export interface Contact {
  id: string;
  organizationId: string;
  customerId: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  birthDate: string | null;
  gender: string | null;
  jobTitle: string | null;
  department: string | null;
  area: string | null;
  decisionLevel: string | null;
  company: string | null;
  primaryEmail: string | null;
  secondaryEmails: string[];
  primaryPhone: string | null;
  secondaryPhones: string[];
  whatsapp: string | null;
  linkedin: string | null;
  website: string | null;
  country: string | null;
  state: string | null;
  city: string | null;
  address: string | null;
  ownerUserId: string | null;
  status: ContactStatus;
  tags: string[];
  priority: CustomerPriority;
  isPrimary: boolean;
  customFields: Record<string, unknown>;
  mergedIntoContactId: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface ContactSearchResult {
  items: Contact[];
  total: number;
}

export interface ContactTimelineEntry {
  type: 'audit' | 'edit';
  occurredAt: string;
  actorUserId: string | null;
  detail: unknown;
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

export interface ContactSearchFilters {
  q?: string;
  customerId?: string;
  status?: ContactStatus;
  ownerUserId?: string;
  tag?: string;
}

function toQueryString(filters: ContactSearchFilters): string {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    }
  });
  const query = params.toString();
  return query ? `?${query}` : '';
}

export async function searchContacts(
  accessToken: string,
  organizationId: string,
  filters: ContactSearchFilters = {},
): Promise<ContactSearchResult> {
  const response = await fetch(`${API_BASE}/${organizationId}/contacts${toQueryString(filters)}`, {
    headers: authHeaders(accessToken, organizationId),
  });
  return parseOrThrow<ContactSearchResult>(response, 'search_contacts_failed');
}

export async function getContact(accessToken: string, organizationId: string, contactId: string): Promise<Contact> {
  const response = await fetch(`${API_BASE}/${organizationId}/contacts/${contactId}`, {
    headers: authHeaders(accessToken, organizationId),
  });
  return parseOrThrow<Contact>(response, 'get_contact_failed');
}

export type CreateContactInput = Partial<
  Omit<
    Contact,
    'id' | 'organizationId' | 'customerId' | 'company' | 'status' | 'isPrimary' | 'mergedIntoContactId' | 'version' | 'createdAt' | 'updatedAt'
  >
> & { firstName: string; lastName: string };

export async function createContact(
  accessToken: string,
  organizationId: string,
  customerId: string,
  input: CreateContactInput,
): Promise<Contact> {
  const response = await fetch(`${API_BASE}/${organizationId}/customers/${customerId}/contacts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(accessToken, organizationId) },
    body: JSON.stringify(input),
  });
  return parseOrThrow<Contact>(response, 'create_contact_failed');
}

export type UpdateContactInput = Partial<CreateContactInput> & { version: number };

export async function updateContact(
  accessToken: string,
  organizationId: string,
  contactId: string,
  input: UpdateContactInput,
): Promise<Contact> {
  const response = await fetch(`${API_BASE}/${organizationId}/contacts/${contactId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders(accessToken, organizationId) },
    body: JSON.stringify(input),
  });
  return parseOrThrow<Contact>(response, 'update_contact_failed');
}

export async function archiveContact(accessToken: string, organizationId: string, contactId: string): Promise<Contact> {
  const response = await fetch(`${API_BASE}/${organizationId}/contacts/${contactId}/archive`, {
    method: 'POST',
    headers: authHeaders(accessToken, organizationId),
  });
  return parseOrThrow<Contact>(response, 'archive_contact_failed');
}

export async function restoreContact(accessToken: string, organizationId: string, contactId: string): Promise<Contact> {
  const response = await fetch(`${API_BASE}/${organizationId}/contacts/${contactId}/restore`, {
    method: 'POST',
    headers: authHeaders(accessToken, organizationId),
  });
  return parseOrThrow<Contact>(response, 'restore_contact_failed');
}

export async function setPrimaryContact(accessToken: string, organizationId: string, contactId: string): Promise<Contact> {
  const response = await fetch(`${API_BASE}/${organizationId}/contacts/${contactId}/set-primary`, {
    method: 'POST',
    headers: authHeaders(accessToken, organizationId),
  });
  return parseOrThrow<Contact>(response, 'set_primary_contact_failed');
}

export async function getContactTimeline(
  accessToken: string,
  organizationId: string,
  contactId: string,
): Promise<ContactTimelineEntry[]> {
  const response = await fetch(`${API_BASE}/${organizationId}/contacts/${contactId}/timeline`, {
    headers: authHeaders(accessToken, organizationId),
  });
  return parseOrThrow<ContactTimelineEntry[]>(response, 'get_contact_timeline_failed');
}

export async function transferContact(
  accessToken: string,
  organizationId: string,
  contactId: string,
  toCustomerId: string,
): Promise<Contact> {
  const response = await fetch(`${API_BASE}/${organizationId}/contacts/${contactId}/transfer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(accessToken, organizationId) },
    body: JSON.stringify({ toCustomerId }),
  });
  return parseOrThrow<Contact>(response, 'transfer_contact_failed');
}

export async function mergeContacts(
  accessToken: string,
  organizationId: string,
  survivorContactId: string,
  discardedContactId: string,
): Promise<Contact> {
  const response = await fetch(`${API_BASE}/${organizationId}/contacts/merge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(accessToken, organizationId) },
    body: JSON.stringify({ survivorContactId, discardedContactId }),
  });
  return parseOrThrow<Contact>(response, 'merge_contacts_failed');
}
