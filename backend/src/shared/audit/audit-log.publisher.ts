import { Injectable } from '@nestjs/common';
import { AuditLogRepository, CreateAuditLogInput } from '../../modules/organizations/infrastructure/audit-log.repository';

type Db = Parameters<AuditLogRepository['create']>[1];

/**
 * Persists Organization domain events for the Audit Log (FR-013, SC-004).
 * Unlike IdentityAuditPublisher (spec 004, console-only seam), this publisher writes
 * to a real, queryable AuditLog table from the start.
 */
@Injectable()
export class AuditLogPublisher {
  constructor(private readonly auditLogRepository: AuditLogRepository) {}

  async publish(event: CreateAuditLogInput, db?: Db): Promise<void> {
    await this.auditLogRepository.create(event, db);
  }
}
