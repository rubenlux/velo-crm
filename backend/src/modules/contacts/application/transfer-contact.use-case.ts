import { Injectable } from '@nestjs/common';
import { Contact } from '@prisma/client';
import { AuditLogPublisher } from '../../../shared/audit/audit-log.publisher';
import { CustomerRepository } from '../../customers/infrastructure/customer.repository';
import { ContactRepository } from '../infrastructure/contact.repository';
import { ContactMergedError, ContactNotFoundError, CustomerNotFoundForContactError } from '../domain/errors';

export interface TransferContactInput {
  organizationId: string;
  actorUserId: string;
  contactId: string;
  toCustomerId: string;
}

// Reassigns a Contact to a different Customer, forcing isPrimary = false
// unconditionally — the "principal" designation never survives a transfer
// (research.md #5, edge case of spec.md).
@Injectable()
export class TransferContactUseCase {
  constructor(
    private readonly contacts: ContactRepository,
    private readonly customers: CustomerRepository,
    private readonly auditLog: AuditLogPublisher,
  ) {}

  async execute(input: TransferContactInput): Promise<Contact> {
    const current = await this.contacts.findById(input.organizationId, input.contactId);
    if (!current) {
      throw new ContactNotFoundError();
    }
    if (current.mergedIntoContactId) {
      throw new ContactMergedError(current.mergedIntoContactId);
    }
    const targetCustomer = await this.customers.findById(input.organizationId, input.toCustomerId);
    if (!targetCustomer) {
      throw new CustomerNotFoundForContactError();
    }

    const fromCustomerId = current.customerId;
    const updated = await this.contacts.update(input.organizationId, input.contactId, {
      customerId: input.toCustomerId,
      company: targetCustomer.name,
      isPrimary: false,
    });

    await this.auditLog.publish({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: 'ContactCustomerChanged',
      metadata: { contactId: input.contactId, fromCustomerId, toCustomerId: input.toCustomerId },
    });

    return updated;
  }
}
