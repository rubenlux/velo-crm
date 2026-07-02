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
  organizationId: string;
  actorUserId?: string | null;
  action: AuditLogAction;
  metadata?: Prisma.InputJsonValue;
}

@Injectable()
export class AuditLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateAuditLogInput, db: Db = this.prisma): Promise<AuditLog> {
    return db.auditLog.create({
      data: { ...data, metadata: data.metadata ?? {} },
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
}
