import { Injectable } from '@nestjs/common';
import { Contact } from '@prisma/client';
import { ContactRepository } from '../infrastructure/contact.repository';
import { ContactMergedError, ContactNotFoundError } from '../domain/errors';

@Injectable()
export class GetContactUseCase {
  constructor(private readonly contacts: ContactRepository) {}

  async execute(organizationId: string, contactId: string): Promise<Contact> {
    const contact = await this.contacts.findById(organizationId, contactId);
    if (!contact) {
      throw new ContactNotFoundError();
    }
    if (contact.mergedIntoContactId) {
      throw new ContactMergedError(contact.mergedIntoContactId);
    }
    return contact;
  }
}
