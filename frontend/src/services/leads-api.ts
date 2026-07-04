import { AuthApiError } from './auth-api';
import { CustomerPriority } from './customers-api';
import { Customer } from './customers-api';
import { Contact } from './contacts-api';

const API_BASE = '/api/v1/organizations';

export type LeadStatus = 'Nuevo' | 'Contactado' | 'Calificado' | 'EnNegociacion' | 'Convertido' | 'Perdido' | 'Archivado';
export type LeadSource =
  | 'SitioWeb'
  | 'Formulario'
  | 'RedesSociales'
  | 'Referido'
  | 'Llamada'
  | 'Email'
  | 'Importacion'
  | 'Evento'
  | 'CargaManual'
  | 'Api';

export interface Lead {
  id: string;
  organizationId: string;
  name: string;
  company: string | null;
  jobTitle: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  country: string | null;
  state: string | null;
  city: string | null;
  address: string | null;
  source: LeadSource;
  campaign: string | null;
  interest: string | null;
  ownerUserId: string | null;
  status: LeadStatus;
  statusBeforeLost: LeadStatus | null;
  priority: CustomerPriority;
  score: number | null;
  tags: string[];
  lastContactedAt: string | null;
  nextActionAt: string | null;
  nextActionNote: string | null;
  customFields: Record<string, unknown>;
  convertedCustomerId: string | null;
  convertedContactId: string | null;
  convertedOpportunityId: string | null;
  convertedAt: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface LeadNote {
  id: string;
  leadId: string;
  authorUserId: string;
  note: string;
  createdAt: string;
}

export interface LeadAttachment {
  id: string;
  leadId: string;
  fileName: string;
  fileUrl: string;
  uploadedByUserId: string;
  uploadedAt: string;
}

export interface LeadSearchResult {
  items: Lead[];
  total: number;
}

export interface LeadTimelineEntry {
  type: 'audit' | 'edit' | 'note';
  occurredAt: string;
  actorUserId: string | null;
  detail: unknown;
}

export interface Opportunity {
  id: string;
  organizationId: string;
  customerId: string;
  contactId: string | null;
  leadId: string | null;
  name: string;
  ownerUserId: string | null;
  estimatedValue: string | null;
  state: 'Abierta' | 'Ganada' | 'Perdida' | 'Cancelada' | 'Archivada';
  stage: string;
  source: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConvertLeadResult {
  lead: Lead;
  customer: Customer;
  contact: Contact;
  opportunity: Opportunity;
}

function authHeaders(accessToken: string, organizationId: string): Record<string, string> {
  return { Authorization: `Bearer ${accessToken}`, 'X-Organization-Id': organizationId };
}

async function parseOrThrow<T>(response: Response, fallbackMessage: string): Promise<T> {
  if (!response.ok) {
    const payload = await response.json().catch(() => ({ message: fallbackMessage }));
    throw new AuthApiError(payload.message ?? fallbackMessage, response.status, payload);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

export interface LeadSearchFilters {
  q?: string;
  status?: LeadStatus;
  source?: LeadSource;
  ownerUserId?: string;
  tag?: string;
  city?: string;
}

function toQueryString(filters: LeadSearchFilters): string {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    }
  });
  const query = params.toString();
  return query ? `?${query}` : '';
}

export async function searchLeads(accessToken: string, organizationId: string, filters: LeadSearchFilters = {}): Promise<LeadSearchResult> {
  const response = await fetch(`${API_BASE}/${organizationId}/leads${toQueryString(filters)}`, {
    headers: authHeaders(accessToken, organizationId),
  });
  return parseOrThrow<LeadSearchResult>(response, 'search_leads_failed');
}

export async function getLead(accessToken: string, organizationId: string, leadId: string): Promise<Lead> {
  const response = await fetch(`${API_BASE}/${organizationId}/leads/${leadId}`, {
    headers: authHeaders(accessToken, organizationId),
  });
  return parseOrThrow<Lead>(response, 'get_lead_failed');
}

export type CreateLeadInput = Partial<
  Omit<
    Lead,
    | 'id'
    | 'organizationId'
    | 'status'
    | 'statusBeforeLost'
    | 'convertedCustomerId'
    | 'convertedContactId'
    | 'convertedOpportunityId'
    | 'convertedAt'
    | 'version'
    | 'createdAt'
    | 'updatedAt'
  >
> & { name: string };

export async function createLead(accessToken: string, organizationId: string, input: CreateLeadInput): Promise<Lead> {
  const response = await fetch(`${API_BASE}/${organizationId}/leads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(accessToken, organizationId) },
    body: JSON.stringify(input),
  });
  return parseOrThrow<Lead>(response, 'create_lead_failed');
}

export type UpdateLeadInput = Partial<CreateLeadInput & { status: LeadStatus; score: number }> & { version: number };

export async function updateLead(accessToken: string, organizationId: string, leadId: string, input: UpdateLeadInput): Promise<Lead> {
  const response = await fetch(`${API_BASE}/${organizationId}/leads/${leadId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders(accessToken, organizationId) },
    body: JSON.stringify(input),
  });
  return parseOrThrow<Lead>(response, 'update_lead_failed');
}

export async function listLeadNotes(accessToken: string, organizationId: string, leadId: string): Promise<LeadNote[]> {
  const response = await fetch(`${API_BASE}/${organizationId}/leads/${leadId}/notes`, {
    headers: authHeaders(accessToken, organizationId),
  });
  return parseOrThrow<LeadNote[]>(response, 'list_lead_notes_failed');
}

export async function addLeadNote(accessToken: string, organizationId: string, leadId: string, note: string): Promise<LeadNote> {
  const response = await fetch(`${API_BASE}/${organizationId}/leads/${leadId}/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(accessToken, organizationId) },
    body: JSON.stringify({ note }),
  });
  return parseOrThrow<LeadNote>(response, 'add_lead_note_failed');
}

export async function listLeadAttachments(accessToken: string, organizationId: string, leadId: string): Promise<LeadAttachment[]> {
  const response = await fetch(`${API_BASE}/${organizationId}/leads/${leadId}/attachments`, {
    headers: authHeaders(accessToken, organizationId),
  });
  return parseOrThrow<LeadAttachment[]>(response, 'list_lead_attachments_failed');
}

export async function addLeadAttachment(
  accessToken: string,
  organizationId: string,
  leadId: string,
  fileName: string,
  fileUrl: string,
): Promise<LeadAttachment> {
  const response = await fetch(`${API_BASE}/${organizationId}/leads/${leadId}/attachments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(accessToken, organizationId) },
    body: JSON.stringify({ fileName, fileUrl }),
  });
  return parseOrThrow<LeadAttachment>(response, 'add_lead_attachment_failed');
}

export interface ConvertLeadInput {
  linkToExistingCustomerId?: string;
  linkToExistingContactId?: string;
  forceCreateNew?: boolean;
}

export async function convertLead(
  accessToken: string,
  organizationId: string,
  leadId: string,
  input: ConvertLeadInput = {},
): Promise<ConvertLeadResult> {
  const response = await fetch(`${API_BASE}/${organizationId}/leads/${leadId}/convert`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(accessToken, organizationId) },
    body: JSON.stringify(input),
  });
  return parseOrThrow<ConvertLeadResult>(response, 'convert_lead_failed');
}

export async function loseLead(accessToken: string, organizationId: string, leadId: string): Promise<Lead> {
  const response = await fetch(`${API_BASE}/${organizationId}/leads/${leadId}/lose`, {
    method: 'POST',
    headers: authHeaders(accessToken, organizationId),
  });
  return parseOrThrow<Lead>(response, 'lose_lead_failed');
}

export async function reactivateLead(accessToken: string, organizationId: string, leadId: string): Promise<Lead> {
  const response = await fetch(`${API_BASE}/${organizationId}/leads/${leadId}/reactivate`, {
    method: 'POST',
    headers: authHeaders(accessToken, organizationId),
  });
  return parseOrThrow<Lead>(response, 'reactivate_lead_failed');
}

export async function getLeadTimeline(accessToken: string, organizationId: string, leadId: string): Promise<LeadTimelineEntry[]> {
  const response = await fetch(`${API_BASE}/${organizationId}/leads/${leadId}/timeline`, {
    headers: authHeaders(accessToken, organizationId),
  });
  return parseOrThrow<LeadTimelineEntry[]>(response, 'get_lead_timeline_failed');
}

export async function importLeads(accessToken: string, organizationId: string, csv: string): Promise<{ created: number; rejected: { row: number; reason: string }[] }> {
  const response = await fetch(`${API_BASE}/${organizationId}/leads/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(accessToken, organizationId) },
    body: JSON.stringify({ csv }),
  });
  return parseOrThrow(response, 'import_leads_failed');
}
