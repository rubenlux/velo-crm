import { Injectable } from '@nestjs/common';
import { AuditLogPublisher } from '../../../shared/audit/audit-log.publisher';
import { OpportunityRepository, OpportunityWithStage } from '../infrastructure/opportunity.repository';
import { PipelineStageRepository } from '../infrastructure/pipeline-stage.repository';
import { OpportunityArchivedError, OpportunityNotFoundError, StageNotFoundError } from '../domain/errors';

export interface WinOpportunityInput {
  organizationId: string;
  actorUserId: string;
  opportunityId: string;
}

// Mueve la Oportunidad a la etapa isWonStage de su propio Pipeline; state → Ganada
// (research.md #2, #15) — no solo cambia el campo state.
@Injectable()
export class WinOpportunityUseCase {
  constructor(
    private readonly opportunities: OpportunityRepository,
    private readonly stages: PipelineStageRepository,
    private readonly auditLog: AuditLogPublisher,
  ) {}

  async execute(input: WinOpportunityInput): Promise<OpportunityWithStage> {
    const current = await this.opportunities.findById(input.organizationId, input.opportunityId);
    if (!current) {
      throw new OpportunityNotFoundError();
    }
    if (current.state === 'Archivada') {
      throw new OpportunityArchivedError();
    }

    const pipelineStages = await this.stages.findByPipelineId(current.pipelineId);
    const wonStage = pipelineStages.find((stage) => stage.isWonStage);
    if (!wonStage) {
      throw new StageNotFoundError();
    }

    const updated = await this.opportunities.update(input.organizationId, input.opportunityId, {
      stageId: wonStage.id,
      state: 'Ganada',
    });

    await this.auditLog.publish({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: 'OpportunityWon',
      metadata: { opportunityId: input.opportunityId, previousState: current.state, newState: 'Ganada' },
    });

    return updated;
  }
}
