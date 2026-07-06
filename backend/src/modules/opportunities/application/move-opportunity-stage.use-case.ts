import { Injectable } from '@nestjs/common';
import { AuditLogPublisher } from '../../../shared/audit/audit-log.publisher';
import { MembershipRepository } from '../../organizations/infrastructure/membership.repository';
import { EffectivePermissionsService } from '../../roles/application/effective-permissions.service';
import { OpportunityRepository, OpportunityWithStage } from '../infrastructure/opportunity.repository';
import { OpportunityHistoryRepository } from '../infrastructure/opportunity-history.repository';
import { PipelineStageRepository } from '../infrastructure/pipeline-stage.repository';
import {
  OpportunityArchivedError,
  OpportunityNotFoundError,
  RequiresEditWonPermissionError,
  StageNotFoundError,
} from '../domain/errors';

export interface MoveOpportunityStageInput {
  organizationId: string;
  actorUserId: string;
  opportunityId: string;
  stageId: string;
}

@Injectable()
export class MoveOpportunityStageUseCase {
  constructor(
    private readonly opportunities: OpportunityRepository,
    private readonly stages: PipelineStageRepository,
    private readonly history: OpportunityHistoryRepository,
    private readonly memberships: MembershipRepository,
    private readonly effectivePermissions: EffectivePermissionsService,
    private readonly auditLog: AuditLogPublisher,
  ) {}

  async execute(input: MoveOpportunityStageInput): Promise<OpportunityWithStage> {
    const current = await this.opportunities.findById(input.organizationId, input.opportunityId);
    if (!current) {
      throw new OpportunityNotFoundError();
    }
    if (current.state === 'Archivada') {
      throw new OpportunityArchivedError();
    }
    if (current.state === 'Ganada') {
      const membership = await this.memberships.findByUserAndOrganization(input.actorUserId, input.organizationId);
      const allowed = membership ? await this.effectivePermissions.hasPermission(membership, 'opportunity.edit_won') : false;
      if (!allowed) {
        throw new RequiresEditWonPermissionError();
      }
    }

    const targetStage = await this.stages.findById(input.stageId);
    if (!targetStage || targetStage.pipelineId !== current.pipelineId) {
      throw new StageNotFoundError();
    }

    const nextState = targetStage.isWonStage ? 'Ganada' : targetStage.isLostStage ? 'Perdida' : 'Abierta';
    const updated = await this.opportunities.update(input.organizationId, input.opportunityId, {
      stageId: input.stageId,
      state: nextState,
    });

    await this.history.append({
      opportunityId: input.opportunityId,
      changedByUserId: input.actorUserId,
      changes: { stageId: { before: current.stageId, after: input.stageId } },
    });
    await this.auditLog.publish({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: 'OpportunityStageChanged',
      metadata: { opportunityId: input.opportunityId, previousStageId: current.stageId, newStageId: input.stageId },
    });

    return updated;
  }
}
