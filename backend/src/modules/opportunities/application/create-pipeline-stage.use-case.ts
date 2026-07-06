import { Injectable } from '@nestjs/common';
import { PipelineStage } from '@prisma/client';
import { PipelineRepository } from '../infrastructure/pipeline.repository';
import { PipelineStageRepository } from '../infrastructure/pipeline-stage.repository';
import { PipelineNotFoundError } from '../domain/errors';

export interface CreatePipelineStageInput {
  organizationId: string;
  pipelineId: string;
  name: string;
  order: number;
  isWonStage?: boolean;
  isLostStage?: boolean;
}

@Injectable()
export class CreatePipelineStageUseCase {
  constructor(
    private readonly pipelines: PipelineRepository,
    private readonly stages: PipelineStageRepository,
  ) {}

  async execute(input: CreatePipelineStageInput): Promise<PipelineStage> {
    // Valida que el Pipeline pertenezca a esta Organization antes de agregarle una
    // etapa — mismo patrón de aislamiento tenant que el resto del proyecto.
    const pipeline = await this.pipelines.findById(input.organizationId, input.pipelineId);
    if (!pipeline) {
      throw new PipelineNotFoundError();
    }
    return this.stages.create({
      pipelineId: input.pipelineId,
      name: input.name,
      order: input.order,
      isWonStage: input.isWonStage ?? false,
      isLostStage: input.isLostStage ?? false,
    });
  }
}
