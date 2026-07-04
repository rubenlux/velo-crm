import { Injectable } from '@nestjs/common';
import { Contact } from '@prisma/client';
import { AuditLogPublisher } from '../../../shared/audit/audit-log.publisher';
import { ContactRepository } from '../infrastructure/contact.repository';
import { ContactMergedError, ContactNotFoundError } from '../domain/errors';

export interface SetPrimaryContactInput {
  organizationId: string;
  actorUserId: string;
  contactId: string;
}

// Marks a Contact as its Customer's primary, atomically unsetting any previous
// primary in the same transaction (research.md #4, FR-003/FR-004/SC-004).
@Injectable()
export class SetPrimaryContactUseCase {
  constructor(
    private readonly contacts: ContactRepository,
    private readonly auditLog: AuditLogPublisher,
  ) {}

  async execute(input: SetPrimaryContactInput): Promise<Contact> {
    const current = await this.contacts.findById(input.organizationId, input.contactId);
    if (!current) {
      throw new ContactNotFoundError();
    }
    if (current.mergedIntoContactId) {
      throw new ContactMergedError(current.mergedIntoContactId);
    }

    const previousPrimary = await this.contacts.findPrimaryForCustomer(input.organizationId, current.customerId);

    const updated = await this.contacts.setPrimary(input.organizationId, current.customerId, current.id);

    await this.auditLog.publish({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: 'ContactPrimaryChanged',
      metadata: {
        customerId: current.customerId,
        previousPrimaryContactId: previousPrimary?.id ?? null,
        newPrimaryContactId: current.id,
      },
    });

    return updated;
  }
}
