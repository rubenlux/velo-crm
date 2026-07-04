import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { RolesModule } from '../roles/roles.module';
import { CustomersModule } from '../customers/customers.module';
import { ContactRepository } from './infrastructure/contact.repository';
import { ContactHistoryRepository } from './infrastructure/contact-history.repository';
import { CreateContactUseCase } from './application/create-contact.use-case';
import { UpdateContactUseCase } from './application/update-contact.use-case';
import { GetContactUseCase } from './application/get-contact.use-case';
import { ArchiveContactUseCase } from './application/archive-contact.use-case';
import { RestoreContactUseCase } from './application/restore-contact.use-case';
import { SetPrimaryContactUseCase } from './application/set-primary-contact.use-case';
import { SearchContactsUseCase } from './application/search-contacts.use-case';
import { GetContactTimelineUseCase } from './application/get-contact-timeline.use-case';
import { TransferContactUseCase } from './application/transfer-contact.use-case';
import { MergeContactsUseCase } from './application/merge-contacts.use-case';
import { ContactsController } from './api/contacts.controller';

@Module({
  imports: [IdentityModule, OrganizationsModule, RolesModule, CustomersModule],
  controllers: [ContactsController],
  providers: [
    ContactRepository,
    ContactHistoryRepository,
    CreateContactUseCase,
    UpdateContactUseCase,
    GetContactUseCase,
    ArchiveContactUseCase,
    RestoreContactUseCase,
    SetPrimaryContactUseCase,
    SearchContactsUseCase,
    GetContactTimelineUseCase,
    TransferContactUseCase,
    MergeContactsUseCase,
  ],
  exports: [ContactRepository, ContactHistoryRepository],
})
export class ContactsModule {}
