import { Injectable } from '@nestjs/common';
import { Customer } from '@prisma/client';
import { AuditLogPublisher } from '../../../shared/audit/audit-log.publisher';
import { CustomerRepository } from '../infrastructure/customer.repository';
import { CustomerMergedError, CustomerNotFoundError } from '../domain/errors';

export interface ArchiveCustomerInput {
  organizationId: string;
  actorUserId: string;
  customerId: string;
}

@Injectable()
export class ArchiveCustomerUseCase {
  constructor(
    private readonly customers: CustomerRepository,
    private readonly auditLog: AuditLogPublisher,
  ) {}

  async execute(input: ArchiveCustomerInput): Promise<Customer> {
    const current = await this.customers.findById(input.organizationId, input.customerId);
    if (!current) {
      throw new CustomerNotFoundError();
    }
    if (current.mergedIntoCustomerId) {
      throw new CustomerMergedError(current.mergedIntoCustomerId);
    }

    const archived = await this.customers.update(input.organizationId, input.customerId, { status: 'archived' });

    await this.auditLog.publish({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: 'CustomerArchived',
      metadata: { customerId: input.customerId },
    });

    return archived;
  }
}
