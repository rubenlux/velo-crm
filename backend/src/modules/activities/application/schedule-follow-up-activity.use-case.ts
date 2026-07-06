import { Injectable } from '@nestjs/common';
import { CustomerPriority } from '@prisma/client';
import { AuditLogPublisher } from '../../../shared/audit/audit-log.publisher';
import { ActivityTypeRepository } from '../infrastructure/activity-type.repository';
import { ActivityRepository, ActivityWithType } from '../infrastructure/activity.repository';
import { ActivityNotFoundError, ActivityTypeNotFoundError } from '../domain/errors';

export interface ScheduleFollowUpActivityInput {
  organizationId: string;
  actorUserId: string;
  originActivityId: string;
  activityTypeId: string;
  title: string;
  description?: string;
  scheduledAt: string;
  durationMinutes?: number;
  priority?: CustomerPriority;
  ownerUserId?: string;
  participantUserIds?: string[];
  tags?: string[];
}

// Hereda customerId/contactId/leadId/opportunityId de la Activity origen — "vinculada
// a la misma entidad" (US2 Acceptance Scenario 2) no es reemplazable por el caller
// (research.md #11).
@Injectable()
export class ScheduleFollowUpActivityUseCase {
  constructor(
    private readonly activities: ActivityRepository,
    private readonly activityTypes: ActivityTypeRepository,
    private readonly auditLog: AuditLogPublisher,
  ) {}

  async execute(input: ScheduleFollowUpActivityInput): Promise<ActivityWithType> {
    const origin = await this.activities.findById(input.organizationId, input.originActivityId);
    if (!origin) {
      throw new ActivityNotFoundError();
    }
    const activityType = await this.activityTypes.findById(input.organizationId, input.activityTypeId);
    if (!activityType) {
      throw new ActivityTypeNotFoundError();
    }

    const followUp = await this.activities.create({
      organizationId: input.organizationId,
      customerId: origin.customerId,
      contactId: origin.contactId,
      leadId: origin.leadId,
      opportunityId: origin.opportunityId,
      originActivityId: origin.id,
      activityTypeId: input.activityTypeId,
      title: input.title,
      description: input.description,
      scheduledAt: new Date(input.scheduledAt),
      durationMinutes: input.durationMinutes,
      priority: input.priority,
      authorUserId: input.actorUserId,
      ownerUserId: input.ownerUserId,
      participantUserIds: input.participantUserIds ?? [],
      tags: input.tags ?? [],
    });

    await this.auditLog.publish({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: 'ActivityFollowUpScheduled',
      metadata: { activityId: followUp.id, originActivityId: origin.id },
    });

    return followUp;
  }
}
