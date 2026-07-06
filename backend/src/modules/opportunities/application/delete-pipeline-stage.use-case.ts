import { Injectable } from '@nestjs/common';
import { PipelineRepository } from '../infrastructure/pipeline.repository';
import { PipelineStageRepository } from '../infrastructure/pipeline-stage.repository';
import { PipelineNotFoundError, StageHasOpenOpportunitiesError, StageNotFoundError } from '../domain/errors';

export interface DeletePipelineStageInput {
  organizationId: string;
  pipelineId: string;
  stageId: string;
}

// research.md #11, edge case de spec.md: rechaza si hay Oportunidades Abierta
// asignadas — deben reasignarse a otra etapa antes de eliminarla.
@Injectable()
export class DeletePipelineStageUseCase {
  constructor(
    private readonly pipelines: PipelineRepository,
    private readonly stages: PipelineStageRepository,
  ) {}

  async execute(input: DeletePipelineStageInput): Promise<void> {
    const pipeline = await this.pipelines.findById(input.organizationId, input.pipelineId);
    if (!pipeline) {
      throw new PipelineNotFoundError();
    }
    const stage = await this.stages.findById(input.stageId);
    if (!stage || stage.pipelineId !== input.pipelineId) {
      throw new StageNotFoundError();
    }
    const openCount = await this.stages.countOpenOpportunities(input.stageId);
    if (openCount > 0) {
      throw new StageHasOpenOpportunitiesError();
    }
    await this.stages.delete(input.stageId);
  }
}
