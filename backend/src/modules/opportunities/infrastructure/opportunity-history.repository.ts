import { Injectable } from '@nestjs/common';
import { OpportunityHistory, Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';

@Injectable()
export class OpportunityHistoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  append(data: { opportunityId: string; changedByUserId: string; changes: Prisma.InputJsonValue }): Promise<OpportunityHistory> {
    return this.prisma.opportunityHistory.create({ data });
  }

  findByOpportunityId(opportunityId: string): Promise<OpportunityHistory[]> {
    return this.prisma.opportunityHistory.findMany({ where: { opportunityId }, orderBy: { changedAt: 'asc' } });
  }
}
