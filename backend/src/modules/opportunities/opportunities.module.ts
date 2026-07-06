import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { RolesModule } from '../roles/roles.module';
import { CustomersModule } from '../customers/customers.module';
import { ContactsModule } from '../contacts/contacts.module';
import { PipelineRepository } from './infrastructure/pipeline.repository';
import { PipelineStageRepository } from './infrastructure/pipeline-stage.repository';
import { OpportunityRepository } from './infrastructure/opportunity.repository';
import { OpportunityHistoryRepository } from './infrastructure/opportunity-history.repository';
import { ListPipelinesUseCase } from './application/list-pipelines.use-case';
import { CreatePipelineUseCase } from './application/create-pipeline.use-case';
import { CreatePipelineStageUseCase } from './application/create-pipeline-stage.use-case';
import { UpdatePipelineStageUseCase } from './application/update-pipeline-stage.use-case';
import { DeletePipelineStageUseCase } from './application/delete-pipeline-stage.use-case';
import { CreateOpportunityUseCase } from './application/create-opportunity.use-case';
import { UpdateOpportunityUseCase } from './application/update-opportunity.use-case';
import { GetOpportunityUseCase } from './application/get-opportunity.use-case';
import { SearchOpportunitiesUseCase } from './application/search-opportunities.use-case';
import { MoveOpportunityStageUseCase } from './application/move-opportunity-stage.use-case';
import { WinOpportunityUseCase } from './application/win-opportunity.use-case';
import { LoseOpportunityUseCase } from './application/lose-opportunity.use-case';
import { ReopenOpportunityUseCase } from './application/reopen-opportunity.use-case';
import { ArchiveOpportunityUseCase } from './application/archive-opportunity.use-case';
import { RestoreOpportunityUseCase } from './application/restore-opportunity.use-case';
import { GetOpportunityKpisUseCase } from './application/get-opportunity-kpis.use-case';
import { GetOpportunityForecastUseCase } from './application/get-opportunity-forecast.use-case';
import { GetOpportunityTimelineUseCase } from './application/get-opportunity-timeline.use-case';
import { OpportunitiesController } from './api/opportunities.controller';
import { PipelinesController } from './api/pipelines.controller';

@Module({
  imports: [IdentityModule, OrganizationsModule, RolesModule, CustomersModule, ContactsModule],
  controllers: [OpportunitiesController, PipelinesController],
  providers: [
    PipelineRepository,
    PipelineStageRepository,
    OpportunityRepository,
    OpportunityHistoryRepository,
    ListPipelinesUseCase,
    CreatePipelineUseCase,
    CreatePipelineStageUseCase,
    UpdatePipelineStageUseCase,
    DeletePipelineStageUseCase,
    CreateOpportunityUseCase,
    UpdateOpportunityUseCase,
    GetOpportunityUseCase,
    SearchOpportunitiesUseCase,
    MoveOpportunityStageUseCase,
    WinOpportunityUseCase,
    LoseOpportunityUseCase,
    ReopenOpportunityUseCase,
    ArchiveOpportunityUseCase,
    RestoreOpportunityUseCase,
    GetOpportunityKpisUseCase,
    GetOpportunityForecastUseCase,
    GetOpportunityTimelineUseCase,
  ],
  // PipelineRepository/OpportunityRepository son consumidos por LeadsModule
  // (ConvertLeadUseCase) — spec 011 research.md #4, cumple la migración que
  // spec 010 research.md #10 había dejado pendiente.
  exports: [PipelineRepository, PipelineStageRepository, OpportunityRepository, OpportunityHistoryRepository],
})
export class OpportunitiesModule {}
