import { Injectable } from '@nestjs/common';
import { AuditLogPublisher } from '../../../shared/audit/audit-log.publisher';
import { OpportunityRepository, OpportunityWithStage } from '../infrastructure/opportunity.repository';
import { OpportunityNotFoundError } from '../domain/errors';

export interface ArchiveOpportunityInput {
  organizationId: string;
  actorUserId: string;
  opportunityId: string;
}

// No toca stageId (research.md #15) — solo state → Archivada, guardando el state
// anterior para restaurar.
@Injectable()
export class ArchiveOpportunityUseCase {
  constructor(
    private readonly opportunities: OpportunityRepository,
    private readonly auditLog: AuditLogPublisher,
  ) {}

  async execute(input: ArchiveOpportunityInput): Promise<OpportunityWithStage> {
    const current = await this.opportunities.findById(input.organizationId, input.opportunityId);
    if (!current) {
      throw new OpportunityNotFoundError();
    }

    const updated = await this.opportunities.update(input.organizationId, input.opportunityId, {
      state: 'Archivada',
      stateBeforeArchive: current.state,
    });

    await this.auditLog.publish({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: 'OpportunityArchived',
      metadata: { opportunityId: input.opportunityId, previousState: current.state, newState: 'Archivada' },
    });

    return updated;
  }
}
