import { Injectable } from '@nestjs/common';
import { AuditLogPublisher } from '../../../shared/audit/audit-log.publisher';
import { ActivityRepository, ActivityWithType } from '../infrastructure/activity.repository';
import { ActivityNotCancelledError, ActivityNotFoundError } from '../domain/errors';

export interface ReactivateActivityInput {
  organizationId: string;
  actorUserId: string;
  activityId: string;
}

@Injectable()
export class ReactivateActivityUseCase {
  constructor(
    private readonly activities: ActivityRepository,
    private readonly auditLog: AuditLogPublisher,
  ) {}

  async execute(input: ReactivateActivityInput): Promise<ActivityWithType> {
    const current = await this.activities.findById(input.organizationId, input.activityId);
    if (!current) {
      throw new ActivityNotFoundError();
    }
    if (current.status !== 'Cancelada') {
      throw new ActivityNotCancelledError();
    }

    const updated = await this.activities.update(input.organizationId, input.activityId, {
      status: current.statusBeforeCancel ?? 'Pendiente',
      statusBeforeCancel: null,
    });

    await this.auditLog.publish({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: 'ActivityReactivated',
      metadata: { activityId: input.activityId, newStatus: updated.status },
    });

    return updated;
  }
}
