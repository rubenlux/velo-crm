import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuditLogPublisher } from '../../../shared/audit/audit-log.publisher';
import { MembershipRepository } from '../../organizations/infrastructure/membership.repository';
import { TenantScopedRequest } from '../../organizations/api/tenant-context.guard';
import { EffectivePermissionsService } from '../application/effective-permissions.service';
import { REQUIRE_PERMISSION_KEY } from './require-permission.decorator';

/**
 * Enforces @RequirePermission('recurso.acción') against a Membership's effective
 * permissions (base role ∪ RoleAssignments ∪ direct grants). Must run after
 * TenantContextGuard (spec 005), which populates request.organizationId — see
 * research.md #4, #7. Denials are published to the Audit Log as `PermissionDenied`
 * (spec.md SC-002).
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly memberships: MembershipRepository,
    private readonly effectivePermissions: EffectivePermissionsService,
    private readonly auditLog: AuditLogPublisher,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string>(REQUIRE_PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required) {
      return true;
    }

    const request = context.switchToHttp().getRequest<TenantScopedRequest>();
    const membership = await this.memberships.findByUserAndOrganization(request.user.id, request.organizationId);
    if (!membership || membership.status !== 'active') {
      throw new ForbiddenException('no_membership_in_organization');
    }

    const allowed = await this.effectivePermissions.hasPermission(membership, required);
    if (!allowed) {
      await this.auditLog.publish({
        organizationId: request.organizationId,
        actorUserId: request.user.id,
        action: 'PermissionDenied',
        metadata: { permission: required, path: request.originalUrl ?? request.url },
      });
      throw new ForbiddenException('insufficient_permission');
    }

    return true;
  }
}
