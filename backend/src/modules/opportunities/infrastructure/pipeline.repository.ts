import { Injectable } from '@nestjs/common';
import { Pipeline, Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';

type Db = Pick<PrismaService, 'pipeline' | 'pipelineStage'>;

// Etapas por defecto seed (research.md #3) — nombres/orden/flags won-lost tomados
// literalmente de spec.md.
const DEFAULT_STAGES: { name: string; order: number; isWonStage?: boolean; isLostStage?: boolean }[] = [
  { name: 'Nueva', order: 0 },
  { name: 'Calificada', order: 1 },
  { name: 'Descubrimiento', order: 2 },
  { name: 'Propuesta', order: 3 },
  { name: 'Negociación', order: 4 },
  { name: 'Cierre', order: 5 },
  { name: 'Ganada', order: 6, isWonStage: true },
  { name: 'Perdida', order: 7, isLostStage: true },
];

@Injectable()
export class PipelineRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.PipelineUncheckedCreateInput, db: Db = this.prisma): Promise<Pipeline> {
    return db.pipeline.create({ data });
  }

  findById(organizationId: string, pipelineId: string): Promise<Pipeline | null> {
    return this.prisma.pipeline.findFirst({ where: { id: pipelineId, organizationId } });
  }

  findByOrganizationId(organizationId: string): Promise<Pipeline[]> {
    return this.prisma.pipeline.findMany({ where: { organizationId }, orderBy: { createdAt: 'asc' } });
  }

  // Crea perezosamente el Pipeline "Por defecto" + sus 8 etapas seed la primera vez
  // que una Organization necesita una Oportunidad (research.md #3) — evita que
  // OrganizationsModule (spec 005) tenga que importar OpportunitiesModule. El
  // índice único parcial `pipelines_organization_default_unique` es la defensa en
  // profundidad contra dos llamadas concurrentes para la misma Organization (mismo
  // patrón que contacts_customer_primary_unique, spec 009 research.md #4): si la
  // creación viola ese índice, otra request ya ganó la carrera — se relee y se
  // devuelve la fila que quedó.
  async findOrCreateDefault(organizationId: string): Promise<Pipeline> {
    const existing = await this.prisma.pipeline.findFirst({ where: { organizationId, isDefault: true } });
    if (existing) {
      return existing;
    }
    try {
      return await this.prisma.$transaction(async (tx) => {
        const pipeline = await tx.pipeline.create({ data: { organizationId, name: 'Por defecto', isDefault: true } });
        await tx.pipelineStage.createMany({
          data: DEFAULT_STAGES.map((stage) => ({
            pipelineId: pipeline.id,
            name: stage.name,
            order: stage.order,
            isWonStage: stage.isWonStage ?? false,
            isLostStage: stage.isLostStage ?? false,
          })),
        });
        return pipeline;
      });
    } catch (error) {
      // P2002 = unique constraint violation — Prisma reports this from Postgres'
      // SQLSTATE 23505 regardless of whether the index is declared in schema.prisma,
      // so it fires for this hand-added partial index too.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const winner = await this.prisma.pipeline.findFirst({ where: { organizationId, isDefault: true } });
        if (winner) {
          return winner;
        }
      }
      throw error;
    }
  }
}
