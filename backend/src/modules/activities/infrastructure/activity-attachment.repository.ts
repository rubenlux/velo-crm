import { Injectable } from '@nestjs/common';
import { ActivityAttachment } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';

@Injectable()
export class ActivityAttachmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: { activityId: string; fileName: string; fileUrl: string; uploadedByUserId: string }): Promise<ActivityAttachment> {
    return this.prisma.activityAttachment.create({ data });
  }

  findByActivityId(activityId: string): Promise<ActivityAttachment[]> {
    return this.prisma.activityAttachment.findMany({ where: { activityId }, orderBy: { uploadedAt: 'asc' } });
  }
}
