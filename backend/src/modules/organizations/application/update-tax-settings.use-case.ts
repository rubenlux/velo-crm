import { Injectable } from '@nestjs/common';
import { MembershipRole, Organization, Prisma } from '@prisma/client';
import { AuditLogPublisher } from '../../../shared/audit/audit-log.publisher';
import { ForbiddenRoleActionError } from '../domain/errors';
import { OrganizationRepository } from '../infrastructure/organization.repository';

export interface UpdateTaxSettingsInput {
  organizationId: string;
  actorUserId: string;
  actorRole: MembershipRole;
  taxSettings: Prisma.InputJsonValue;
}

@Injectable()
export class UpdateTaxSettingsUseCase {
  constructor(
    private readonly organizations: OrganizationRepository,
    private readonly auditLog: AuditLogPublisher,
  ) {}

  async execute(input: UpdateTaxSettingsInput): Promise<Organization> {
    if (input.actorRole !== 'Propietario') {
      throw new ForbiddenRoleActionError();
    }

    const organization = await this.organizations.update(input.organizationId, {
      taxSettings: input.taxSettings,
    });

    await this.auditLog.publish({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: 'OrganizationUpdated',
      metadata: { taxSettings: input.taxSettings },
    });

    return organization;
  }
}
