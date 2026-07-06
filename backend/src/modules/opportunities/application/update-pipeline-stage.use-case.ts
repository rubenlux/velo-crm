import { Injectable } from '@nestjs/common';
import { PipelineStage } from '@prisma/client';
import { PipelineRepository } from '../infrastructure/pipeline.repository';
import { PipelineStageRepository } from '../infrastructure/pipeline-stage.repository';
import { PipelineNotFoundError, StageNotFoundError } from '../domain/errors';

export interface UpdatePipelineStageInput {
  organizationId: string;
  pipelineId: string;
  stageId: string;
  name?: string;
  order?: number;
  isWonStage?: boolean;
  isLostStage?: boolean;
}

@Injectable()
export class UpdatePipelineStageUseCase {
  constructor(
    private readonly pipelines: PipelineRepository,
    private readonly stages: PipelineStageRepository,
  ) {}

  async execute(input: UpdatePipelineStageInput): Promise<PipelineStage> {
    const pipeline = await this.pipelines.findById(input.organizationId, input.pipelineId);
    if (!pipeline) {
      throw new PipelineNotFoundError();
    }
    const stage = await this.stages.findById(input.stageId);
    if (!stage || stage.pipelineId !== input.pipelineId) {
      throw new StageNotFoundError();
    }
    return this.stages.update(input.stageId, {
      name: input.name,
      order: input.order,
      isWonStage: input.isWonStage,
      isLostStage: input.isLostStage,
    });
  }
}
