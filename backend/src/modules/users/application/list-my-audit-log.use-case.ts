import { Injectable } from '@nestjs/common';
import { AuditLog } from '@prisma/client';
import { AuditLogRepository } from '../../organizations/infrastructure/audit-log.repository';

@Injectable()
export class ListMyAuditLogUseCase {
  constructor(private readonly auditLogRepository: AuditLogRepository) {}

  execute(userId: string): Promise<AuditLog[]> {
    return this.auditLogRepository.listByActor(userId);
  }
}
