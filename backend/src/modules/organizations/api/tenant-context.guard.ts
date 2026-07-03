import { CanActivate, ExecutionContext, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MembershipRole } from '@prisma/client';
import { AuthenticatedRequest } from '../../identity/api/auth.guard';
import { UserRepository } from '../../identity/infrastructure/user.repository';
import { MembershipRepository } from '../infrastructure/membership.repository';
import { OrganizationRepository } from '../infrastructure/organization.repository';
import { SKIP_TENANT_CONTEXT_KEY } from './skip-tenant-context.decorator';

export interface TenantScopedRequest extends AuthenticatedRequest {
  organizationId: string;
  membershipRole: MembershipRole;
}

/**
 * Applied class-wide on OrganizationsController (deny-by-default within this
 * controller: any new method added there is tenant-scoped unless explicitly marked
 * @SkipTenantContext()). Resolves the active Organization from the X-Organization-Id
 * header and validates the authenticated User has an active Membership in it
 * (research.md #1, #5). Must run after the global AuthGuard, which populates
 * request.user.
 */
@Injectable()
export class TenantContextGuard implements CanActivate {
  constructor(
    private readonly organizations: OrganizationRepository,
    private readonly memberships: MembershipRepository,
    private readonly users: UserRepository,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_TENANT_CONTEXT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skip) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Partial<TenantScopedRequest> & AuthenticatedRequest>();
    const header = request.headers['x-organization-id'];
    const organizationId = Array.isArray(header) ? header[0] : header;

    if (!organizationId) {
      throw new ForbiddenException('missing_organization_header');
    }

    const routeOrganizationId = request.params?.id;
    if (routeOrganizationId && routeOrganizationId !== organizationId) {
      // Prevents a client from passing a validated header for Organization A while
      // targeting Organization B in the URL (confused-deputy across tenants).
      throw new ForbiddenException('organization_id_mismatch');
    }

    const organization = await this.organizations.findById(organizationId);
    if (!organization) {
      throw new NotFoundException('organization_not_found');
    }

    const membership = await this.memberships.findByUserAndOrganization(request.user.id, organizationId);
    if (!membership || membership.status !== 'active') {
      throw new ForbiddenException('no_membership_in_organization');
    }

    if (organization.status === 'suspended') {
      throw new ForbiddenException('organization_suspended');
    }

    // spec 006-users FR-012: Suspended/Inactive/Deleted Users keep valid login
    // credentials but lose access to every Organization's data. The access token can
    // live up to 15 minutes, so this must be checked fresh on every request, not only
    // at login (research.md #5).
    const userStatus = await this.users.findStatusById(request.user.id);
    if (userStatus !== 'Active') {
      throw new ForbiddenException('user_not_active');
    }

    request.organizationId = organizationId;
    request.membershipRole = membership.role;
    return true;
  }
}
