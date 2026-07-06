import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { RolesModule } from '../roles/roles.module';
import { CustomersModule } from '../customers/customers.module';
import { ContactsModule } from '../contacts/contacts.module';
import { LeadsModule } from '../leads/leads.module';
import { OpportunitiesModule } from '../opportunities/opportunities.module';
import { ActivityTypeRepository } from './infrastructure/activity-type.repository';
import { DefaultActivityTypesSeeder } from './infrastructure/default-activity-types.seeder';
import { ActivityRepository } from './infrastructure/activity.repository';
import { ActivityHistoryRepository } from './infrastructure/activity-history.repository';
import { ActivityCommentRepository } from './infrastructure/activity-comment.repository';
import { ActivityAttachmentRepository } from './infrastructure/activity-attachment.repository';
import { ListActivityTypesUseCase } from './application/list-activity-types.use-case';
import { CreateActivityTypeUseCase } from './application/create-activity-type.use-case';
import { CreateActivityUseCase } from './application/create-activity.use-case';
import { UpdateActivityUseCase } from './application/update-activity.use-case';
import { GetActivityUseCase } from './application/get-activity.use-case';
import { CancelActivityUseCase } from './application/cancel-activity.use-case';
import { ReactivateActivityUseCase } from './application/reactivate-activity.use-case';
import { ScheduleFollowUpActivityUseCase } from './application/schedule-follow-up-activity.use-case';
import { AddActivityAttachmentUseCase } from './application/add-activity-attachment.use-case';
import { ListActivityAttachmentsUseCase } from './application/list-activity-attachments.use-case';
import { AddActivityCommentUseCase } from './application/add-activity-comment.use-case';
import { ListActivityCommentsUseCase } from './application/list-activity-comments.use-case';
import { UpdateActivityCommentUseCase } from './application/update-activity-comment.use-case';
import { DeleteActivityCommentUseCase } from './application/delete-activity-comment.use-case';
import { SearchActivitiesUseCase } from './application/search-activities.use-case';
import { GetActivityTimelineUseCase } from './application/get-activity-timeline.use-case';
import { ActivityTypesController } from './api/activity-types.controller';
import { ActivitiesController } from './api/activities.controller';

@Module({
  // Primera spec de esta Fase que importa los cuatro módulos de dominio de CRM a
  // la vez (research.md #13) — ninguno de ellos importa ActivitiesModule de
  // vuelta, para no crear un ciclo; la línea de tiempo combinada de cada entidad
  // se resuelve en el frontend, no acá.
  imports: [IdentityModule, OrganizationsModule, RolesModule, CustomersModule, ContactsModule, LeadsModule, OpportunitiesModule],
  controllers: [ActivityTypesController, ActivitiesController],
  providers: [
    ActivityTypeRepository,
    DefaultActivityTypesSeeder,
    ActivityRepository,
    ActivityHistoryRepository,
    ActivityCommentRepository,
    ActivityAttachmentRepository,
    ListActivityTypesUseCase,
    CreateActivityTypeUseCase,
    CreateActivityUseCase,
    UpdateActivityUseCase,
    GetActivityUseCase,
    CancelActivityUseCase,
    ReactivateActivityUseCase,
    ScheduleFollowUpActivityUseCase,
    AddActivityAttachmentUseCase,
    ListActivityAttachmentsUseCase,
    AddActivityCommentUseCase,
    ListActivityCommentsUseCase,
    UpdateActivityCommentUseCase,
    DeleteActivityCommentUseCase,
    SearchActivitiesUseCase,
    GetActivityTimelineUseCase,
  ],
  exports: [ActivityRepository, ActivityHistoryRepository],
})
export class ActivitiesModule {}
