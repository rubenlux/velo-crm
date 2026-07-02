import { Injectable } from '@nestjs/common';
import { MembershipRole, Organization } from '@prisma/client';
import { AuditLogPublisher } from '../../../shared/audit/audit-log.publisher';
import { ForbiddenRoleActionError, OrganizationNotFoundError, PlanLimitExceededError } from '../domain/errors';
import { getPlanLimits } from '../infrastructure/plan-catalog';
import { OrganizationRepository } from '../infrastructure/organization.repository';

export interface UpdateModulesInput {
  organizationId: string;
  actorUserId: string;
  actorRole: MembershipRole;
  enabledModules: string[];
}

@Injectable()
export class UpdateModulesUseCase {
  constructor(
    private readonly organizations: OrganizationRepository,
    private readonly auditLog: AuditLogPublisher,
  ) {}

  async execute(input: UpdateModulesInput): Promise<Organization> {
    if (input.actorRole !== 'Propietario') {
      throw new ForbiddenRoleActionError();
    }

    const organization = await this.organizations.findById(input.organizationId);
    if (!organization) {
      throw new OrganizationNotFoundError();
    }

    const limits = getPlanLimits(organization.plan);
    const unavailable = input.enabledModules.filter((module) => !limits.availableModules.includes(module));
    if (unavailable.length > 0) {
      throw new PlanLimitExceededError(
        `Modules not available in plan ${organization.plan}: ${unavailable.join(', ')}`,
      );
    }

    const updated = await this.organizations.update(input.organizationId, {
      enabledModules: input.enabledModules,
    });

    await this.auditLog.publish({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: 'OrganizationUpdated',
      metadata: { enabledModules: input.enabledModules },
    });

    return updated;
  }
}
