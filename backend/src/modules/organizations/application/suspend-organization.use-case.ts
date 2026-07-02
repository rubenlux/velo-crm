import { Injectable } from '@nestjs/common';
import { Organization } from '@prisma/client';
import { AuditLogPublisher } from '../../../shared/audit/audit-log.publisher';
import { OrganizationNotFoundError } from '../domain/errors';
import { OrganizationRepository } from '../infrastructure/organization.repository';

export interface SuspendOrganizationInput {
  organizationId: string;
  actorUserId: string;
}

@Injectable()
export class SuspendOrganizationUseCase {
  constructor(
    private readonly organizations: OrganizationRepository,
    private readonly auditLog: AuditLogPublisher,
  ) {}

  async execute(input: SuspendOrganizationInput): Promise<Organization> {
    const organization = await this.organizations.findById(input.organizationId);
    if (!organization) {
      throw new OrganizationNotFoundError();
    }

    const updated = await this.organizations.update(input.organizationId, { status: 'suspended' });

    await this.auditLog.publish({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: 'OrganizationSuspended',
    });

    return updated;
  }
}
