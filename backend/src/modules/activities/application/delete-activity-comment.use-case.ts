import { Injectable } from '@nestjs/common';
import { AuditLogPublisher } from '../../../shared/audit/audit-log.publisher';
import { ActivityRepository } from '../infrastructure/activity.repository';
import { ActivityCommentRepository } from '../infrastructure/activity-comment.repository';
import { ActivityNotFoundError, CommentNotFoundError, CommentNotOwnedError } from '../domain/errors';

export interface DeleteActivityCommentInput {
  organizationId: string;
  actorUserId: string;
  activityId: string;
  commentId: string;
}

// Solo el autor puede eliminar su propio comentario — sin excepción para
// Propietario (Clarifications, research.md #9). El borrado es físico (no es la
// entidad auditada principal), pero queda igual registrado en el Audit Log.
@Injectable()
export class DeleteActivityCommentUseCase {
  constructor(
    private readonly activities: ActivityRepository,
    private readonly comments: ActivityCommentRepository,
    private readonly auditLog: AuditLogPublisher,
  ) {}

  async execute(input: DeleteActivityCommentInput): Promise<void> {
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

    await this.comments.delete(input.commentId);

    await this.auditLog.publish({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: 'ActivityCommentDeleted',
      metadata: { activityId: input.activityId, commentId: input.commentId },
    });
  }
}
