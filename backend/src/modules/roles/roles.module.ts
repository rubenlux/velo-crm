import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { RoleRepository } from './infrastructure/role.repository';
import { RoleAssignmentRepository } from './infrastructure/role-assignment.repository';
import { MembershipPermissionRepository } from './infrastructure/membership-permission.repository';
import { DefaultRolesSeeder } from './infrastructure/default-roles.seeder';
import { EffectivePermissionsService } from './application/effective-permissions.service';
import { AssignRoleUseCase } from './application/assign-role.use-case';
import { RevokeRoleUseCase } from './application/revoke-role.use-case';
import { GrantDirectPermissionUseCase } from './application/grant-direct-permission.use-case';
import { RevokeDirectPermissionUseCase } from './application/revoke-direct-permission.use-case';
import { GetEffectivePermissionsUseCase } from './application/get-effective-permissions.use-case';
import { CreateCustomRoleUseCase } from './application/create-custom-role.use-case';
import { UpdateCustomRoleUseCase } from './application/update-custom-role.use-case';
import { DeleteCustomRoleUseCase } from './application/delete-custom-role.use-case';
import { ListRolesUseCase } from './application/list-roles.use-case';
import { ListAvailablePermissionsUseCase } from './application/list-available-permissions.use-case';
import { PermissionsGuard } from './api/permissions.guard';
import { RolesController } from './api/roles.controller';

@Module({
  imports: [IdentityModule, OrganizationsModule],
  controllers: [RolesController],
  providers: [
    RoleRepository,
    RoleAssignmentRepository,
    MembershipPermissionRepository,
    DefaultRolesSeeder,
    EffectivePermissionsService,
    AssignRoleUseCase,
    RevokeRoleUseCase,
    GrantDirectPermissionUseCase,
    RevokeDirectPermissionUseCase,
    GetEffectivePermissionsUseCase,
    CreateCustomRoleUseCase,
    UpdateCustomRoleUseCase,
    DeleteCustomRoleUseCase,
    ListRolesUseCase,
    ListAvailablePermissionsUseCase,
    PermissionsGuard,
  ],
  exports: [
    RoleRepository,
    RoleAssignmentRepository,
    MembershipPermissionRepository,
    DefaultRolesSeeder,
    EffectivePermissionsService,
    PermissionsGuard,
  ],
})
export class RolesModule {}
