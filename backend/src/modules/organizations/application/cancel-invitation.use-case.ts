import { Injectable } from '@nestjs/common';
import { MembershipRole } from '@prisma/client';
import { AuditLogPublisher } from '../../../shared/audit/audit-log.publisher';
import { ForbiddenRoleActionError, InvalidOrExpiredInvitationError } from '../domain/errors';
import { OrganizationInvitationRepository } from '../infrastructure/organization-invitation.repository';

export interface CancelInvitationInput {
  organizationId: string;
  actorUserId: string;
  actorRole: MembershipRole;
  invitationId: string;
}

@Injectable()
export class CancelInvitationUseCase {
  constructor(
    private readonly invitations: OrganizationInvitationRepository,
    private readonly auditLog: AuditLogPublisher,
  ) {}

  async execute(input: CancelInvitationInput): Promise<void> {
    if (input.actorRole !== 'Propietario') {
      throw new ForbiddenRoleActionError();
    }

    const invitation = await this.invitations.findById(input.organizationId, input.invitationId);
    if (!invitation || invitation.status !== 'pending') {
      throw new InvalidOrExpiredInvitationError();
    }

    await this.invitations.cancel(input.organizationId, input.invitationId);

    await this.auditLog.publish({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: 'InvitationCancelled',
      metadata: { email: invitation.email },
    });
  }
}
