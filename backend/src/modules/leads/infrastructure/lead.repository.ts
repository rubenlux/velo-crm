import { Injectable } from '@nestjs/common';
import { Lead, LeadStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';

type Db = Pick<PrismaService, 'lead'>;

export interface LeadSearchFilters {
  q?: string;
  status?: string;
  source?: string;
  ownerUserId?: string;
  tag?: string;
  city?: string;
  skip?: number;
  take?: number;
}

@Injectable()
export class LeadRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.LeadUncheckedCreateInput, db: Db = this.prisma): Promise<Lead> {
    return db.lead.create({ data });
  }

  // Scoped by organizationId in the query itself — same defense-in-depth pattern as
  // CustomerRepository/ContactRepository.
  findById(organizationId: string, leadId: string): Promise<Lead | null> {
    return this.prisma.lead.findFirst({ where: { id: leadId, organizationId } });
  }

  async updateWithVersionCheck(
    organizationId: string,
    leadId: string,
    expectedVersion: number,
    data: Prisma.LeadUncheckedUpdateInput,
  ): Promise<Lead | null> {
    const { count } = await this.prisma.lead.updateMany({
      where: { id: leadId, organizationId, version: expectedVersion },
      data: { ...data, version: { increment: 1 } },
    });
    if (count === 0) {
      return null;
    }
    return this.prisma.lead.findUniqueOrThrow({ where: { id: leadId } });
  }

  async update(organizationId: string, leadId: string, data: Prisma.LeadUncheckedUpdateInput, db: Db = this.prisma): Promise<Lead> {
    await db.lead.updateMany({ where: { id: leadId, organizationId }, data });
    return db.lead.findUniqueOrThrow({ where: { id: leadId } });
  }

  // Conditional status-guarded transition for conversion (research.md #11) — the
  // conditional WHERE (status must still be one of the allowed source statuses) is
  // the defense against a concurrent conversion/status-change race. Returns the
  // number of rows actually updated (0 means another request already won the race).
  async transitionIfStatusIn(
    organizationId: string,
    leadId: string,
    allowedStatuses: LeadStatus[],
    data: Prisma.LeadUncheckedUpdateInput,
    db: Db = this.prisma,
  ): Promise<number> {
    const { count } = await db.lead.updateMany({
      where: { id: leadId, organizationId, status: { in: allowedStatuses } },
      data,
    });
    return count;
  }

  async search(organizationId: string, filters: LeadSearchFilters): Promise<{ items: Lead[]; total: number }> {
    const where: Prisma.LeadWhereInput = { organizationId };
    if (filters.status) where.status = filters.status as Lead['status'];
    if (filters.source) where.source = filters.source as Lead['source'];
    if (filters.ownerUserId) where.ownerUserId = filters.ownerUserId;
    if (filters.city) where.city = filters.city;
    if (filters.tag) where.tags = { has: filters.tag };
    if (filters.q) {
      where.OR = [
        { name: { contains: filters.q, mode: 'insensitive' } },
        { company: { contains: filters.q, mode: 'insensitive' } },
        { email: { contains: filters.q, mode: 'insensitive' } },
        { phone: { contains: filters.q, mode: 'insensitive' } },
        { tags: { has: filters.q } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: filters.skip ?? 0,
        take: filters.take ?? 50,
      }),
      this.prisma.lead.count({ where }),
    ]);
    return { items, total };
  }
}
