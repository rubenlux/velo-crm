import { AuthApiError } from './auth-api';
import { CustomerPriority } from './customers-api';

const API_BASE = '/api/v1/organizations';

export type ActivityStatus = 'Pendiente' | 'EnProceso' | 'Finalizada' | 'Cancelada';

export interface ActivityType {
  id: string;
  organizationId: string | null;
  name: string;
  isDefault: boolean;
  createdAt: string;
}

export interface Activity {
  id: string;
  organizationId: string;
  customerId: string | null;
  contactId: string | null;
  leadId: string | null;
  opportunityId: string | null;
  activityTypeId: string;
  title: string;
  description: string | null;
  scheduledAt: string;
  durationMinutes: number | null;
  status: ActivityStatus;
  statusBeforeCancel: ActivityStatus | null;
  priority: CustomerPriority;
  authorUserId: string;
  ownerUserId: string | null;
  participantUserIds: string[];
  result: string | null;
  finishedAt: string | null;
  originActivityId: string | null;
  tags: string[];
  version: number;
  createdAt: string;
  updatedAt: string;
  activityType: ActivityType;
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

export async function listActivityTypes(accessToken: string, organizationId: string): Promise<ActivityType[]> {
  const response = await fetch(`${API_BASE}/${organizationId}/activity-types`, {
    headers: authHeaders(accessToken, organizationId),
  });
  return parseOrThrow<ActivityType[]>(response, 'list_activity_types_failed');
}

export async function createActivityType(accessToken: string, organizationId: string, name: string): Promise<ActivityType> {
  const response = await fetch(`${API_BASE}/${organizationId}/activity-types`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(accessToken, organizationId) },
    body: JSON.stringify({ name }),
  });
  return parseOrThrow<ActivityType>(response, 'create_activity_type_failed');
}

export interface CreateActivityInput {
  customerId?: string;
  contactId?: string;
  leadId?: string;
  opportunityId?: string;
  activityTypeId: string;
  title: string;
  description?: string;
  scheduledAt: string;
  durationMinutes?: number;
  priority?: CustomerPriority;
  ownerUserId?: string;
  participantUserIds?: string[];
  tags?: string[];
}

export async function createActivity(accessToken: string, organizationId: string, input: CreateActivityInput): Promise<Activity> {
  const response = await fetch(`${API_BASE}/${organizationId}/activities`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(accessToken, organizationId) },
    body: JSON.stringify(input),
  });
  return parseOrThrow<Activity>(response, 'create_activity_failed');
}

export async function getActivity(accessToken: string, organizationId: string, activityId: string): Promise<Activity> {
  const response = await fetch(`${API_BASE}/${organizationId}/activities/${activityId}`, {
    headers: authHeaders(accessToken, organizationId),
  });
  return parseOrThrow<Activity>(response, 'get_activity_failed');
}

export type UpdateActivityInput = Partial<Omit<CreateActivityInput, 'customerId' | 'contactId' | 'leadId' | 'opportunityId' | 'activityTypeId'>> & {
  version: number;
  status?: ActivityStatus;
  result?: string;
};

export async function updateActivity(
  accessToken: string,
  organizationId: string,
  activityId: string,
  input: UpdateActivityInput,
): Promise<Activity> {
  const response = await fetch(`${API_BASE}/${organizationId}/activities/${activityId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders(accessToken, organizationId) },
    body: JSON.stringify(input),
  });
  return parseOrThrow<Activity>(response, 'update_activity_failed');
}

export async function cancelActivity(accessToken: string, organizationId: string, activityId: string): Promise<Activity> {
  const response = await fetch(`${API_BASE}/${organizationId}/activities/${activityId}/cancel`, {
    method: 'POST',
    headers: authHeaders(accessToken, organizationId),
  });
  return parseOrThrow<Activity>(response, 'cancel_activity_failed');
}

export async function reactivateActivity(accessToken: string, organizationId: string, activityId: string): Promise<Activity> {
  const response = await fetch(`${API_BASE}/${organizationId}/activities/${activityId}/reactivate`, {
    method: 'POST',
    headers: authHeaders(accessToken, organizationId),
  });
  return parseOrThrow<Activity>(response, 'reactivate_activity_failed');
}

export interface ActivitySearchFilters {
  q?: string;
  customerId?: string;
  contactId?: string;
  leadId?: string;
  opportunityId?: string;
  ownerUserId?: string;
  activityTypeId?: string;
  status?: ActivityStatus;
  priority?: CustomerPriority;
  tag?: string;
}

export interface ActivitySearchResult {
  items: Activity[];
  total: number;
}

export async function searchActivities(
  accessToken: string,
  organizationId: string,
  filters: ActivitySearchFilters = {},
): Promise<ActivitySearchResult> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  const query = params.toString();
  const response = await fetch(`${API_BASE}/${organizationId}/activities${query ? `?${query}` : ''}`, {
    headers: authHeaders(accessToken, organizationId),
  });
  return parseOrThrow<ActivitySearchResult>(response, 'search_activities_failed');
}

export interface ActivityAttachment {
  id: string;
  activityId: string;
  fileName: string;
  fileUrl: string;
  uploadedByUserId: string;
  uploadedAt: string;
}

export interface ActivityComment {
  id: string;
  activityId: string;
  authorUserId: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export async function listActivityAttachments(accessToken: string, organizationId: string, activityId: string): Promise<ActivityAttachment[]> {
  const response = await fetch(`${API_BASE}/${organizationId}/activities/${activityId}/attachments`, {
    headers: authHeaders(accessToken, organizationId),
  });
  return parseOrThrow<ActivityAttachment[]>(response, 'list_activity_attachments_failed');
}

export async function addActivityAttachment(
  accessToken: string,
  organizationId: string,
  activityId: string,
  fileName: string,
  fileUrl: string,
): Promise<ActivityAttachment> {
  const response = await fetch(`${API_BASE}/${organizationId}/activities/${activityId}/attachments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(accessToken, organizationId) },
    body: JSON.stringify({ fileName, fileUrl }),
  });
  return parseOrThrow<ActivityAttachment>(response, 'add_activity_attachment_failed');
}

export async function listActivityComments(accessToken: string, organizationId: string, activityId: string): Promise<ActivityComment[]> {
  const response = await fetch(`${API_BASE}/${organizationId}/activities/${activityId}/comments`, {
    headers: authHeaders(accessToken, organizationId),
  });
  return parseOrThrow<ActivityComment[]>(response, 'list_activity_comments_failed');
}

export async function addActivityComment(accessToken: string, organizationId: string, activityId: string, body: string): Promise<ActivityComment> {
  const response = await fetch(`${API_BASE}/${organizationId}/activities/${activityId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(accessToken, organizationId) },
    body: JSON.stringify({ body }),
  });
  return parseOrThrow<ActivityComment>(response, 'add_activity_comment_failed');
}

export async function updateActivityComment(
  accessToken: string,
  organizationId: string,
  activityId: string,
  commentId: string,
  body: string,
): Promise<ActivityComment> {
  const response = await fetch(`${API_BASE}/${organizationId}/activities/${activityId}/comments/${commentId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders(accessToken, organizationId) },
    body: JSON.stringify({ body }),
  });
  return parseOrThrow<ActivityComment>(response, 'update_activity_comment_failed');
}

export async function deleteActivityComment(accessToken: string, organizationId: string, activityId: string, commentId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/${organizationId}/activities/${activityId}/comments/${commentId}`, {
    method: 'DELETE',
    headers: authHeaders(accessToken, organizationId),
  });
  return parseOrThrow<void>(response, 'delete_activity_comment_failed');
}

export type ScheduleFollowUpActivityInput = Omit<CreateActivityInput, 'customerId' | 'contactId' | 'leadId' | 'opportunityId'>;

export async function scheduleFollowUpActivity(
  accessToken: string,
  organizationId: string,
  activityId: string,
  input: ScheduleFollowUpActivityInput,
): Promise<Activity> {
  const response = await fetch(`${API_BASE}/${organizationId}/activities/${activityId}/schedule-follow-up`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(accessToken, organizationId) },
    body: JSON.stringify(input),
  });
  return parseOrThrow<Activity>(response, 'schedule_follow_up_activity_failed');
}

export interface ActivityTimelineEntry {
  type: 'audit' | 'edit';
  occurredAt: string;
  actorUserId: string | null;
  detail: unknown;
}

export async function getActivityTimeline(accessToken: string, organizationId: string, activityId: string): Promise<ActivityTimelineEntry[]> {
  const response = await fetch(`${API_BASE}/${organizationId}/activities/${activityId}/timeline`, {
    headers: authHeaders(accessToken, organizationId),
  });
  return parseOrThrow<ActivityTimelineEntry[]>(response, 'get_activity_timeline_failed');
}
