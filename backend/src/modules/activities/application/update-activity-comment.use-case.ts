import { Injectable } from '@nestjs/common';
import { ActivityComment } from '@prisma/client';
import { AuditLogPublisher } from '../../../shared/audit/audit-log.publisher';
import { ActivityRepository } from '../infrastructure/activity.repository';
import { ActivityCommentRepository } from '../infrastructure/activity-comment.repository';
import { ActivityNotFoundError, CommentNotFoundError, CommentNotOwnedError } from '../domain/errors';

export interface UpdateActivityCommentInput {
  organizationId: string;
  actorUserId: string;
  activityId: string;
  commentId: string;
  body: string;
}

// Solo el autor puede editar su propio comentario — sin excepción para
// Propietario (Clarifications, research.md #9).
@Injectable()
export class UpdateActivityCommentUseCase {
  constructor(
    private readonly activities: ActivityRepository,
    private readonly comments: ActivityCommentRepository,
    private readonly auditLog: AuditLogPublisher,
  ) {}

  async execute(input: UpdateActivityCommentInput): Promise<ActivityComment> {
    const activity = await this.activities.findById(input.organizationId, input.activityId);
    if (!activity) {
      throw new ActivityNotFoundError();
    }
    const comment = await this.comments.findById(input.commentId);
    if (!comment || comment.activityId !== input.activityId) {
      throw new CommentNotFoundError();
    }
    if (comment.authorUserId !== input.actorUserId) {
      throw new CommentNotOwnedError();
    }

    const updated = await this.comments.update(input.commentId, input.body);

    await this.auditLog.publish({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: 'ActivityCommentUpdated',
      metadata: { activityId: input.activityId, commentId: input.commentId },
    });

    return updated;
  }
}
