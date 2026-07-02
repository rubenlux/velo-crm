import { Injectable } from '@nestjs/common';
import { Membership } from '@prisma/client';
import { MembershipRepository } from '../infrastructure/membership.repository';

@Injectable()
export class ListMembersUseCase {
  constructor(private readonly memberships: MembershipRepository) {}

  execute(organizationId: string): Promise<Membership[]> {
    return this.memberships.listActive(organizationId);
  }
}
