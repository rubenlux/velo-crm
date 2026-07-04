import { Injectable } from '@nestjs/common';
import { Customer } from '@prisma/client';
import { AuditLogPublisher } from '../../../shared/audit/audit-log.publisher';
import { CustomerRepository } from '../infrastructure/customer.repository';
import { CustomerHistoryRepository } from '../infrastructure/customer-history.repository';
import { CustomerMergedError, CustomerMergeSameCustomerError, CustomerNotFoundError } from '../domain/errors';

export interface MergeCustomersInput {
  organizationId: string;
  actorUserId: string;
  survivorCustomerId: string;
  discardedCustomerId: string;
}

@Injectable()
export class MergeCustomersUseCase {
  constructor(
    private readonly customers: CustomerRepository,
    private readonly history: CustomerHistoryRepository,
    private readonly auditLog: AuditLogPublisher,
  ) {}

  async execute(input: MergeCustomersInput): Promise<Customer> {
    if (input.survivorCustomerId === input.discardedCustomerId) {
      throw new CustomerMergeSameCustomerError();
    }

    const [survivor, discarded] = await Promise.all([
      this.customers.findById(input.organizationId, input.survivorCustomerId),
      this.customers.findById(input.organizationId, input.discardedCustomerId),
    ]);
    if (!survivor) {
      throw new CustomerNotFoundError();
    }
    if (!discarded) {
      throw new CustomerNotFoundError();
    }
    if (survivor.mergedIntoCustomerId) {
      throw new CustomerMergedError(survivor.mergedIntoCustomerId);
    }
    if (discarded.mergedIntoCustomerId) {
      throw new CustomerMergedError(discarded.mergedIntoCustomerId);
    }

    await this.history.reparent(discarded.id, survivor.id);
    await this.history.append({
      customerId: survivor.id,
      changedByUserId: input.actorUserId,
      changes: { merged: { before: null, after: discarded.id } },
    });
    await this.customers.update(input.organizationId, discarded.id, { mergedIntoCustomerId: survivor.id });

    await this.auditLog.publish({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: 'CustomerMerged',
      metadata: { survivorCustomerId: survivor.id, discardedCustomerId: discarded.id },
    });

    return this.customers.findById(input.organizationId, survivor.id) as Promise<Customer>;
  }
}
