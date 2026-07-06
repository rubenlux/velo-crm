import { Injectable } from '@nestjs/common';
import { ActivityStatus, CustomerPriority, Prisma } from '@prisma/client';
import { AuditLogPublisher } from '../../../shared/audit/audit-log.publisher';
import { ActivityRepository, ActivityWithType } from '../infrastructure/activity.repository';
import { ActivityHistoryRepository } from '../infrastructure/activity-history.repository';
import { ActivityNotFinishedError, ActivityNotFoundError, ActivityStaleUpdateError } from '../domain/errors';

export interface UpdateActivityInput {
  organizationId: string;
  actorUserId: string;
  activityId: string;
  version: number;
  title?: string;
  description?: string;
  scheduledAt?: string;
  durationMinutes?: number;
  priority?: CustomerPriority;
  ownerUserId?: string;
  participantUserIds?: string[];
  tags?: string[];
  status?: ActivityStatus;
  result?: string;
}

const NON_FIELD_KEYS = new Set(['organizationId', 'actorUserId', 'activityId', 'version']);

function comparable(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return JSON.stringify(value);
  return value;
}

@Injectable()
export class UpdateActivityUseCase {
  constructor(
    private readonly activities: ActivityRepository,
    private readonly history: ActivityHistoryRepository,
    private readonly auditLog: AuditLogPublisher,
  ) {}

  async execute(input: UpdateActivityInput): Promise<ActivityWithType> {
    const current = await this.activities.findById(input.organizationId, input.activityId);
    if (!current) {
      throw new ActivityNotFoundError();
    }
    // El resultado solo puede registrarse/editarse sobre una Activity ya
    // Finalizada (research.md #12) — no sobre el mismo request que la finaliza.
    if (input.result !== undefined && current.status !== 'Finalizada') {
      throw new ActivityNotFinishedError();
    }

    const changes: Record<string, { before: unknown; after: unknown }> = {};
    for (const [key, rawAfter] of Object.entries(input)) {
      if (NON_FIELD_KEYS.has(key) || rawAfter === undefined) {
        continue;
      }
      const before = (current as unknown as Record<string, unknown>)[key];
      const after = key === 'scheduledAt' ? new Date(rawAfter as string) : rawAfter;
      if (comparable(before) !== comparable(after)) {
        changes[key] = { before: before ?? null, after: rawAfter };
      }
    }

    const { organizationId, actorUserId, activityId, version, scheduledAt, participantUserIds, tags, status, ...rest } = input;

    // Entrando a Finalizada se puebla finishedAt; retrocediendo se limpia
    // (research.md #7).
    let finishedAt: Date | null | undefined;
    if (status !== undefined && status !== current.status) {
      finishedAt = status === 'Finalizada' ? new Date() : null;
    }

    const updated = await this.activities.updateWithVersionCheck(organizationId, activityId, version, {
      ...rest,
      status,
      scheduledAt: scheduledAt !== undefined ? new Date(scheduledAt) : undefined,
      participantUserIds: participantUserIds ?? undefined,
      tags: tags ?? undefined,
      finishedAt,
    });
    if (!updated) {
      throw new ActivityStaleUpdateError();
    }

    if (Object.keys(changes).length > 0) {
      await this.history.append({ activityId, changedByUserId: actorUserId, changes: changes as Prisma.InputJsonValue });
    }

    if ('ownerUserId' in changes) {
      await this.auditLog.publish({
        organizationId,
        actorUserId,
        action: 'ActivityOwnerChanged',
        metadata: {
          activityId,
          previousOwnerUserId: changes.ownerUserId.before,
          newOwnerUserId: changes.ownerUserId.after,
        } as Prisma.InputJsonValue,
      });
    }
    if ('status' in changes) {
      await this.auditLog.publish({
        organizationId,
        actorUserId,
        action: 'ActivityStatusChanged',
        metadata: {
          activityId,
          previousStatus: changes.status.before,
          newStatus: changes.status.after,
        } as Prisma.InputJsonValue,
      });
    }
    if ('result' in changes) {
      await this.auditLog.publish({
        organizationId,
        actorUserId,
        action: 'ActivityResultRecorded',
        metadata: { activityId },
      });
    }
    const otherFields = Object.keys(changes).filter((key) => key !== 'ownerUserId' && key !== 'status' && key !== 'result');
    if (otherFields.length > 0) {
      await this.auditLog.publish({
        organizationId,
        actorUserId,
        action: 'ActivityUpdated',
        metadata: { activityId, fields: otherFields },
      });
    }

    return updated;
  }
}
