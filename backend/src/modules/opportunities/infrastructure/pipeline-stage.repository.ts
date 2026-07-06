import { Injectable } from '@nestjs/common';
import { PipelineStage, Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';

@Injectable()
export class PipelineStageRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.PipelineStageUncheckedCreateInput): Promise<PipelineStage> {
    return this.prisma.pipelineStage.create({ data });
  }

  findById(stageId: string): Promise<PipelineStage | null> {
    return this.prisma.pipelineStage.findUnique({ where: { id: stageId } });
  }

  findByPipelineId(pipelineId: string): Promise<PipelineStage[]> {
    return this.prisma.pipelineStage.findMany({ where: { pipelineId }, orderBy: { order: 'asc' } });
  }

  update(stageId: string, data: Prisma.PipelineStageUncheckedUpdateInput): Promise<PipelineStage> {
    return this.prisma.pipelineStage.update({ where: { id: stageId }, data });
  }

  // Rechaza (vía el use case, que consulta esto primero) si hay Oportunidades
  // Abierta asignadas — research.md #11, edge case de spec.md.
  countOpenOpportunities(stageId: string): Promise<number> {
    return this.prisma.opportunity.count({ where: { stageId, state: 'Abierta' } });
  }

  delete(stageId: string): Promise<PipelineStage> {
    return this.prisma.pipelineStage.delete({ where: { id: stageId } });
  }
}
