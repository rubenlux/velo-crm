import { Injectable } from '@nestjs/common';
import { Lead, LeadSource, LeadStatus, Prisma } from '@prisma/client';
import { AuditLogPublisher } from '../../../shared/audit/audit-log.publisher';
import { LeadRepository } from '../infrastructure/lead.repository';
import { LeadHistoryRepository } from '../infrastructure/lead-history.repository';
import { LeadAlreadyConvertedError, LeadNotFoundError, LeadStaleUpdateError } from '../domain/errors';

export interface UpdateLeadInput {
  organizationId: string;
  actorUserId: string;
  leadId: string;
  version: number;
  name?: string;
  company?: string;
  jobTitle?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  country?: string;
  state?: string;
  city?: string;
  address?: string;
  source?: LeadSource;
  campaign?: string;
  interest?: string;
  ownerUserId?: string;
  status?: LeadStatus;
  priority?: 'low' | 'medium' | 'high';
  score?: number;
  tags?: string[];
  lastContactedAt?: string;
  // US2: próxima acción (research.md #7).
  nextActionAt?: string;
  nextActionNote?: string;
  customFields?: Record<string, unknown>;
}

const NON_FIELD_KEYS = new Set(['organizationId', 'actorUserId', 'leadId', 'version']);

function comparable(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return JSON.stringify(value);
  return value;
}

@Injectable()
export class UpdateLeadUseCase {
  constructor(
    private readonly leads: LeadRepository,
    private readonly history: LeadHistoryRepository,
    private readonly auditLog: AuditLogPublisher,
  ) {}

  async execute(input: UpdateLeadInput): Promise<Lead> {
    const current = await this.leads.findById(input.organizationId, input.leadId);
    if (!current) {
      throw new LeadNotFoundError();
    }
    // Convertido is terminal via this generic edit path — changing status away from
    // it here would let a second /convert call pass its own eligibility guard and
    // create a duplicate Customer/Contact/Opportunity, undermining FR-011.
    if (current.status === 'Convertido' && input.status !== undefined && input.status !== 'Convertido') {
      throw new LeadAlreadyConvertedError();
    }

    const changes: Record<string, { before: unknown; after: unknown }> = {};
    for (const [key, rawAfter] of Object.entries(input)) {
      if (NON_FIELD_KEYS.has(key) || rawAfter === undefined) {
        continue;
      }
      const before = (current as unknown as Record<string, unknown>)[key];
      const after = key === 'lastContactedAt' || key === 'nextActionAt' ? new Date(rawAfter as string) : rawAfter;
      if (comparable(before) !== comparable(after)) {
        changes[key] = { before: before ?? null, after: rawAfter };
      }
    }

    const { organizationId, actorUserId, leadId, version, lastContactedAt, nextActionAt, customFields, ...rest } = input;
    const updated = await this.leads.updateWithVersionCheck(organizationId, leadId, version, {
      ...rest,
      lastContactedAt: lastContactedAt !== undefined ? new Date(lastContactedAt) : undefined,
      nextActionAt: nextActionAt !== undefined ? new Date(nextActionAt) : undefined,
      customFields: customFields ? (customFields as Prisma.InputJsonValue) : undefined,
    });
    if (!updated) {
      throw new LeadStaleUpdateError();
    }

    if (Object.keys(changes).length > 0) {
      await this.history.append({ leadId, changedByUserId: actorUserId, changes: changes as Prisma.InputJsonValue });
    }

    if ('status' in changes) {
      await this.auditLog.publish({
        organizationId,
        actorUserId,
        action: 'LeadStatusChanged',
        metadata: { leadId, previousStatus: changes.status.before, newStatus: changes.status.after } as Prisma.InputJsonValue,
      });
    }
    if ('ownerUserId' in changes) {
      await this.auditLog.publish({
        organizationId,
        actorUserId,
        action: 'LeadOwnerChanged',
        metadata: { leadId, previousOwnerUserId: changes.ownerUserId.before, newOwnerUserId: changes.ownerUserId.after } as Prisma.InputJsonValue,
      });
    }
    const otherFields = Object.keys(changes).filter((key) => key !== 'status' && key !== 'ownerUserId');
    if (otherFields.length > 0) {
      await this.auditLog.publish({
        organizationId,
        actorUserId,
        action: 'LeadUpdated',
        metadata: { leadId, fields: otherFields },
      });
    }

    return updated;
  }
}
