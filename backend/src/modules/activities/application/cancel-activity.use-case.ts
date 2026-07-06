import { Injectable } from '@nestjs/common';
import { AuditLogPublisher } from '../../../shared/audit/audit-log.publisher';
import { ActivityRepository, ActivityWithType } from '../infrastructure/activity.repository';
import { ActivityNotFoundError } from '../domain/errors';

export interface CancelActivityInput {
  organizationId: string;
  actorUserId: string;
  activityId: string;
}

@Injectable()
export class CancelActivityUseCase {
  constructor(
    private readonly activities: ActivityRepository,
    private readonly auditLog: AuditLogPublisher,
  ) {}

  async execute(input: CancelActivityInput): Promise<ActivityWithType> {
    const current = await this.activities.findById(input.organizationId, input.activityId);
    if (!current) {
      throw new ActivityNotFoundError();
    }

    const updated = await this.activities.update(input.organizationId, input.activityId, {
      status: 'Cancelada',
      statusBeforeCancel: current.status,
    });

    await this.auditLog.publish({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: 'ActivityCancelled',
      metadata: { activityId: input.activityId, previousStatus: current.status },
    });

    return updated;
  }
}
