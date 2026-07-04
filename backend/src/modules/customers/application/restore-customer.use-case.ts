import { Injectable } from '@nestjs/common';
import { Customer } from '@prisma/client';
import { AuditLogPublisher } from '../../../shared/audit/audit-log.publisher';
import { CustomerRepository } from '../infrastructure/customer.repository';
import { CustomerMergedError, CustomerNotFoundError } from '../domain/errors';

export interface RestoreCustomerInput {
  organizationId: string;
  actorUserId: string;
  customerId: string;
}

@Injectable()
export class RestoreCustomerUseCase {
  constructor(
    private readonly customers: CustomerRepository,
    private readonly auditLog: AuditLogPublisher,
  ) {}

  async execute(input: RestoreCustomerInput): Promise<Customer> {
    const current = await this.customers.findById(input.organizationId, input.customerId);
    if (!current) {
      throw new CustomerNotFoundError();
    }
    if (current.mergedIntoCustomerId) {
      throw new CustomerMergedError(current.mergedIntoCustomerId);
    }

    const restored = await this.customers.update(input.organizationId, input.customerId, { status: 'active' });

    await this.auditLog.publish({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: 'CustomerRestored',
      metadata: { customerId: input.customerId },
    });

    return restored;
  }
}
