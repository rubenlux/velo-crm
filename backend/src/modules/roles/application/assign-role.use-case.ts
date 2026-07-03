import { Injectable } from '@nestjs/common';
import { RoleAssignment } from '@prisma/client';
import { AuditLogPublisher } from '../../../shared/audit/audit-log.publisher';
import { MembershipRepository } from '../../organizations/infrastructure/membership.repository';
import { MembershipNotFoundError } from '../../organizations/domain/errors';
import { RoleRepository } from '../infrastructure/role.repository';
import { RoleAssignmentRepository } from '../infrastructure/role-assignment.repository';
import { EffectivePermissionsService } from './effective-permissions.service';
import { PrivilegeEscalationError, RoleNotFoundError } from '../domain/errors';

export interface AssignRoleInput {
  organizationId: string;
  actorUserId: string;
  targetUserId: string;
  roleId: string;
}

@Injectable()
export class AssignRoleUseCase {
  constructor(
    private readonly memberships: MembershipRepository,
    private readonly roles: RoleRepository,
    private readonly roleAssignments: RoleAssignmentRepository,
    private readonly effectivePermissions: EffectivePermissionsService,
    private readonly auditLog: AuditLogPublisher,
  ) {}

  async execute(input: AssignRoleInput): Promise<RoleAssignment> {
    const targetMembership = await this.memberships.findByUserAndOrganization(
      input.targetUserId,
      input.organizationId,
    );
    if (!targetMembership) {
      throw new MembershipNotFoundError();
    }

    const role = await this.roles.findById(input.roleId);
    if (!role || (role.organizationId !== null && role.organizationId !== input.organizationId)) {
      throw new RoleNotFoundError();
    }

    const actorMembership = await this.memberships.findByUserAndOrganization(input.actorUserId, input.organizationId);
    if (!actorMembership) {
      throw new MembershipNotFoundError();
    }
    if (actorMembership.role !== 'Propietario') {
      const [actorPermissions, rolePermissions] = await Promise.all([
        this.effectivePermissions.getEffectivePermissions(actorMembership),
        this.effectivePermissions.getRolePermissions(role),
      ]);
      const exceedsActor = rolePermissions.some((permission) => !actorPermissions.includes(permission));
      if (exceedsActor) {
        throw new PrivilegeEscalationError();
      }
    }

    const existing = await this.roleAssignments.findByMembershipAndRole(targetMembership.id, role.id);
    const assignment =
      existing ??
      (await this.roleAssignments.create({
        membershipId: targetMembership.id,
        roleId: role.id,
        assignedByUserId: input.actorUserId,
      }));

    await this.auditLog.publish({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: 'RoleAssigned',
      metadata: { targetUserId: input.targetUserId, roleId: role.id, roleName: role.name },
    });

    return assignment;
  }
}
