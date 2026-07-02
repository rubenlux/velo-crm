import { Injectable } from '@nestjs/common';
import { Membership } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { AuditLogPublisher } from '../../../shared/audit/audit-log.publisher';
import { InvalidOrExpiredInvitationError } from '../domain/errors';
import { OrganizationInvitationRepository } from '../infrastructure/organization-invitation.repository';
import { MembershipRepository } from '../infrastructure/membership.repository';

export interface AcceptInvitationInput {
  plainToken: string;
  userId: string;
  userEmail: string;
}

/**
 * Invoked by identity's POST /auth/invitations/:token/accept (spec 004, T064,
 * previously deferred pending this module — research.md #3).
 */
@Injectable()
export class AcceptInvitationUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly invitations: OrganizationInvitationRepository,
    private readonly memberships: MembershipRepository,
    private readonly auditLog: AuditLogPublisher,
  ) {}

  async execute(input: AcceptInvitationInput): Promise<Membership> {
    return this.prisma.$transaction(async (tx) => {
      const invitation = await this.invitations.consume(input.plainToken, tx);
      if (!invitation) {
        throw new InvalidOrExpiredInvitationError();
      }

      // The token alone isn't enough proof: it must have been issued for the email
      // of the User accepting it, or a leaked token would let anyone join with the
      // invited role. Throwing here rolls back consume() too, keeping the invitation
      // usable by its intended recipient.
      if (invitation.email.toLowerCase() !== input.userEmail.toLowerCase()) {
        throw new InvalidOrExpiredInvitationError();
      }

      const membership = await this.memberships.create(
        { userId: input.userId, organizationId: invitation.organizationId, role: invitation.role },
        tx,
      );

      await this.auditLog.publish(
        {
          organizationId: invitation.organizationId,
          actorUserId: input.userId,
          action: 'InvitationAccepted',
          metadata: { email: invitation.email, role: invitation.role },
        },
        tx,
      );

      return membership;
    });
  }
}
