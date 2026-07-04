import { Injectable } from '@nestjs/common';
import { Contact } from '@prisma/client';
import { AuditLogPublisher } from '../../../shared/audit/audit-log.publisher';
import { ContactRepository } from '../infrastructure/contact.repository';
import { ContactMergedError, ContactNotFoundError } from '../domain/errors';

export interface RestoreContactInput {
  organizationId: string;
  actorUserId: string;
  contactId: string;
}

@Injectable()
export class RestoreContactUseCase {
  constructor(
    private readonly contacts: ContactRepository,
    private readonly auditLog: AuditLogPublisher,
  ) {}

  async execute(input: RestoreContactInput): Promise<Contact> {
    const current = await this.contacts.findById(input.organizationId, input.contactId);
    if (!current) {
      throw new ContactNotFoundError();
    }
    if (current.mergedIntoContactId) {
      throw new ContactMergedError(current.mergedIntoContactId);
    }

    const restored = await this.contacts.update(input.organizationId, input.contactId, { status: 'active' });

    await this.auditLog.publish({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: 'ContactRestored',
      metadata: { contactId: input.contactId },
    });

    return restored;
  }
}
