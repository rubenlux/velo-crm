import { Injectable } from '@nestjs/common';
import { Contact } from '@prisma/client';
import { AuditLogPublisher } from '../../../shared/audit/audit-log.publisher';
import { ContactRepository } from '../infrastructure/contact.repository';
import { ContactHistoryRepository } from '../infrastructure/contact-history.repository';
import {
  ContactCustomerMismatchError,
  ContactMergedError,
  ContactMergeSameContactError,
  ContactNotFoundError,
} from '../domain/errors';

export interface MergeContactsInput {
  organizationId: string;
  actorUserId: string;
  survivorContactId: string;
  discardedContactId: string;
}

// Same pattern as spec 008's MergeCustomersUseCase (mergedIntoContactId, no new
// ContactStatus value, no physical delete — research.md #6), plus a same-Customer
// guard that spec 008's Customer merge doesn't need (research.md #6, edge case).
@Injectable()
export class MergeContactsUseCase {
  constructor(
    private readonly contacts: ContactRepository,
    private readonly history: ContactHistoryRepository,
    private readonly auditLog: AuditLogPublisher,
  ) {}

  async execute(input: MergeContactsInput): Promise<Contact> {
    if (input.survivorContactId === input.discardedContactId) {
      throw new ContactMergeSameContactError();
    }

    const [survivor, discarded] = await Promise.all([
      this.contacts.findById(input.organizationId, input.survivorContactId),
      this.contacts.findById(input.organizationId, input.discardedContactId),
    ]);
    if (!survivor) {
      throw new ContactNotFoundError();
    }
    if (!discarded) {
      throw new ContactNotFoundError();
    }
    if (survivor.mergedIntoContactId) {
      throw new ContactMergedError(survivor.mergedIntoContactId);
    }
    if (discarded.mergedIntoContactId) {
      throw new ContactMergedError(discarded.mergedIntoContactId);
    }
    if (survivor.customerId !== discarded.customerId) {
      throw new ContactCustomerMismatchError();
    }

    await this.history.reparent(discarded.id, survivor.id);
    await this.history.append({
      contactId: survivor.id,
      changedByUserId: input.actorUserId,
      changes: { merged: { before: null, after: discarded.id } },
    });
    await this.contacts.update(input.organizationId, discarded.id, { mergedIntoContactId: survivor.id });

    await this.auditLog.publish({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: 'ContactMerged',
      metadata: { survivorContactId: survivor.id, discardedContactId: discarded.id },
    });

    return this.contacts.findById(input.organizationId, survivor.id) as Promise<Contact>;
  }
}
