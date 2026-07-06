import { Injectable } from '@nestjs/common';
import { Opportunity, OpportunityState, Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';

type Db = Pick<PrismaService, 'opportunity'>;

export const OPPORTUNITY_WITH_STAGE_INCLUDE = {
  stage: true,
  pipeline: true,
} satisfies Prisma.OpportunityInclude;

export type OpportunityWithStage = Prisma.OpportunityGetPayload<{ include: typeof OPPORTUNITY_WITH_STAGE_INCLUDE }>;

export interface OpportunitySearchFilters {
  q?: string;
  customerId?: string;
  contactId?: string;
  ownerUserId?: string;
  stageId?: string;
  state?: OpportunityState;
  priority?: string;
  tag?: string;
  skip?: number;
  take?: number;
}

@Injectable()
export class OpportunityRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.OpportunityUncheckedCreateInput, db: Db = this.prisma): Promise<OpportunityWithStage> {
    return db.opportunity.create({ data, include: OPPORTUNITY_WITH_STAGE_INCLUDE });
  }

  // Scoped por organizationId en la query misma — mismo patrón de defensa en
  // profundidad que Customer/Contact/Lead.
  findById(organizationId: string, opportunityId: string): Promise<OpportunityWithStage | null> {
    return this.prisma.opportunity.findFirst({
      where: { id: opportunityId, organizationId },
      include: OPPORTUNITY_WITH_STAGE_INCLUDE,
    });
  }

  async updateWithVersionCheck(
    organizationId: string,
    opportunityId: string,
    expectedVersion: number,
    data: Prisma.OpportunityUncheckedUpdateInput,
  ): Promise<OpportunityWithStage | null> {
    const { count } = await this.prisma.opportunity.updateMany({
      where: { id: opportunityId, organizationId, version: expectedVersion },
      data: { ...data, version: { increment: 1 } },
    });
    if (count === 0) {
      return null;
    }
    return this.prisma.opportunity.findUniqueOrThrow({ where: { id: opportunityId }, include: OPPORTUNITY_WITH_STAGE_INCLUDE });
  }

  async update(organizationId: string, opportunityId: string, data: Prisma.OpportunityUncheckedUpdateInput): Promise<OpportunityWithStage> {
    await this.prisma.opportunity.updateMany({ where: { id: opportunityId, organizationId }, data });
    return this.prisma.opportunity.findUniqueOrThrow({ where: { id: opportunityId }, include: OPPORTUNITY_WITH_STAGE_INCLUDE });
  }

  async search(organizationId: string, filters: OpportunitySearchFilters): Promise<{ items: OpportunityWithStage[]; total: number }> {
    const where: Prisma.OpportunityWhereInput = { organizationId };
    if (filters.customerId) where.customerId = filters.customerId;
    if (filters.contactId) where.contactId = filters.contactId;
    if (filters.ownerUserId) where.ownerUserId = filters.ownerUserId;
    if (filters.stageId) where.stageId = filters.stageId;
    if (filters.state) where.state = filters.state;
    if (filters.priority) where.priority = filters.priority as Opportunity['priority'];
    if (filters.tag) where.tags = { has: filters.tag };
    if (filters.q) {
      where.name = { contains: filters.q, mode: 'insensitive' };
    }

    const [items, total] = await Promise.all([
      this.prisma.opportunity.findMany({
        where,
        include: OPPORTUNITY_WITH_STAGE_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: filters.skip ?? 0,
        take: filters.take ?? 50,
      }),
      this.prisma.opportunity.count({ where }),
    ]);
    return { items, total };
  }

  // Agregados en vivo para KPIs/forecast (research.md #13) — sin caché ni tabla
  // materializada.
  findAllForAggregation(organizationId: string): Promise<OpportunityWithStage[]> {
    return this.prisma.opportunity.findMany({ where: { organizationId }, include: OPPORTUNITY_WITH_STAGE_INCLUDE });
  }
}
