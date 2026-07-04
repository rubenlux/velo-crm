import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { RolesModule } from '../roles/roles.module';
import { CustomersModule } from '../customers/customers.module';
import { ContactsModule } from '../contacts/contacts.module';
import { LeadRepository } from './infrastructure/lead.repository';
import { LeadHistoryRepository } from './infrastructure/lead-history.repository';
import { LeadNoteRepository } from './infrastructure/lead-note.repository';
import { LeadAttachmentRepository } from './infrastructure/lead-attachment.repository';
import { OpportunityStubRepository } from './infrastructure/opportunity-stub.repository';
import { CreateLeadUseCase } from './application/create-lead.use-case';
import { UpdateLeadUseCase } from './application/update-lead.use-case';
import { GetLeadUseCase } from './application/get-lead.use-case';
import { SearchLeadsUseCase } from './application/search-leads.use-case';
import { AddLeadNoteUseCase } from './application/add-lead-note.use-case';
import { ListLeadNotesUseCase } from './application/list-lead-notes.use-case';
import { AddLeadAttachmentUseCase } from './application/add-lead-attachment.use-case';
import { ListLeadAttachmentsUseCase } from './application/list-lead-attachments.use-case';
import { ConvertLeadUseCase } from './application/convert-lead.use-case';
import { LoseLeadUseCase } from './application/lose-lead.use-case';
import { ReactivateLeadUseCase } from './application/reactivate-lead.use-case';
import { ImportLeadsUseCase } from './application/import-leads.use-case';
import { GetLeadTimelineUseCase } from './application/get-lead-timeline.use-case';
import { LeadsController } from './api/leads.controller';

@Module({
  // First module of Fase 2 with two Fase 2 dependencies at once (CustomersModule +
  // ContactsModule), consumed by ConvertLeadUseCase (research.md #1, #10).
  imports: [IdentityModule, OrganizationsModule, RolesModule, CustomersModule, ContactsModule],
  controllers: [LeadsController],
  providers: [
    LeadRepository,
    LeadHistoryRepository,
    LeadNoteRepository,
    LeadAttachmentRepository,
    OpportunityStubRepository,
    CreateLeadUseCase,
    UpdateLeadUseCase,
    GetLeadUseCase,
    SearchLeadsUseCase,
    AddLeadNoteUseCase,
    ListLeadNotesUseCase,
    AddLeadAttachmentUseCase,
    ListLeadAttachmentsUseCase,
    ConvertLeadUseCase,
    LoseLeadUseCase,
    ReactivateLeadUseCase,
    ImportLeadsUseCase,
    GetLeadTimelineUseCase,
  ],
  exports: [LeadRepository, LeadHistoryRepository],
})
export class LeadsModule {}
