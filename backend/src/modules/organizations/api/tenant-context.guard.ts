import { CanActivate, ExecutionContext, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MembershipRole } from '@prisma/client';
import { AuthenticatedRequest } from '../../identity/api/auth.guard';
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

    request.organizationId = organizationId;
    request.membershipRole = membership.role;
    return true;
  }
}
