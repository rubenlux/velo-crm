import { Injectable } from '@nestjs/common';
import { AuditLogRepository } from '../../organizations/infrastructure/audit-log.repository';
import { OpportunityRepository } from '../infrastructure/opportunity.repository';
import { OpportunityHistoryRepository } from '../infrastructure/opportunity-history.repository';
import { OpportunityNotFoundError } from '../domain/errors';

export interface OpportunityTimelineEntry {
  type: 'audit' | 'edit';
  occurredAt: Date;
  actorUserId: string | null;
  detail: unknown;
}

// Combina OpportunityHistory (diffs de campo) + Audit Log (filtrado por
// opportunityId) — mismo patrón calculado de specs 008/009/010 (research.md #10).
// Activities/Tasks/Documentos/Comentarios (FR-008) no contribuyen todavía.
@Injectable()
export class GetOpportunityTimelineUseCase {
  constructor(
    private readonly opportunities: OpportunityRepository,
    private readonly history: OpportunityHistoryRepository,
    private readonly auditLog: AuditLogRepository,
  ) {}

  async execute(organizationId: string, opportunityId: string): Promise<OpportunityTimelineEntry[]> {
    const opportunity = await this.opportunities.findById(organizationId, opportunityId);
    if (!opportunity) {
      throw new OpportunityNotFoundError();
    }

    const [historyRows, auditRows] = await Promise.all([
      this.history.findByOpportunityId(opportunityId),
      this.auditLog.listByMetadataField(organizationId, 'opportunityId', opportunityId),
    ]);

    const entries: OpportunityTimelineEntry[] = [
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
