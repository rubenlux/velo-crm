import { Injectable } from '@nestjs/common';
import { AuditLog } from '@prisma/client';
import { AuditLogFilter, AuditLogRepository } from '../infrastructure/audit-log.repository';

@Injectable()
export class ListAuditLogUseCase {
  constructor(private readonly auditLogRepository: AuditLogRepository) {}

  execute(organizationId: string, filter: AuditLogFilter): Promise<AuditLog[]> {
    return this.auditLogRepository.list(organizationId, filter);
  }
}
