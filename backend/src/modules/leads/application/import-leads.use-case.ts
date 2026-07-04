import { Injectable } from '@nestjs/common';
import { AuditLogPublisher } from '../../../shared/audit/audit-log.publisher';
import { parseLeadsCsv } from '../infrastructure/lead-csv';
import { CreateLeadUseCase } from './create-lead.use-case';

export interface ImportLeadsResult {
  created: number;
  rejected: { row: number; reason: string }[];
}

// Reuses CreateLeadUseCase row-by-row so bulk import can never diverge from the
// validation rules of manual creation (FR-002, research.md #16). A rejected row is
// recorded and skipped, never aborting the rest of the batch.
@Injectable()
export class ImportLeadsUseCase {
  constructor(
    private readonly createLead: CreateLeadUseCase,
    private readonly auditLog: AuditLogPublisher,
  ) {}

  async execute(organizationId: string, actorUserId: string, csvContent: string): Promise<ImportLeadsResult> {
    const rows = parseLeadsCsv(csvContent);
    const result: ImportLeadsResult = { created: 0, rejected: [] };

    for (const row of rows) {
      if (!row.name) {
        result.rejected.push({ row: row.row, reason: 'missing_name' });
        continue;
      }
      try {
        await this.createLead.execute({
          organizationId,
          actorUserId,
          name: row.name,
          company: row.company,
          jobTitle: row.jobTitle,
          email: row.email,
          phone: row.phone,
          whatsapp: row.whatsapp,
          country: row.country,
          state: row.state,
          city: row.city,
          address: row.address,
          source: row.source as never,
          campaign: row.campaign,
          interest: row.interest,
          ownerUserId: row.ownerUserId,
          tags: row.tags,
          priority: row.priority as never,
        });
        result.created += 1;
      } catch (error) {
        result.rejected.push({ row: row.row, reason: error instanceof Error ? error.name : 'unknown_error' });
      }
    }

    return result;
  }
}
