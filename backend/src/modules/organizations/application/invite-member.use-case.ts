import { Injectable } from '@nestjs/common';
import { MembershipRole } from '@prisma/client';
import { AuditLogPublisher } from '../../../shared/audit/audit-log.publisher';
import { ForbiddenRoleActionError, OrganizationNotFoundError, PlanLimitExceededError } from '../domain/errors';
import { getPlanLimits } from '../infrastructure/plan-catalog';
import { OrganizationRepository } from '../infrastructure/organization.repository';
import { MembershipRepository } from '../infrastructure/membership.repository';
import { IssuedInvitation, OrganizationInvitationRepository } from '../infrastructure/organization-invitation.repository';

export interface InviteMemberInput {
  organizationId: string;
  actorUserId: string;
  actorRole: MembershipRole;
  email: string;
  role: MembershipRole;
}

@Injectable()
export class InviteMemberUseCase {
  constructor(
    private readonly organizations: OrganizationRepository,
    private readonly memberships: MembershipRepository,
    private readonly invitations: OrganizationInvitationRepository,
    private readonly auditLog: AuditLogPublisher,
  ) {}

  async execute(input: InviteMemberInput): Promise<IssuedInvitation> {
    if (input.actorRole !== 'Propietario') {
      throw new ForbiddenRoleActionError();
    }

    const organization = await this.organizations.findById(input.organizationId);
    if (!organization) {
      throw new OrganizationNotFoundError();
    }

    const existing = await this.invitations.findPending(input.organizationId, input.email);

    if (!existing) {
      const limits = getPlanLimits(organization.plan);
      const [activeMembers, pendingInvites] = await Promise.all([
        this.memberships.countActive(input.organizationId),
        this.invitations.countPending(input.organizationId),
      ]);

      if (activeMembers + pendingInvites >= limits.maxUsers) {
        throw new PlanLimitExceededError(`User limit reached for plan ${organization.plan}`);
      }
    }

    const issued = existing
      ? await this.invitations.reissue(existing.id, input.role)
      : await this.invitations.create({
          organizationId: input.organizationId,
          email: input.email,
          role: input.role,
          invitedByUserId: input.actorUserId,
        });

    await this.auditLog.publish({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: 'MemberInvited',
      metadata: { email: input.email, role: input.role },
    });

    return issued;
  }
}
