import { Injectable } from '@nestjs/common';
import { AuditLogRepository } from '../../organizations/infrastructure/audit-log.repository';
import { CustomerRepository } from '../infrastructure/customer.repository';
import { CustomerHistoryRepository } from '../infrastructure/customer-history.repository';
import { CustomerMergedError, CustomerNotFoundError } from '../domain/errors';

export interface CustomerTimelineEntry {
  type: 'audit' | 'edit';
  occurredAt: Date;
  actorUserId: string | null;
  detail: unknown;
}

// Combines CustomerHistory (field-level edits) with the Audit Log entries scoped to
// this specific customerId (creation/archive/restore/merge) into one chronological
// timeline — no persisted TimelineEntry table (research.md #5). Specs 009+ that add
// their own Customer-related events (Contacts, Activities, Opportunities, ...) extend
// this use case rather than introducing a shared timeline table.
@Injectable()
export class GetCustomerTimelineUseCase {
  constructor(
    private readonly customers: CustomerRepository,
    private readonly history: CustomerHistoryRepository,
    private readonly auditLog: AuditLogRepository,
  ) {}

  async execute(organizationId: string, customerId: string): Promise<CustomerTimelineEntry[]> {
    const customer = await this.customers.findById(organizationId, customerId);
    if (!customer) {
      throw new CustomerNotFoundError();
    }
    if (customer.mergedIntoCustomerId) {
      throw new CustomerMergedError(customer.mergedIntoCustomerId);
    }

    const [historyRows, auditRows] = await Promise.all([
      this.history.findByCustomerId(customerId),
      this.auditLog.listByMetadataField(organizationId, 'customerId', customerId),
    ]);

    const entries: CustomerTimelineEntry[] = [
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
