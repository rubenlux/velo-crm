import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { RolesModule } from '../roles/roles.module';
import { CustomerRepository } from './infrastructure/customer.repository';
import { CustomerHistoryRepository } from './infrastructure/customer-history.repository';
import { CreateCustomerUseCase } from './application/create-customer.use-case';
import { UpdateCustomerUseCase } from './application/update-customer.use-case';
import { GetCustomerUseCase } from './application/get-customer.use-case';
import { SearchCustomersUseCase } from './application/search-customers.use-case';
import { ArchiveCustomerUseCase } from './application/archive-customer.use-case';
import { RestoreCustomerUseCase } from './application/restore-customer.use-case';
import { CustomerArchivedGuardService } from './application/customer-archived-guard.service';
import { GetCustomerTimelineUseCase } from './application/get-customer-timeline.use-case';
import { MergeCustomersUseCase } from './application/merge-customers.use-case';
import { ExportCustomersUseCase } from './application/export-customers.use-case';
import { ImportCustomersUseCase } from './application/import-customers.use-case';
import { CustomersController } from './api/customers.controller';

@Module({
  imports: [IdentityModule, OrganizationsModule, RolesModule],
  controllers: [CustomersController],
  providers: [
    CustomerRepository,
    CustomerHistoryRepository,
    CreateCustomerUseCase,
    UpdateCustomerUseCase,
    GetCustomerUseCase,
    SearchCustomersUseCase,
    ArchiveCustomerUseCase,
    RestoreCustomerUseCase,
    CustomerArchivedGuardService,
    GetCustomerTimelineUseCase,
    MergeCustomersUseCase,
    ExportCustomersUseCase,
    ImportCustomersUseCase,
  ],
  // CustomerRepository/CustomerHistoryRepository are consumed by spec 009-contacts
  // (Contact.customerId FK validation) — see specs/009-contacts/research.md #1.
  // CustomerArchivedGuardService has no caller yet — forward declaration for spec 011
  // (Opportunities), same pattern as spec 007's forward-declared CRM permissions.
  exports: [CustomerRepository, CustomerHistoryRepository, CustomerArchivedGuardService],
})
export class CustomersModule {}
