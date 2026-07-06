import { Injectable } from '@nestjs/common';
import { ActivityComment } from '@prisma/client';
import { ActivityRepository } from '../infrastructure/activity.repository';
import { ActivityCommentRepository } from '../infrastructure/activity-comment.repository';
import { ActivityNotFoundError } from '../domain/errors';

@Injectable()
export class ListActivityCommentsUseCase {
  constructor(
    private readonly activities: ActivityRepository,
    private readonly comments: ActivityCommentRepository,
  ) {}

  async execute(organizationId: string, activityId: string): Promise<ActivityComment[]> {
    const activity = await this.activities.findById(organizationId, activityId);
    if (!activity) {
      throw new ActivityNotFoundError();
    }
    return this.comments.findByActivityId(activityId);
  }
}
