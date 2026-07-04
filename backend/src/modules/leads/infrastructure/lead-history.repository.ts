import { Injectable } from '@nestjs/common';
import { LeadHistory, Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';

@Injectable()
export class LeadHistoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  append(data: { leadId: string; changedByUserId: string; changes: Prisma.InputJsonValue }): Promise<LeadHistory> {
    return this.prisma.leadHistory.create({ data });
  }

  findByLeadId(leadId: string): Promise<LeadHistory[]> {
    return this.prisma.leadHistory.findMany({ where: { leadId }, orderBy: { changedAt: 'asc' } });
  }
}
