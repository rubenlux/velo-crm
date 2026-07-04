import { Injectable } from '@nestjs/common';
import { AuditLogPublisher } from '../../../shared/audit/audit-log.publisher';
import { CustomerRepository, CustomerSearchFilters } from '../infrastructure/customer.repository';
import { customersToCsv } from '../infrastructure/customer-csv';

@Injectable()
export class ExportCustomersUseCase {
  constructor(
    private readonly customers: CustomerRepository,
    private readonly auditLog: AuditLogPublisher,
  ) {}

  async execute(organizationId: string, actorUserId: string, filters: CustomerSearchFilters): Promise<string> {
    const customers = await this.customers.exportAll(organizationId, filters);

    await this.auditLog.publish({
      organizationId,
      actorUserId,
      action: 'CustomersExported',
      metadata: { count: customers.length },
    });

    return customersToCsv(customers);
  }
}
