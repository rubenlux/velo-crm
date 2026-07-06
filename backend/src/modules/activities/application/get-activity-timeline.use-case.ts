import { Injectable } from '@nestjs/common';
import { AuditLogRepository } from '../../organizations/infrastructure/audit-log.repository';
import { ActivityRepository } from '../infrastructure/activity.repository';
import { ActivityHistoryRepository } from '../infrastructure/activity-history.repository';
import { ActivityNotFoundError } from '../domain/errors';

export interface ActivityTimelineEntry {
  type: 'audit' | 'edit';
  occurredAt: Date;
  actorUserId: string | null;
  detail: unknown;
}

// Combina ActivityHistory (diffs de campo) + Audit Log (filtrado por activityId) —
// mismo patrón calculado de specs 008-011 (research.md #14). Distinto de
// SearchActivitiesUseCase (research.md #13): esta es la timeline propia de la
// Activity, no la de otra entidad que la incluye.
@Injectable()
export class GetActivityTimelineUseCase {
  constructor(
    private readonly activities: ActivityRepository,
    private readonly history: ActivityHistoryRepository,
    private readonly auditLog: AuditLogRepository,
  ) {}

  async execute(organizationId: string, activityId: string): Promise<ActivityTimelineEntry[]> {
    const activity = await this.activities.findById(organizationId, activityId);
    if (!activity) {
      throw new ActivityNotFoundError();
    }

    const [historyRows, auditRows] = await Promise.all([
      this.history.findByActivityId(activityId),
      this.auditLog.listByMetadataField(organizationId, 'activityId', activityId),
    ]);

    const entries: ActivityTimelineEntry[] = [
      ...auditRows.map((row) => ({
        type: 'audit' as const,
        occurredAt: row.occurredAt,
        actorUserId: row.actorUserId,
        detail: { action: row.action, metadata: row.metadata },
      })),
      ...historyRows.map((row) => ({
        type: 'edit' as const,
        occurredAt: row.changedAt,
        actorUserId: row.changedByUserId,
        detail: { changes: row.changes },
      })),
    ];

    return entries.sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
  }
}
