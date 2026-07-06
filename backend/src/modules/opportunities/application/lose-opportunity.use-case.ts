import { Injectable } from '@nestjs/common';
import { AuditLogPublisher } from '../../../shared/audit/audit-log.publisher';
import { MembershipRepository } from '../../organizations/infrastructure/membership.repository';
import { EffectivePermissionsService } from '../../roles/application/effective-permissions.service';
import { OpportunityRepository, OpportunityWithStage } from '../infrastructure/opportunity.repository';
import { PipelineStageRepository } from '../infrastructure/pipeline-stage.repository';
import { OpportunityArchivedError, OpportunityNotFoundError, RequiresEditWonPermissionError, StageNotFoundError } from '../domain/errors';

export interface LoseOpportunityInput {
  organizationId: string;
  actorUserId: string;
  opportunityId: string;
}

// Guarda stageBeforeLost, mueve a la etapa isLostStage; state → Perdida
// (research.md #15) — reabrir restaura ambos.
@Injectable()
export class LoseOpportunityUseCase {
  constructor(
    private readonly opportunities: OpportunityRepository,
    private readonly stages: PipelineStageRepository,
    private readonly memberships: MembershipRepository,
    private readonly effectivePermissions: EffectivePermissionsService,
    private readonly auditLog: AuditLogPublisher,
  ) {}

  async execute(input: LoseOpportunityInput): Promise<OpportunityWithStage> {
    const current = await this.opportunities.findById(input.organizationId, input.opportunityId);
    if (!current) {
      throw new OpportunityNotFoundError();
    }
    if (current.state === 'Archivada') {
      throw new OpportunityArchivedError();
    }
    // RN-005: mover una Oportunidad Ganada directamente a Perdida es, en la
    // práctica, modificarla — exige el mismo permiso que editarla por PATCH.
    if (current.state === 'Ganada') {
      const membership = await this.memberships.findByUserAndOrganization(input.actorUserId, input.organizationId);
      const allowed = membership ? await this.effectivePermissions.hasPermission(membership, 'opportunity.edit_won') : false;
      if (!allowed) {
        throw new RequiresEditWonPermissionError();
      }
    }

    const pipelineStages = await this.stages.findByPipelineId(current.pipelineId);
    const lostStage = pipelineStages.find((stage) => stage.isLostStage);
    if (!lostStage) {
      throw new StageNotFoundError();
    }

    const updated = await this.opportunities.update(input.organizationId, input.opportunityId, {
      stageId: lostStage.id,
      state: 'Perdida',
      stageBeforeLost: current.stageId,
    });

    await this.auditLog.publish({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: 'OpportunityLost',
      metadata: { opportunityId: input.opportunityId, previousState: current.state, newState: 'Perdida' },
    });

    return updated;
  }
}
