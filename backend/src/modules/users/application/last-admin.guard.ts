import { Injectable } from '@nestjs/common';
import { MembershipRepository } from '../../organizations/infrastructure/membership.repository';
import { UserRepository } from '../../identity/infrastructure/user.repository';
import { LastAdminError } from '../domain/errors';

/**
 * Enforces "an Organization can never be left without an active administrator"
 * (FR-008). Composes Membership (organizations) and User.status (identity) in this
 * use-case-layer helper rather than a cross-table query in a single repository — see
 * specs/006-users/research.md #4.
 */
@Injectable()
export class LastAdminGuard {
  constructor(
    private readonly memberships: MembershipRepository,
    private readonly users: UserRepository,
  ) {}

  async assertCanChangeStatus(organizationId: string, targetUserId: string): Promise<void> {
    const adminMemberships = await this.memberships.listAdminMemberships(organizationId);
    const targetIsAdmin = adminMemberships.some((membership) => membership.userId === targetUserId);
    if (!targetIsAdmin) {
      return;
    }

    const otherAdminIds = adminMemberships
      .map((membership) => membership.userId)
      .filter((userId) => userId !== targetUserId);
    const statuses = await Promise.all(otherAdminIds.map((userId) => this.users.findStatusById(userId)));
    const remainingActiveAdmins = statuses.filter((status) => status === 'Active').length;

    if (remainingActiveAdmins === 0) {
      throw new LastAdminError();
    }
  }
}
