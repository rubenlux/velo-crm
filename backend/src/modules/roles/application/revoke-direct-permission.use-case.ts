import { Injectable } from '@nestjs/common';
import { AuditLogPublisher } from '../../../shared/audit/audit-log.publisher';
import { MembershipRepository } from '../../organizations/infrastructure/membership.repository';
import { MembershipNotFoundError } from '../../organizations/domain/errors';
import { MembershipPermissionRepository } from '../infrastructure/membership-permission.repository';

export interface RevokeDirectPermissionInput {
  organizationId: string;
  actorUserId: string;
  targetUserId: string;
  permission: string;
}

@Injectable()
export class RevokeDirectPermissionUseCase {
  constructor(
    private readonly memberships: MembershipRepository,
    private readonly membershipPermissions: MembershipPermissionRepository,
    private readonly auditLog: AuditLogPublisher,
  ) {}

  async execute(input: RevokeDirectPermissionInput): Promise<void> {
    const targetMembership = await this.memberships.findByUserAndOrganization(
      input.targetUserId,
      input.organizationId,
    );
    if (!targetMembership) {
      throw new MembershipNotFoundError();
    }

    await this.membershipPermissions.revoke(targetMembership.id, input.permission);

    await this.auditLog.publish({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: 'PermissionRevoked',
      metadata: { targetUserId: input.targetUserId, permission: input.permission },
    });
  }
}
