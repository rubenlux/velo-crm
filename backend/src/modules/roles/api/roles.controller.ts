import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { TenantContextGuard, TenantScopedRequest } from '../../organizations/api/tenant-context.guard';
import { PermissionsGuard } from './permissions.guard';
import { RequirePermission } from './require-permission.decorator';
import { AssignRoleUseCase } from '../application/assign-role.use-case';
import { RevokeRoleUseCase } from '../application/revoke-role.use-case';
import { GrantDirectPermissionUseCase } from '../application/grant-direct-permission.use-case';
import { RevokeDirectPermissionUseCase } from '../application/revoke-direct-permission.use-case';
import { GetEffectivePermissionsUseCase } from '../application/get-effective-permissions.use-case';
import { CreateCustomRoleUseCase } from '../application/create-custom-role.use-case';
import { UpdateCustomRoleUseCase } from '../application/update-custom-role.use-case';
import { DeleteCustomRoleUseCase } from '../application/delete-custom-role.use-case';
import { ListRolesUseCase } from '../application/list-roles.use-case';
import { ListAvailablePermissionsUseCase } from '../application/list-available-permissions.use-case';
import { AssignRoleDto } from './dto/assign-role.dto';
import { GrantPermissionDto } from './dto/grant-permission.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

/**
 * Role/Permission assignment and lookup on a Membership (spec 007-roles-permissions,
 * US1/US2). Lives in the roles module but under /organizations, same nested-resource
 * pattern as spec 006's OrganizationMembersController. TenantContextGuard is applied
 * class-wide (every method is tenant-scoped); role.manage is required per-method
 * (not class-wide) because effective-permissions has a conditional rule — a User can
 * always read their own, but reading someone else's requires role.manage
 * (spec.md US2, Acceptance Scenario 3) — a blanket class-level gate can't express
 * that. Assigning/granting is not restricted to a hardcoded Propietario/Administrador
 * check — any actor holding role.manage may attempt it, subject to the
 * anti-escalation check inside each use case (research.md #4).
 */
@UseGuards(TenantContextGuard)
@Controller('organizations')
export class RolesController {
  constructor(
    private readonly assignRoleUseCase: AssignRoleUseCase,
    private readonly revokeRoleUseCase: RevokeRoleUseCase,
    private readonly grantDirectPermissionUseCase: GrantDirectPermissionUseCase,
    private readonly revokeDirectPermissionUseCase: RevokeDirectPermissionUseCase,
    private readonly getEffectivePermissionsUseCase: GetEffectivePermissionsUseCase,
    private readonly createCustomRoleUseCase: CreateCustomRoleUseCase,
    private readonly updateCustomRoleUseCase: UpdateCustomRoleUseCase,
    private readonly deleteCustomRoleUseCase: DeleteCustomRoleUseCase,
    private readonly listRolesUseCase: ListRolesUseCase,
    private readonly listAvailablePermissionsUseCase: ListAvailablePermissionsUseCase,
  ) {}

  @Get(':id/permissions/catalog')
  listAvailablePermissions(@Param('id') id: string) {
    return this.listAvailablePermissionsUseCase.execute(id);
  }

  @Get(':id/roles')
  listRoles(@Param('id') id: string) {
    return this.listRolesUseCase.execute(id);
  }

  @UseGuards(PermissionsGuard)
  @RequirePermission('role.manage')
  @Post(':id/roles')
  createRole(@Req() req: TenantScopedRequest, @Param('id') id: string, @Body() dto: CreateRoleDto) {
    return this.createCustomRoleUseCase.execute({
      organizationId: id,
      actorUserId: req.user.id,
      name: dto.name,
      permissions: dto.permissions,
      inheritsFromRoleId: dto.inheritsFromRoleId,
    });
  }

  @UseGuards(PermissionsGuard)
  @RequirePermission('role.manage')
  @Patch(':id/roles/:roleId')
  updateRole(
    @Req() req: TenantScopedRequest,
    @Param('id') id: string,
    @Param('roleId') roleId: string,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.updateCustomRoleUseCase.execute({
      organizationId: id,
      actorUserId: req.user.id,
      roleId,
      name: dto.name,
      permissions: dto.permissions,
      inheritsFromRoleId: dto.inheritsFromRoleId,
    });
  }

  @UseGuards(PermissionsGuard)
  @RequirePermission('role.manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id/roles/:roleId')
  deleteRole(@Req() req: TenantScopedRequest, @Param('id') id: string, @Param('roleId') roleId: string) {
    return this.deleteCustomRoleUseCase.execute({
      organizationId: id,
      actorUserId: req.user.id,
      roleId,
    });
  }

  @UseGuards(PermissionsGuard)
  @RequirePermission('role.manage')
  @Post(':id/members/:userId/roles')
  assignRole(@Req() req: TenantScopedRequest, @Param('id') id: string, @Param('userId') userId: string, @Body() dto: AssignRoleDto) {
    return this.assignRoleUseCase.execute({
      organizationId: id,
      actorUserId: req.user.id,
      targetUserId: userId,
      roleId: dto.roleId,
    });
  }

  @UseGuards(PermissionsGuard)
  @RequirePermission('role.manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id/members/:userId/roles/:roleId')
  revokeRole(
    @Req() req: TenantScopedRequest,
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Param('roleId') roleId: string,
  ) {
    return this.revokeRoleUseCase.execute({
      organizationId: id,
      actorUserId: req.user.id,
      targetUserId: userId,
      roleId,
    });
  }

  @UseGuards(PermissionsGuard)
  @RequirePermission('role.manage')
  @Post(':id/members/:userId/permissions')
  grantPermission(
    @Req() req: TenantScopedRequest,
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() dto: GrantPermissionDto,
  ) {
    return this.grantDirectPermissionUseCase.execute({
      organizationId: id,
      actorUserId: req.user.id,
      targetUserId: userId,
      permission: dto.permission,
    });
  }

  @UseGuards(PermissionsGuard)
  @RequirePermission('role.manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id/members/:userId/permissions/:permission')
  revokePermission(
    @Req() req: TenantScopedRequest,
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Param('permission') permission: string,
  ) {
    return this.revokeDirectPermissionUseCase.execute({
      organizationId: id,
      actorUserId: req.user.id,
      targetUserId: userId,
      permission,
    });
  }

  @Get(':id/members/:userId/effective-permissions')
  getEffectivePermissions(@Req() req: TenantScopedRequest, @Param('id') id: string, @Param('userId') userId: string) {
    return this.getEffectivePermissionsUseCase.execute({
      organizationId: id,
      actorUserId: req.user.id,
      targetUserId: userId,
    });
  }
}
