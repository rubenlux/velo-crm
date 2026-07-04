import { Injectable } from '@nestjs/common';
import { AuditLog, AuditLogAction, Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';

type Db = Pick<PrismaService, 'auditLog'>;

export interface AuditLogFilter {
  from?: Date;
  to?: Date;
  action?: AuditLogAction;
}

export interface CreateAuditLogInput {
  // Nullable for account-level events not tied to any Organization (spec 006-users,
  // e.g. a User editing their own profile). See specs/006-users/research.md #7.
  organizationId?: string | null;
  actorUserId?: string | null;
  action: AuditLogAction;
  metadata?: Prisma.InputJsonValue;
}

@Injectable()
export class AuditLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateAuditLogInput, db: Db = this.prisma): Promise<AuditLog> {
    return db.auditLog.create({
      data: { ...data, organizationId: data.organizationId ?? null, metadata: data.metadata ?? {} },
    });
  }

  list(organizationId: string, filter: AuditLogFilter = {}): Promise<AuditLog[]> {
    return this.prisma.auditLog.findMany({
      where: {
        organizationId,
        action: filter.action,
        occurredAt: { gte: filter.from, lte: filter.to },
      },
      orderBy: { occurredAt: 'desc' },
    });
  }

  listByActor(actorUserId: string): Promise<AuditLog[]> {
    return this.prisma.auditLog.findMany({
      where: { actorUserId },
      orderBy: { occurredAt: 'desc' },
    });
  }

  // Generic lookup by a top-level metadata field, e.g. `{ customerId }`/`{ contactId }`
  // — used by domain-entity timelines (spec 008 Customer, spec 009 Contact) that need
  // "every AuditLog entry about this specific record", not just "about this
  // Organization". Kept here rather than per-module to avoid two modules
  // re-implementing the same JSON-path query (research.md #5 of spec 008).
  listByMetadataField(organizationId: string, field: string, value: string): Promise<AuditLog[]> {
    return this.prisma.auditLog.findMany({
      where: { organizationId, metadata: { path: [field], equals: value } },
      orderBy: { occurredAt: 'asc' },
    });
  }
}
