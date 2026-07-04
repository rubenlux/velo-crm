import { Injectable } from '@nestjs/common';
import { Contact } from '@prisma/client';
import { AuditLogPublisher } from '../../../shared/audit/audit-log.publisher';
import { ContactRepository } from '../infrastructure/contact.repository';
import { ContactMergedError, ContactNotFoundError } from '../domain/errors';

export interface ArchiveContactInput {
  organizationId: string;
  actorUserId: string;
  contactId: string;
}

@Injectable()
export class ArchiveContactUseCase {
  constructor(
    private readonly contacts: ContactRepository,
    private readonly auditLog: AuditLogPublisher,
  ) {}

  async execute(input: ArchiveContactInput): Promise<Contact> {
    const current = await this.contacts.findById(input.organizationId, input.contactId);
    if (!current) {
      throw new ContactNotFoundError();
    }
    if (current.mergedIntoContactId) {
      throw new ContactMergedError(current.mergedIntoContactId);
    }

    const archived = await this.contacts.update(input.organizationId, input.contactId, { status: 'archived' });

    await this.auditLog.publish({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: 'ContactArchived',
      metadata: { contactId: input.contactId },
    });

    return archived;
  }
}
