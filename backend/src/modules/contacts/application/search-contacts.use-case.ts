import { Injectable } from '@nestjs/common';
import { Contact } from '@prisma/client';
import { ContactRepository, ContactSearchFilters } from '../infrastructure/contact.repository';

export interface SearchContactsResult {
  items: Contact[];
  total: number;
}

@Injectable()
export class SearchContactsUseCase {
  constructor(private readonly contacts: ContactRepository) {}

  execute(organizationId: string, filters: ContactSearchFilters): Promise<SearchContactsResult> {
    return this.contacts.search(organizationId, filters);
  }
}
