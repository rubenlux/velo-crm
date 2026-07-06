import { Injectable } from '@nestjs/common';
import { AuditLogPublisher } from '../../../shared/audit/audit-log.publisher';
import { OpportunityRepository, OpportunityWithStage } from '../infrastructure/opportunity.repository';
import { OpportunityNotArchivedError, OpportunityNotFoundError } from '../domain/errors';

export interface RestoreOpportunityInput {
  organizationId: string;
  actorUserId: string;
  opportunityId: string;
}

@Injectable()
export class RestoreOpportunityUseCase {
  constructor(
    private readonly opportunities: OpportunityRepository,
    private readonly auditLog: AuditLogPublisher,
  ) {}

  async execute(input: RestoreOpportunityInput): Promise<OpportunityWithStage> {
    const current = await this.opportunities.findById(input.organizationId, input.opportunityId);
    if (!current) {
      throw new OpportunityNotFoundError();
    }
    if (current.state !== 'Archivada') {
      throw new OpportunityNotArchivedError();
    }

    const restoredState = current.stateBeforeArchive ?? 'Abierta';
    const updated = await this.opportunities.update(input.organizationId, input.opportunityId, {
      state: restoredState,
      stateBeforeArchive: null,
    });

    await this.auditLog.publish({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: 'OpportunityRestored',
      metadata: { opportunityId: input.opportunityId, previousState: 'Archivada', newState: restoredState },
    });

    return updated;
  }
}
