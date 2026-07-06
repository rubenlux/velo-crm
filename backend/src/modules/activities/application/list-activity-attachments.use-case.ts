import { Injectable } from '@nestjs/common';
import { ActivityAttachment } from '@prisma/client';
import { ActivityRepository } from '../infrastructure/activity.repository';
import { ActivityAttachmentRepository } from '../infrastructure/activity-attachment.repository';
import { ActivityNotFoundError } from '../domain/errors';

@Injectable()
export class ListActivityAttachmentsUseCase {
  constructor(
    private readonly activities: ActivityRepository,
    private readonly attachments: ActivityAttachmentRepository,
  ) {}

  async execute(organizationId: string, activityId: string): Promise<ActivityAttachment[]> {
    const activity = await this.activities.findById(organizationId, activityId);
    if (!activity) {
      throw new ActivityNotFoundError();
    }
    return this.attachments.findByActivityId(activityId);
  }
}
