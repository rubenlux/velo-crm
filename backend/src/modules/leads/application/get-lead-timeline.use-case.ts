import { Injectable } from '@nestjs/common';
import { AuditLogRepository } from '../../organizations/infrastructure/audit-log.repository';
import { LeadRepository } from '../infrastructure/lead.repository';
import { LeadHistoryRepository } from '../infrastructure/lead-history.repository';
import { LeadNoteRepository } from '../infrastructure/lead-note.repository';
import { LeadNotFoundError } from '../domain/errors';

export interface LeadTimelineEntry {
  type: 'audit' | 'edit' | 'note';
  occurredAt: Date;
  actorUserId: string | null;
  detail: unknown;
}

// Combines LeadHistory (field-level edits) + Audit Log (scoped to this leadId) +
// LeadNote, same calculated-view pattern as spec 008/009 (research.md #14) — "activity"
// entries (calls/meetings/emails) are NOT included yet, diferred to spec 012
// (research.md #9).
@Injectable()
export class GetLeadTimelineUseCase {
  constructor(
    private readonly leads: LeadRepository,
    private readonly history: LeadHistoryRepository,
    private readonly notes: LeadNoteRepository,
    private readonly auditLog: AuditLogRepository,
  ) {}

  async execute(organizationId: string, leadId: string): Promise<LeadTimelineEntry[]> {
    const lead = await this.leads.findById(organizationId, leadId);
    if (!lead) {
      throw new LeadNotFoundError();
    }

    const [historyRows, auditRows, noteRows] = await Promise.all([
      this.history.findByLeadId(leadId),
      this.auditLog.listByMetadataField(organizationId, 'leadId', leadId),
      this.notes.findByLeadId(leadId),
    ]);

    const entries: LeadTimelineEntry[] = [
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
      ...noteRows.map((row) => ({
        type: 'note' as const,
        occurredAt: row.createdAt,
        actorUserId: row.authorUserId,
        detail: { note: row.note },
      })),
    ];

    return entries.sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
  }
}
