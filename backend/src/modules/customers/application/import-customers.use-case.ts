import { Injectable } from '@nestjs/common';
import { AuditLogPublisher } from '../../../shared/audit/audit-log.publisher';
import { parseCustomersCsv } from '../infrastructure/customer-csv';
import { CreateCustomerUseCase } from './create-customer.use-case';

export interface ImportCustomersResult {
  created: number;
  rejected: { row: number; reason: string }[];
}

// Reuses CreateCustomerUseCase row-by-row so bulk import can never diverge from the
// validation/uniqueness rules of manual creation (FR-014, research.md #7). A rejected
// row is recorded and skipped, never aborting the rest of the batch.
@Injectable()
export class ImportCustomersUseCase {
  constructor(
    private readonly createCustomer: CreateCustomerUseCase,
    private readonly auditLog: AuditLogPublisher,
  ) {}

  async execute(organizationId: string, actorUserId: string, csvContent: string): Promise<ImportCustomersResult> {
    const rows = parseCustomersCsv(csvContent);
    const result: ImportCustomersResult = { created: 0, rejected: [] };

    for (const row of rows) {
      if (!row.name) {
        result.rejected.push({ row: row.row, reason: 'missing_name' });
        continue;
      }
      try {
        await this.createCustomer.execute({
          organizationId,
          actorUserId,
          name: row.name,
          legalName: row.legalName,
          tradeName: row.tradeName,
          type: row.type as never,
          taxId: row.taxId,
          taxCondition: row.taxCondition,
          email: row.email,
          phone: row.phone,
          website: row.website,
          country: row.country,
          state: row.state,
          city: row.city,
          address: row.address,
          ownerUserId: row.ownerUserId,
          source: row.source,
          category: row.category,
          tags: row.tags,
          priority: row.priority as never,
        });
        result.created += 1;
      } catch (error) {
        result.rejected.push({ row: row.row, reason: error instanceof Error ? error.name : 'unknown_error' });
      }
    }

    await this.auditLog.publish({
      organizationId,
      actorUserId,
      action: 'CustomersImported',
      metadata: { created: result.created, rejected: result.rejected.length },
    });

    return result;
  }
}
