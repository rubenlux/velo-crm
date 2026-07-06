import { Injectable } from '@nestjs/common';
import { ActivityAttachment } from '@prisma/client';
import { AuditLogPublisher } from '../../../shared/audit/audit-log.publisher';
import { ActivityRepository } from '../infrastructure/activity.repository';
import { ActivityAttachmentRepository } from '../infrastructure/activity-attachment.repository';
import { ActivityNotFoundError } from '../domain/errors';

export interface AddActivityAttachmentInput {
  organizationId: string;
  actorUserId: string;
  activityId: string;
  fileName: string;
  fileUrl: string;
}

@Injectable()
export class AddActivityAttachmentUseCase {
  constructor(
    private readonly activities: ActivityRepository,
    private readonly attachments: ActivityAttachmentRepository,
    private readonly auditLog: AuditLogPublisher,
  ) {}

  async execute(input: AddActivityAttachmentInput): Promise<ActivityAttachment> {
    const activity = await this.activities.findById(input.organizationId, input.activityId);
    if (!activity) {
      throw new ActivityNotFoundError();
    }

    const attachment = await this.attachments.create({
      activityId: input.activityId,
      fileName: input.fileName,
      fileUrl: input.fileUrl,
      uploadedByUserId: input.actorUserId,
    });

    await this.auditLog.publish({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: 'ActivityAttachmentAdded',
      metadata: { activityId: input.activityId, attachmentId: attachment.id },
    });

    return attachment;
  }
}
