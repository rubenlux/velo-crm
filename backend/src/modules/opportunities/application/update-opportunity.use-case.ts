import { Injectable } from '@nestjs/common';
import { CustomerPriority, Prisma } from '@prisma/client';
import { AuditLogPublisher } from '../../../shared/audit/audit-log.publisher';
import { MembershipRepository } from '../../organizations/infrastructure/membership.repository';
import { EffectivePermissionsService } from '../../roles/application/effective-permissions.service';
import { OpportunityRepository, OpportunityWithStage } from '../infrastructure/opportunity.repository';
import { OpportunityHistoryRepository } from '../infrastructure/opportunity-history.repository';
import { OpportunityNotFoundError, OpportunityStaleUpdateError, RequiresEditWonPermissionError } from '../domain/errors';

export interface UpdateOpportunityInput {
  organizationId: string;
  actorUserId: string;
  opportunityId: string;
  version: number;
  name?: string;
  ownerUserId?: string;
  estimatedValue?: number;
  probability?: number;
  estimatedCloseDate?: string;
  priority?: CustomerPriority;
  competitor?: string;
  notes?: string;
  tags?: string[];
}

const NON_FIELD_KEYS = new Set(['organizationId', 'actorUserId', 'opportunityId', 'version']);

function comparable(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return JSON.stringify(value);
  return value;
}

@Injectable()
export class UpdateOpportunityUseCase {
  constructor(
    private readonly opportunities: OpportunityRepository,
    private readonly history: OpportunityHistoryRepository,
    private readonly memberships: MembershipRepository,
    private readonly effectivePermissions: EffectivePermissionsService,
    private readonly auditLog: AuditLogPublisher,
  ) {}

  async execute(input: UpdateOpportunityInput): Promise<OpportunityWithStage> {
    const current = await this.opportunities.findById(input.organizationId, input.opportunityId);
    if (!current) {
      throw new OpportunityNotFoundError();
    }

    // RN-005: editar una Opportunity Ganada exige opportunity.edit_won, no el
    // opportunity.update genérico ya validado por el controller. Se mantiene
    // exigido si está Archivada pero era Ganada antes de archivarse — evita que
    // archive → update → restore sea un bypass del permiso.
    const isEffectivelyWon = current.state === 'Ganada' || (current.state === 'Archivada' && current.stateBeforeArchive === 'Ganada');
    if (isEffectivelyWon) {
      const membership = await this.memberships.findByUserAndOrganization(input.actorUserId, input.organizationId);
      const allowed = membership ? await this.effectivePermissions.hasPermission(membership, 'opportunity.edit_won') : false;
      if (!allowed) {
        throw new RequiresEditWonPermissionError();
      }
    }

    const changes: Record<string, { before: unknown; after: unknown }> = {};
    for (const [key, rawAfter] of Object.entries(input)) {
      if (NON_FIELD_KEYS.has(key) || rawAfter === undefined) {
        continue;
      }
      const before = (current as unknown as Record<string, unknown>)[key];
      const after = key === 'estimatedCloseDate' ? new Date(rawAfter as string) : rawAfter;
      if (comparable(before) !== comparable(after)) {
        changes[key] = { before: before ?? null, after: rawAfter };
      }
    }

    const { organizationId, actorUserId, opportunityId, version, estimatedCloseDate, tags, ...rest } = input;
    const updated = await this.opportunities.updateWithVersionCheck(organizationId, opportunityId, version, {
      ...rest,
      estimatedCloseDate: estimatedCloseDate !== undefined ? new Date(estimatedCloseDate) : undefined,
      tags: tags ?? undefined,
    });
    if (!updated) {
      throw new OpportunityStaleUpdateError();
    }

    if (Object.keys(changes).length > 0) {
      await this.history.append({ opportunityId, changedByUserId: actorUserId, changes: changes as Prisma.InputJsonValue });
    }

    const valueFields = ['estimatedValue', 'probability'];
    if (Object.keys(changes).some((key) => valueFields.includes(key))) {
      await this.auditLog.publish({
        organizationId,
        actorUserId,
        action: 'OpportunityValueChanged',
        metadata: {
          opportunityId,
          previousEstimatedValue: changes.estimatedValue?.before ?? null,
          newEstimatedValue: changes.estimatedValue?.after ?? null,
          previousProbability: changes.probability?.before ?? null,
          newProbability: changes.probability?.after ?? null,
        } as Prisma.InputJsonValue,
      });
    }
    if ('ownerUserId' in changes) {
      await this.auditLog.publish({
        organizationId,
        actorUserId,
        action: 'OpportunityOwnerChanged',
        metadata: {
          opportunityId,
          previousOwnerUserId: changes.ownerUserId.before,
          newOwnerUserId: changes.ownerUserId.after,
        } as Prisma.InputJsonValue,
      });
    }
    const otherFields = Object.keys(changes).filter((key) => !valueFields.includes(key) && key !== 'ownerUserId');
    if (otherFields.length > 0) {
      await this.auditLog.publish({
        organizationId,
        actorUserId,
        action: 'OpportunityUpdated',
        metadata: { opportunityId, fields: otherFields },
      });
    }

    return updated;
  }
}
