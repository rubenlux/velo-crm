import { Injectable } from '@nestjs/common';
import { Pipeline } from '@prisma/client';
import { PipelineRepository } from '../infrastructure/pipeline.repository';

export interface CreatePipelineInput {
  organizationId: string;
  name: string;
}

// Una Organization puede tener más de un Pipeline (Assumptions de spec.md) — este es
// para crear uno adicional, distinto del "Por defecto" perezoso.
@Injectable()
export class CreatePipelineUseCase {
  constructor(private readonly pipelines: PipelineRepository) {}

  execute(input: CreatePipelineInput): Promise<Pipeline> {
    return this.pipelines.create({ organizationId: input.organizationId, name: input.name, isDefault: false });
  }
}
