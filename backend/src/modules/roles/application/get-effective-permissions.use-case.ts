import { Injectable } from '@nestjs/common';
import { MembershipRepository } from '../../organizations/infrastructure/membership.repository';
import { MembershipNotFoundError } from '../../organizations/domain/errors';
import { EffectivePermissionsService } from './effective-permissions.service';
import { InsufficientPermissionError } from '../domain/errors';

export interface GetEffectivePermissionsInput {
  organizationId: string;
  actorUserId: string;
  targetUserId: string;
}

export interface EffectivePermissionsResult {
  userId: string;
  permissions: string[];
}

/**
 * A User can always read their own effective permissions; reading someone else's
 * requires role.manage (spec.md US2, Acceptance Scenario 3). This conditional rule is
 * why the endpoint itself carries no blanket @RequirePermission — see
 * RolesController's class doc comment.
 */
@Injectable()
export class GetEffectivePermissionsUseCase {
  constructor(
    private readonly memberships: MembershipRepository,
    private readonly effectivePermissions: EffectivePermissionsService,
  ) {}

  async execute(input: GetEffectivePermissionsInput): Promise<EffectivePermissionsResult> {
    const targetMembership = await this.memberships.findByUserAndOrganization(
      input.targetUserId,
      input.organizationId,
    );
    if (!targetMembership) {
      throw new MembershipNotFoundError();
    }

    if (input.actorUserId !== input.targetUserId) {
      const actorMembership = await this.memberships.findByUserAndOrganization(
        input.actorUserId,
        input.organizationId,
      );
      if (!actorMembership) {
        throw new MembershipNotFoundError();
      }
      const allowed = await this.effectivePermissions.hasPermission(actorMembership, 'role.manage');
      if (!allowed) {
        throw new InsufficientPermissionError('role.manage');
      }
    }

    const permissions = await this.effectivePermissions.getEffectivePermissions(targetMembership);
    return { userId: input.targetUserId, permissions };
  }
}
