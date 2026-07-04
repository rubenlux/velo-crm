import { AuthApiError } from './auth-api';

const API_BASE = '/api/v1/organizations';

export type CustomerType = 'person' | 'company';
export type CustomerStatus = 'active' | 'inactive' | 'suspended' | 'archived';
export type CustomerPriority = 'low' | 'medium' | 'high';

export interface Customer {
  id: string;
  organizationId: string;
  name: string;
  legalName: string | null;
  tradeName: string | null;
  type: CustomerType;
  taxId: string | null;
  taxCondition: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  country: string | null;
  state: string | null;
  city: string | null;
  address: string | null;
  ownerUserId: string | null;
  source: string | null;
  category: string | null;
  tags: string[];
  priority: CustomerPriority;
  customFields: Record<string, unknown>;
  status: CustomerStatus;
  mergedIntoCustomerId: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerSearchResult {
  items: Customer[];
  total: number;
}

export interface CustomerTimelineEntry {
  type: 'audit' | 'edit';
  occurredAt: string;
  actorUserId: string | null;
  detail: unknown;
}

export interface ImportCustomersResult {
  created: number;
  rejected: { row: number; reason: string }[];
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

export interface CustomerSearchFilters {
  q?: string;
  status?: CustomerStatus;
  ownerUserId?: string;
  city?: string;
  state?: string;
  country?: string;
  category?: string;
  tag?: string;
}

function toQueryString(filters: CustomerSearchFilters): string {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    }
  });
  const query = params.toString();
  return query ? `?${query}` : '';
}

export async function searchCustomers(
  accessToken: string,
  organizationId: string,
  filters: CustomerSearchFilters = {},
): Promise<CustomerSearchResult> {
  const response = await fetch(`${API_BASE}/${organizationId}/customers${toQueryString(filters)}`, {
    headers: authHeaders(accessToken, organizationId),
  });
  return parseOrThrow<CustomerSearchResult>(response, 'search_customers_failed');
}

export async function getCustomer(accessToken: string, organizationId: string, customerId: string): Promise<Customer> {
  const response = await fetch(`${API_BASE}/${organizationId}/customers/${customerId}`, {
    headers: authHeaders(accessToken, organizationId),
  });
  return parseOrThrow<Customer>(response, 'get_customer_failed');
}

export type CreateCustomerInput = Partial<
  Omit<Customer, 'id' | 'organizationId' | 'status' | 'mergedIntoCustomerId' | 'version' | 'createdAt' | 'updatedAt'>
> & { name: string };

export async function createCustomer(
  accessToken: string,
  organizationId: string,
  input: CreateCustomerInput,
): Promise<Customer> {
  const response = await fetch(`${API_BASE}/${organizationId}/customers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(accessToken, organizationId) },
    body: JSON.stringify(input),
  });
  return parseOrThrow<Customer>(response, 'create_customer_failed');
}

export type UpdateCustomerInput = Partial<CreateCustomerInput> & { version: number };

export async function updateCustomer(
  accessToken: string,
  organizationId: string,
  customerId: string,
  input: UpdateCustomerInput,
): Promise<Customer> {
  const response = await fetch(`${API_BASE}/${organizationId}/customers/${customerId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders(accessToken, organizationId) },
    body: JSON.stringify(input),
  });
  return parseOrThrow<Customer>(response, 'update_customer_failed');
}

export async function archiveCustomer(accessToken: string, organizationId: string, customerId: string): Promise<Customer> {
  const response = await fetch(`${API_BASE}/${organizationId}/customers/${customerId}/archive`, {
    method: 'POST',
    headers: authHeaders(accessToken, organizationId),
  });
  return parseOrThrow<Customer>(response, 'archive_customer_failed');
}

export async function restoreCustomer(accessToken: string, organizationId: string, customerId: string): Promise<Customer> {
  const response = await fetch(`${API_BASE}/${organizationId}/customers/${customerId}/restore`, {
    method: 'POST',
    headers: authHeaders(accessToken, organizationId),
  });
  return parseOrThrow<Customer>(response, 'restore_customer_failed');
}

export async function getCustomerTimeline(
  accessToken: string,
  organizationId: string,
  customerId: string,
): Promise<CustomerTimelineEntry[]> {
  const response = await fetch(`${API_BASE}/${organizationId}/customers/${customerId}/timeline`, {
    headers: authHeaders(accessToken, organizationId),
  });
  return parseOrThrow<CustomerTimelineEntry[]>(response, 'get_customer_timeline_failed');
}

export async function mergeCustomers(
  accessToken: string,
  organizationId: string,
  survivorCustomerId: string,
  discardedCustomerId: string,
): Promise<Customer> {
  const response = await fetch(`${API_BASE}/${organizationId}/customers/merge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(accessToken, organizationId) },
    body: JSON.stringify({ survivorCustomerId, discardedCustomerId }),
  });
  return parseOrThrow<Customer>(response, 'merge_customers_failed');
}

export async function exportCustomers(accessToken: string, organizationId: string): Promise<string> {
  const response = await fetch(`${API_BASE}/${organizationId}/customers/export`, {
    headers: authHeaders(accessToken, organizationId),
  });
  if (!response.ok) {
    throw new AuthApiError('export_customers_failed', response.status);
  }
  return response.text();
}

export async function importCustomers(accessToken: string, organizationId: string, csv: string): Promise<ImportCustomersResult> {
  const response = await fetch(`${API_BASE}/${organizationId}/customers/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(accessToken, organizationId) },
    body: JSON.stringify({ csv }),
  });
  return parseOrThrow<ImportCustomersResult>(response, 'import_customers_failed');
}
