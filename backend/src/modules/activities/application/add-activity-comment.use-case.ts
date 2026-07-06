import { Injectable } from '@nestjs/common';
import { ActivityComment } from '@prisma/client';
import { AuditLogPublisher } from '../../../shared/audit/audit-log.publisher';
import { ActivityRepository } from '../infrastructure/activity.repository';
import { ActivityCommentRepository } from '../infrastructure/activity-comment.repository';
import { ActivityNotFoundError } from '../domain/errors';

export interface AddActivityCommentInput {
  organizationId: string;
  actorUserId: string;
  activityId: string;
  body: string;
}

@Injectable()
export class AddActivityCommentUseCase {
  constructor(
    private readonly activities: ActivityRepository,
    private readonly comments: ActivityCommentRepository,
    private readonly auditLog: AuditLogPublisher,
  ) {}

  async execute(input: AddActivityCommentInput): Promise<ActivityComment> {
    const activity = await this.activities.findById(input.organizationId, input.activityId);
    if (!activity) {
      throw new ActivityNotFoundError();
    }

    const comment = await this.comments.create({
      activityId: input.activityId,
      authorUserId: input.actorUserId,
      body: input.body,
    });

    await this.auditLog.publish({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: 'ActivityCommentAdded',
      metadata: { activityId: input.activityId, commentId: comment.id },
    });

    return comment;
  }
}
