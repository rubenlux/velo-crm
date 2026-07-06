import { AuthApiError } from './auth-api';
import { CustomerPriority } from './customers-api';

const API_BASE = '/api/v1/organizations';

export type OpportunityState = 'Abierta' | 'Ganada' | 'Perdida' | 'Cancelada' | 'Archivada';

export interface PipelineStage {
  id: string;
  pipelineId: string;
  name: string;
  order: number;
  isWonStage: boolean;
  isLostStage: boolean;
  createdAt: string;
}

export interface Pipeline {
  id: string;
  organizationId: string;
  name: string;
  isDefault: boolean;
  createdAt: string;
  stages: PipelineStage[];
}

export interface Opportunity {
  id: string;
  organizationId: string;
  customerId: string;
  contactId: string | null;
  leadId: string | null;
  pipelineId: string;
  stageId: string;
  name: string;
  ownerUserId: string | null;
  estimatedValue: string | null;
  probability: number | null;
  estimatedCloseDate: string | null;
  priority: CustomerPriority;
  competitor: string | null;
  notes: string | null;
  tags: string[];
  state: OpportunityState;
  stageBeforeLost: string | null;
  stateBeforeArchive: OpportunityState | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  stage: PipelineStage;
  pipeline: Pipeline;
  weightedValue?: number;
}

export interface OpportunitySearchResult {
  items: Opportunity[];
  total: number;
  totalValue: number;
  totalWeightedValue: number;
}

export interface OpportunityTimelineEntry {
  type: 'audit' | 'edit';
  occurredAt: string;
  actorUserId: string | null;
  detail: unknown;
}

export interface OpportunityKpis {
  totalValue: number;
  weightedValue: number;
  openCount: number;
  wonCount: number;
  lostCount: number;
  conversionRate: number | null;
  averageTicket: number | null;
  averageCloseTimeDays: number | null;
  byOwner: { ownerUserId: string; count: number; totalValue: number }[];
  byStage: { stageId: string; stageName: string; count: number; totalValue: number }[];
}

export interface OpportunityForecast {
  month: number;
  quarter: number;
  year: number;
  byOwner: { ownerUserId: string; value: number }[];
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

export async function listPipelines(accessToken: string, organizationId: string): Promise<Pipeline[]> {
  const response = await fetch(`${API_BASE}/${organizationId}/pipelines`, {
    headers: authHeaders(accessToken, organizationId),
  });
  return parseOrThrow<Pipeline[]>(response, 'list_pipelines_failed');
}

export async function createPipelineStage(
  accessToken: string,
  organizationId: string,
  pipelineId: string,
  input: { name: string; order?: number },
): Promise<PipelineStage> {
  const response = await fetch(`${API_BASE}/${organizationId}/pipelines/${pipelineId}/stages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(accessToken, organizationId) },
    body: JSON.stringify(input),
  });
  return parseOrThrow<PipelineStage>(response, 'create_pipeline_stage_failed');
}

export async function updatePipelineStage(
  accessToken: string,
  organizationId: string,
  pipelineId: string,
  stageId: string,
  input: Partial<{ name: string; order: number }>,
): Promise<PipelineStage> {
  const response = await fetch(`${API_BASE}/${organizationId}/pipelines/${pipelineId}/stages/${stageId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders(accessToken, organizationId) },
    body: JSON.stringify(input),
  });
  return parseOrThrow<PipelineStage>(response, 'update_pipeline_stage_failed');
}

export async function deletePipelineStage(accessToken: string, organizationId: string, pipelineId: string, stageId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/${organizationId}/pipelines/${pipelineId}/stages/${stageId}`, {
    method: 'DELETE',
    headers: authHeaders(accessToken, organizationId),
  });
  return parseOrThrow<void>(response, 'delete_pipeline_stage_failed');
}

export interface OpportunitySearchFilters {
  q?: string;
  customerId?: string;
  contactId?: string;
  ownerUserId?: string;
  stageId?: string;
  state?: OpportunityState;
  priority?: string;
  tag?: string;
}

function toQueryString(filters: OpportunitySearchFilters): string {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    }
  });
  const query = params.toString();
  return query ? `?${query}` : '';
}

export async function searchOpportunities(
  accessToken: string,
  organizationId: string,
  filters: OpportunitySearchFilters = {},
): Promise<OpportunitySearchResult> {
  const response = await fetch(`${API_BASE}/${organizationId}/opportunities${toQueryString(filters)}`, {
    headers: authHeaders(accessToken, organizationId),
  });
  return parseOrThrow<OpportunitySearchResult>(response, 'search_opportunities_failed');
}

export async function getOpportunity(accessToken: string, organizationId: string, opportunityId: string): Promise<Opportunity> {
  const response = await fetch(`${API_BASE}/${organizationId}/opportunities/${opportunityId}`, {
    headers: authHeaders(accessToken, organizationId),
  });
  return parseOrThrow<Opportunity>(response, 'get_opportunity_failed');
}

export interface CreateOpportunityInput {
  customerId: string;
  contactId?: string;
  name: string;
  ownerUserId?: string;
  pipelineId?: string;
  stageId?: string;
  estimatedValue?: number;
  probability?: number;
  estimatedCloseDate?: string;
  priority?: CustomerPriority;
  competitor?: string;
  notes?: string;
  tags?: string[];
}

export async function createOpportunity(accessToken: string, organizationId: string, input: CreateOpportunityInput): Promise<Opportunity> {
  const response = await fetch(`${API_BASE}/${organizationId}/opportunities`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(accessToken, organizationId) },
    body: JSON.stringify(input),
  });
  return parseOrThrow<Opportunity>(response, 'create_opportunity_failed');
}

export type UpdateOpportunityInput = Partial<Omit<CreateOpportunityInput, 'customerId' | 'pipelineId' | 'stageId'>> & { version: number };

export async function updateOpportunity(
  accessToken: string,
  organizationId: string,
  opportunityId: string,
  input: UpdateOpportunityInput,
): Promise<Opportunity> {
  const response = await fetch(`${API_BASE}/${organizationId}/opportunities/${opportunityId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders(accessToken, organizationId) },
    body: JSON.stringify(input),
  });
  return parseOrThrow<Opportunity>(response, 'update_opportunity_failed');
}

export async function moveOpportunityStage(
  accessToken: string,
  organizationId: string,
  opportunityId: string,
  stageId: string,
): Promise<Opportunity> {
  const response = await fetch(`${API_BASE}/${organizationId}/opportunities/${opportunityId}/move-stage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(accessToken, organizationId) },
    body: JSON.stringify({ stageId }),
  });
  return parseOrThrow<Opportunity>(response, 'move_opportunity_stage_failed');
}

function lifecycleAction(action: 'win' | 'lose' | 'reopen' | 'archive' | 'restore') {
  return async (accessToken: string, organizationId: string, opportunityId: string): Promise<Opportunity> => {
    const response = await fetch(`${API_BASE}/${organizationId}/opportunities/${opportunityId}/${action}`, {
      method: 'POST',
      headers: authHeaders(accessToken, organizationId),
    });
    return parseOrThrow<Opportunity>(response, `${action}_opportunity_failed`);
  };
}

export const winOpportunity = lifecycleAction('win');
export const loseOpportunity = lifecycleAction('lose');
export const reopenOpportunity = lifecycleAction('reopen');
export const archiveOpportunity = lifecycleAction('archive');
export const restoreOpportunity = lifecycleAction('restore');

export async function getOpportunityKpis(accessToken: string, organizationId: string): Promise<OpportunityKpis> {
  const response = await fetch(`${API_BASE}/${organizationId}/opportunities/kpis`, {
    headers: authHeaders(accessToken, organizationId),
  });
  return parseOrThrow<OpportunityKpis>(response, 'get_opportunity_kpis_failed');
}

export async function getOpportunityForecast(accessToken: string, organizationId: string): Promise<OpportunityForecast> {
  const response = await fetch(`${API_BASE}/${organizationId}/opportunities/forecast`, {
    headers: authHeaders(accessToken, organizationId),
  });
  return parseOrThrow<OpportunityForecast>(response, 'get_opportunity_forecast_failed');
}

export async function getOpportunityTimeline(accessToken: string, organizationId: string, opportunityId: string): Promise<OpportunityTimelineEntry[]> {
  const response = await fetch(`${API_BASE}/${organizationId}/opportunities/${opportunityId}/timeline`, {
    headers: authHeaders(accessToken, organizationId),
  });
  return parseOrThrow<OpportunityTimelineEntry[]>(response, 'get_opportunity_timeline_failed');
}
