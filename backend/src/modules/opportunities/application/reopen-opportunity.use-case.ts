import { Injectable } from '@nestjs/common';
import { AuditLogPublisher } from '../../../shared/audit/audit-log.publisher';
import { OpportunityRepository, OpportunityWithStage } from '../infrastructure/opportunity.repository';
import { OpportunityNotFoundError, OpportunityNotLostError } from '../domain/errors';

export interface ReopenOpportunityInput {
  organizationId: string;
  actorUserId: string;
  opportunityId: string;
}

@Injectable()
export class ReopenOpportunityUseCase {
  constructor(
    private readonly opportunities: OpportunityRepository,
    private readonly auditLog: AuditLogPublisher,
  ) {}

  async execute(input: ReopenOpportunityInput): Promise<OpportunityWithStage> {
    const current = await this.opportunities.findById(input.organizationId, input.opportunityId);
    if (!current) {
      throw new OpportunityNotFoundError();
    }
    if (current.state !== 'Perdida') {
      throw new OpportunityNotLostError();
    }

    const updated = await this.opportunities.update(input.organizationId, input.opportunityId, {
      stageId: current.stageBeforeLost ?? current.stageId,
      state: 'Abierta',
      stageBeforeLost: null,
    });

    await this.auditLog.publish({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: 'OpportunityReopened',
      metadata: { opportunityId: input.opportunityId, previousState: 'Perdida', newState: 'Abierta' },
    });

    return updated;
  }
}
