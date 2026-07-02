import { Injectable } from '@nestjs/common';
import { OrganizationInvitation } from '@prisma/client';
import { OrganizationInvitationRepository } from '../infrastructure/organization-invitation.repository';

@Injectable()
export class ListInvitationsUseCase {
  constructor(private readonly invitations: OrganizationInvitationRepository) {}

  execute(organizationId: string): Promise<OrganizationInvitation[]> {
    return this.invitations.list(organizationId);
  }
}
