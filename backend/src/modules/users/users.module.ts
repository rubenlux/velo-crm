import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { GetMyProfileUseCase } from './application/get-my-profile.use-case';
import { UpdateProfileUseCase } from './application/update-profile.use-case';
import { UpdatePreferencesUseCase } from './application/update-preferences.use-case';
import { ListMyAuditLogUseCase } from './application/list-my-audit-log.use-case';
import { ListMyOrganizationsUseCase } from './application/list-my-organizations.use-case';
import { LastAdminGuard } from './application/last-admin.guard';
import { DeactivateUserUseCase } from './application/deactivate-user.use-case';
import { ReactivateUserUseCase } from './application/reactivate-user.use-case';
import { DeleteUserUseCase } from './application/delete-user.use-case';
import { ListAccessHistoryUseCase } from './application/list-access-history.use-case';
import { UsersController } from './api/users.controller';
import { OrganizationMembersController } from './api/organization-members.controller';

@Module({
  imports: [IdentityModule, OrganizationsModule],
  controllers: [UsersController, OrganizationMembersController],
  providers: [
    GetMyProfileUseCase,
    UpdateProfileUseCase,
    UpdatePreferencesUseCase,
    ListMyAuditLogUseCase,
    ListMyOrganizationsUseCase,
    LastAdminGuard,
    DeactivateUserUseCase,
    ReactivateUserUseCase,
    DeleteUserUseCase,
    ListAccessHistoryUseCase,
  ],
})
export class UsersModule {}
