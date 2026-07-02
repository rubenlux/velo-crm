import { Injectable } from '@nestjs/common';
import { MembershipRole, Organization } from '@prisma/client';
import { AuditLogPublisher } from '../../../shared/audit/audit-log.publisher';
import { ForbiddenRoleActionError } from '../domain/errors';
import { OrganizationRepository } from '../infrastructure/organization.repository';

export interface UpdateOrganizationInput {
  organizationId: string;
  actorUserId: string;
  actorRole: MembershipRole;
  updates: {
    name?: string;
    timezone?: string;
    currency?: string;
    language?: string;
  };
}

@Injectable()
export class UpdateOrganizationUseCase {
  constructor(
    private readonly organizations: OrganizationRepository,
    private readonly auditLog: AuditLogPublisher,
  ) {}

  async execute(input: UpdateOrganizationInput): Promise<Organization> {
    if (input.actorRole !== 'Propietario') {
      throw new ForbiddenRoleActionError();
    }

    const organization = await this.organizations.update(input.organizationId, input.updates);

    await this.auditLog.publish({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: 'OrganizationUpdated',
      metadata: input.updates,
    });

    return organization;
  }
}
