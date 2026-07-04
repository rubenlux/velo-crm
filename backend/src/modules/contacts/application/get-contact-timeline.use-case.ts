import { Injectable } from '@nestjs/common';
import { AuditLogRepository } from '../../organizations/infrastructure/audit-log.repository';
import { ContactRepository } from '../infrastructure/contact.repository';
import { ContactHistoryRepository } from '../infrastructure/contact-history.repository';
import { ContactMergedError, ContactNotFoundError } from '../domain/errors';

export interface ContactTimelineEntry {
  type: 'audit' | 'edit';
  occurredAt: Date;
  actorUserId: string | null;
  detail: unknown;
}

// Combines ContactHistory (field-level edits) with the Audit Log entries scoped to
// this specific contactId, same calculated-view pattern as spec 008's
// GetCustomerTimelineUseCase (research.md #7) — no persisted TimelineEntry table.
@Injectable()
export class GetContactTimelineUseCase {
  constructor(
    private readonly contacts: ContactRepository,
    private readonly history: ContactHistoryRepository,
    private readonly auditLog: AuditLogRepository,
  ) {}

  async execute(organizationId: string, contactId: string): Promise<ContactTimelineEntry[]> {
    const contact = await this.contacts.findById(organizationId, contactId);
    if (!contact) {
      throw new ContactNotFoundError();
    }
    if (contact.mergedIntoContactId) {
      throw new ContactMergedError(contact.mergedIntoContactId);
    }

    const [historyRows, auditRows] = await Promise.all([
      this.history.findByContactId(contactId),
      this.auditLog.listByMetadataField(organizationId, 'contactId', contactId),
    ]);

    const entries: ContactTimelineEntry[] = [
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
