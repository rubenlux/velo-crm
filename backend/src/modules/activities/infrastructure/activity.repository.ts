import { Injectable } from '@nestjs/common';
import { ActivityStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';

type Db = Pick<PrismaService, 'activity'>;

export const ACTIVITY_WITH_TYPE_INCLUDE = {
  activityType: true,
} satisfies Prisma.ActivityInclude;

export type ActivityWithType = Prisma.ActivityGetPayload<{ include: typeof ACTIVITY_WITH_TYPE_INCLUDE }>;

export interface ActivitySearchFilters {
  q?: string;
  customerId?: string;
  contactId?: string;
  leadId?: string;
  opportunityId?: string;
  ownerUserId?: string;
  activityTypeId?: string;
  status?: ActivityStatus;
  priority?: string;
  tag?: string;
  skip?: number;
  take?: number;
}

@Injectable()
export class ActivityRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.ActivityUncheckedCreateInput, db: Db = this.prisma): Promise<ActivityWithType> {
    return db.activity.create({ data, include: ACTIVITY_WITH_TYPE_INCLUDE });
  }

  // Scoped por organizationId en la query misma — mismo patrón de defensa en
  // profundidad que Customer/Contact/Lead/Opportunity.
  findById(organizationId: string, activityId: string): Promise<ActivityWithType | null> {
    return this.prisma.activity.findFirst({
      where: { id: activityId, organizationId },
      include: ACTIVITY_WITH_TYPE_INCLUDE,
    });
  }

  async updateWithVersionCheck(
    organizationId: string,
    activityId: string,
    expectedVersion: number,
    data: Prisma.ActivityUncheckedUpdateInput,
  ): Promise<ActivityWithType | null> {
    const { count } = await this.prisma.activity.updateMany({
      where: { id: activityId, organizationId, version: expectedVersion },
      data: { ...data, version: { increment: 1 } },
    });
    if (count === 0) {
      return null;
    }
    return this.prisma.activity.findUniqueOrThrow({ where: { id: activityId }, include: ACTIVITY_WITH_TYPE_INCLUDE });
  }

  async update(organizationId: string, activityId: string, data: Prisma.ActivityUncheckedUpdateInput): Promise<ActivityWithType> {
    await this.prisma.activity.updateMany({ where: { id: activityId, organizationId }, data });
    return this.prisma.activity.findUniqueOrThrow({ where: { id: activityId }, include: ACTIVITY_WITH_TYPE_INCLUDE });
  }

  async search(organizationId: string, filters: ActivitySearchFilters): Promise<{ items: ActivityWithType[]; total: number }> {
    const where: Prisma.ActivityWhereInput = { organizationId };
    if (filters.customerId) where.customerId = filters.customerId;
    if (filters.contactId) where.contactId = filters.contactId;
    if (filters.leadId) where.leadId = filters.leadId;
    if (filters.opportunityId) where.opportunityId = filters.opportunityId;
    if (filters.ownerUserId) where.ownerUserId = filters.ownerUserId;
    if (filters.activityTypeId) where.activityTypeId = filters.activityTypeId;
    if (filters.status) where.status = filters.status;
    if (filters.priority) where.priority = filters.priority as Prisma.ActivityUncheckedCreateInput['priority'];
    if (filters.tag) where.tags = { has: filters.tag };
    if (filters.q) {
      where.title = { contains: filters.q, mode: 'insensitive' };
    }

    const [items, total] = await Promise.all([
      this.prisma.activity.findMany({
        where,
        include: ACTIVITY_WITH_TYPE_INCLUDE,
        orderBy: { scheduledAt: 'asc' },
        skip: filters.skip ?? 0,
        take: filters.take ?? 50,
      }),
      this.prisma.activity.count({ where }),
    ]);
    return { items, total };
  }
}
