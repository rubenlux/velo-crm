import { Injectable } from '@nestjs/common';
import { CustomerPriority } from '@prisma/client';
import { AuditLogPublisher } from '../../../shared/audit/audit-log.publisher';
import { CustomerArchivedGuardService } from '../../customers/application/customer-archived-guard.service';
import { CustomerNotFoundError } from '../../customers/domain/errors';
import { PipelineRepository } from '../infrastructure/pipeline.repository';
import { PipelineStageRepository } from '../infrastructure/pipeline-stage.repository';
import { OpportunityRepository, OpportunityWithStage } from '../infrastructure/opportunity.repository';
import { CustomerNotFoundForOpportunityError, PipelineNotFoundError, StageNotFoundError } from '../domain/errors';

export interface CreateOpportunityInput {
  organizationId: string;
  actorUserId: string;
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

@Injectable()
export class CreateOpportunityUseCase {
  constructor(
    private readonly customerArchivedGuard: CustomerArchivedGuardService,
    private readonly pipelines: PipelineRepository,
    private readonly stages: PipelineStageRepository,
    private readonly opportunities: OpportunityRepository,
    private readonly auditLog: AuditLogPublisher,
  ) {}

  async execute(input: CreateOpportunityInput): Promise<OpportunityWithStage> {
    // FR-011 de spec 008 (forward-declarada para esta spec): sin nuevas Oportunidades
    // sobre un Customer archivado.
    try {
      await this.customerArchivedGuard.assertActive(input.organizationId, input.customerId);
    } catch (err) {
      if (err instanceof CustomerNotFoundError) {
        throw new CustomerNotFoundForOpportunityError();
      }
      throw err;
    }

    let pipelineId = input.pipelineId;
    let stageId = input.stageId;
    if (!pipelineId || !stageId) {
      // Sin Pipeline/etapa indicados: usa el por defecto, creándolo perezosamente
      // si esta Organization todavía no tiene ninguno (research.md #3).
      const pipeline = await this.pipelines.findOrCreateDefault(input.organizationId);
      const orgStages = await this.stages.findByPipelineId(pipeline.id);
      pipelineId = pipeline.id;
      stageId = orgStages[0].id;
    } else {
      const pipeline = await this.pipelines.findById(input.organizationId, pipelineId);
      if (!pipeline) {
        throw new PipelineNotFoundError();
      }
      const stage = await this.stages.findById(stageId);
      if (!stage || stage.pipelineId !== pipelineId) {
        throw new StageNotFoundError();
      }
    }

    const opportunity = await this.opportunities.create({
      organizationId: input.organizationId,
      customerId: input.customerId,
      contactId: input.contactId,
      name: input.name,
      ownerUserId: input.ownerUserId,
      pipelineId,
      stageId,
      estimatedValue: input.estimatedValue,
      probability: input.probability,
      estimatedCloseDate: input.estimatedCloseDate ? new Date(input.estimatedCloseDate) : undefined,
      priority: input.priority,
      competitor: input.competitor,
      notes: input.notes,
      tags: input.tags ?? [],
    });

    await this.auditLog.publish({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: 'OpportunityCreated',
      metadata: { opportunityId: opportunity.id, customerId: input.customerId },
    });

    return opportunity;
  }
}
