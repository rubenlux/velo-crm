import { Controller, HttpCode, HttpStatus, Param, Post, Delete, Req, UseGuards } from '@nestjs/common';
import { TenantContextGuard, TenantScopedRequest } from '../../organizations/api/tenant-context.guard';
import { PermissionsGuard } from '../../roles/api/permissions.guard';
import { RequirePermission } from '../../roles/api/require-permission.decorator';
import { DeactivateUserUseCase } from '../application/deactivate-user.use-case';
import { ReactivateUserUseCase } from '../application/reactivate-user.use-case';
import { DeleteUserUseCase } from '../application/delete-user.use-case';

/**
 * Lifecycle administration of Users within an Organization (spec 006-users, US3).
 * Lives in the users module but under the /organizations prefix (nested resource,
 * same pattern as spec 005's invitations); reuses TenantContextGuard directly since
 * it isn't part of OrganizationsController's class-wide guard.
 *
 * Retrofitted (spec 007-roles-permissions, research.md #7) from a hardcoded
 * actorRole check to @RequirePermission('user.manage') — the default Administrador
 * Role includes this permission and Propietario bypasses the guard entirely, so
 * observable behavior for spec 006's tests is unchanged.
 */
@UseGuards(TenantContextGuard, PermissionsGuard)
@RequirePermission('user.manage')
@Controller('organizations')
export class OrganizationMembersController {
  constructor(
    private readonly deactivateUserUseCase: DeactivateUserUseCase,
    private readonly reactivateUserUseCase: ReactivateUserUseCase,
    private readonly deleteUserUseCase: DeleteUserUseCase,
  ) {}

  @HttpCode(HttpStatus.OK)
  @Post(':id/members/:userId/deactivate')
  deactivate(@Req() req: TenantScopedRequest, @Param('id') id: string, @Param('userId') userId: string) {
    return this.deactivateUserUseCase.execute({
      organizationId: id,
      actorUserId: req.user.id,
      targetUserId: userId,
    });
  }

  @HttpCode(HttpStatus.OK)
  @Post(':id/members/:userId/reactivate')
  reactivate(@Req() req: TenantScopedRequest, @Param('id') id: string, @Param('userId') userId: string) {
    return this.reactivateUserUseCase.execute({
      organizationId: id,
      actorUserId: req.user.id,
      targetUserId: userId,
    });
  }

  @HttpCode(HttpStatus.OK)
  @Delete(':id/members/:userId')
  delete(@Req() req: TenantScopedRequest, @Param('id') id: string, @Param('userId') userId: string) {
    return this.deleteUserUseCase.execute({
      organizationId: id,
      actorUserId: req.user.id,
      targetUserId: userId,
    });
  }
}
