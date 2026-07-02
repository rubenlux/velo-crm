import { Injectable } from '@nestjs/common';
import { MembershipRole, Organization, OrganizationPlan } from '@prisma/client';
import { AuditLogPublisher } from '../../../shared/audit/audit-log.publisher';
import { ForbiddenRoleActionError, OrganizationNotFoundError, PlanLimitExceededError } from '../domain/errors';
import { getPlanLimits } from '../infrastructure/plan-catalog';
import { OrganizationRepository } from '../infrastructure/organization.repository';
import { MembershipRepository } from '../infrastructure/membership.repository';

export interface ChangePlanInput {
  organizationId: string;
  actorUserId: string;
  actorRole: MembershipRole;
  plan: OrganizationPlan;
}

@Injectable()
export class ChangePlanUseCase {
  constructor(
    private readonly organizations: OrganizationRepository,
    private readonly memberships: MembershipRepository,
    private readonly auditLog: AuditLogPublisher,
  ) {}

  async execute(input: ChangePlanInput): Promise<Organization> {
    if (input.actorRole !== 'Propietario') {
      throw new ForbiddenRoleActionError();
    }

    const organization = await this.organizations.findById(input.organizationId);
    if (!organization) {
      throw new OrganizationNotFoundError();
    }

    const targetLimits = getPlanLimits(input.plan);

    const activeMembers = await this.memberships.countActive(input.organizationId);
    if (activeMembers > targetLimits.maxUsers) {
      throw new PlanLimitExceededError(
        `Cannot switch to plan ${input.plan}: ${activeMembers} active users exceed the limit of ${targetLimits.maxUsers}`,
      );
    }

    const unavailableModules = organization.enabledModules.filter(
      (module) => !targetLimits.availableModules.includes(module),
    );
    if (unavailableModules.length > 0) {
      throw new PlanLimitExceededError(
        `Cannot switch to plan ${input.plan}: modules not available: ${unavailableModules.join(', ')}`,
      );
    }

    const fromPlan = organization.plan;
    const updated = await this.organizations.update(input.organizationId, { plan: input.plan });

    await this.auditLog.publish({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: 'PlanChanged',
      metadata: { fromPlan, toPlan: input.plan },
    });

    return updated;
  }
}
