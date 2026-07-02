import { Injectable } from '@nestjs/common';
import { MembershipRole, Organization } from '@prisma/client';
import { AuditLogPublisher } from '../../../shared/audit/audit-log.publisher';
import { DuplicateDomainError, ForbiddenRoleActionError } from '../domain/errors';
import { OrganizationRepository } from '../infrastructure/organization.repository';

export interface UpdateBrandingInput {
  organizationId: string;
  actorUserId: string;
  actorRole: MembershipRole;
  logoUrl?: string;
  customDomain?: string;
}

@Injectable()
export class UpdateBrandingUseCase {
  constructor(
    private readonly organizations: OrganizationRepository,
    private readonly auditLog: AuditLogPublisher,
  ) {}

  async execute(input: UpdateBrandingInput): Promise<Organization> {
    if (input.actorRole !== 'Propietario') {
      throw new ForbiddenRoleActionError();
    }

    if (input.customDomain) {
      const existing = await this.organizations.findByCustomDomain(input.customDomain);
      if (existing && existing.id !== input.organizationId) {
        throw new DuplicateDomainError();
      }
    }

    const organization = await this.organizations.update(input.organizationId, {
      logoUrl: input.logoUrl,
      customDomain: input.customDomain,
    });

    await this.auditLog.publish({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: 'OrganizationUpdated',
      metadata: { logoUrl: input.logoUrl, customDomain: input.customDomain },
    });

    return organization;
  }
}
