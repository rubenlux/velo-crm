import { Injectable } from '@nestjs/common';
import { ActivityComment } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';

@Injectable()
export class ActivityCommentRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: { activityId: string; authorUserId: string; body: string }): Promise<ActivityComment> {
    return this.prisma.activityComment.create({ data });
  }

  findById(commentId: string): Promise<ActivityComment | null> {
    return this.prisma.activityComment.findUnique({ where: { id: commentId } });
  }

  findByActivityId(activityId: string): Promise<ActivityComment[]> {
    return this.prisma.activityComment.findMany({ where: { activityId }, orderBy: { createdAt: 'asc' } });
  }

  update(commentId: string, body: string): Promise<ActivityComment> {
    return this.prisma.activityComment.update({ where: { id: commentId }, data: { body } });
  }

  delete(commentId: string): Promise<ActivityComment> {
    return this.prisma.activityComment.delete({ where: { id: commentId } });
  }
}
