import { Injectable } from '@nestjs/common';
import { AuditLogPublisher } from '../../../shared/audit/audit-log.publisher';
import { MembershipRepository } from '../../organizations/infrastructure/membership.repository';
import { MembershipNotFoundError } from '../../organizations/domain/errors';
import { RoleAssignmentRepository } from '../infrastructure/role-assignment.repository';

export interface RevokeRoleInput {
  organizationId: string;
  actorUserId: string;
  targetUserId: string;
  roleId: string;
}

@Injectable()
export class RevokeRoleUseCase {
  constructor(
    private readonly memberships: MembershipRepository,
    private readonly roleAssignments: RoleAssignmentRepository,
    private readonly auditLog: AuditLogPublisher,
  ) {}

  async execute(input: RevokeRoleInput): Promise<void> {
    const targetMembership = await this.memberships.findByUserAndOrganization(
      input.targetUserId,
      input.organizationId,
    );
    if (!targetMembership) {
      throw new MembershipNotFoundError();
    }

    await this.roleAssignments.revoke(targetMembership.id, input.roleId);

    await this.auditLog.publish({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: 'RoleRevoked',
      metadata: { targetUserId: input.targetUserId, roleId: input.roleId },
    });
  }
}
