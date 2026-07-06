import { Injectable } from '@nestjs/common';
import { ActivityHistory, Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';

@Injectable()
export class ActivityHistoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  append(data: { activityId: string; changedByUserId: string; changes: Prisma.InputJsonValue }): Promise<ActivityHistory> {
    return this.prisma.activityHistory.create({ data });
  }

  findByActivityId(activityId: string): Promise<ActivityHistory[]> {
    return this.prisma.activityHistory.findMany({ where: { activityId }, orderBy: { changedAt: 'asc' } });
  }
}
