import { Injectable } from '@nestjs/common';
import { Pipeline, PipelineStage } from '@prisma/client';
import { PipelineRepository } from '../infrastructure/pipeline.repository';
import { PipelineStageRepository } from '../infrastructure/pipeline-stage.repository';

export interface PipelineWithStages extends Pipeline {
  stages: PipelineStage[];
}

@Injectable()
export class ListPipelinesUseCase {
  constructor(
    private readonly pipelines: PipelineRepository,
    private readonly stages: PipelineStageRepository,
  ) {}

  async execute(organizationId: string): Promise<PipelineWithStages[]> {
    // Garantiza que exista al menos el Pipeline por defecto antes de listar
    // (research.md #3).
    await this.pipelines.findOrCreateDefault(organizationId);
    const pipelines = await this.pipelines.findByOrganizationId(organizationId);
    return Promise.all(
      pipelines.map(async (pipeline) => ({ ...pipeline, stages: await this.stages.findByPipelineId(pipeline.id) })),
    );
  }
}
