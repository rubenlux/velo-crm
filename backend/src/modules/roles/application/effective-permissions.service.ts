import { Injectable } from '@nestjs/common';
import { Membership, Role } from '@prisma/client';
import { RoleRepository } from '../infrastructure/role.repository';
import { RoleAssignmentRepository } from '../infrastructure/role-assignment.repository';
import { MembershipPermissionRepository } from '../infrastructure/membership-permission.repository';
import { PERMISSION_CATALOG } from '../infrastructure/permission-catalog';

/**
 * Computes a Membership's effective permissions: base role (Membership.role) ∪ each
 * RoleAssignment's Role (with inheritance) ∪ direct MembershipPermission grants
 * (research.md #1, #6). Propietario is a total bypass, never consulting any
 * permission table (research.md #3).
 */
@Injectable()
export class EffectivePermissionsService {
  constructor(
    private readonly roles: RoleRepository,
    private readonly roleAssignments: RoleAssignmentRepository,
    private readonly membershipPermissions: MembershipPermissionRepository,
  ) {}

  async getEffectivePermissions(membership: Membership): Promise<string[]> {
    if (membership.role === 'Propietario') {
      return PERMISSION_CATALOG.map((permission) => permission.key);
    }

    const permissions = new Set<string>();

    const baseRole = await this.roles.findByName(null, membership.role);
    if (baseRole) {
      (await this.getRolePermissions(baseRole)).forEach((permission) => permissions.add(permission));
    }

    const assignments = await this.roleAssignments.listByMembership(membership.id);
    for (const assignment of assignments) {
      const role = await this.roles.findById(assignment.roleId);
      if (role) {
        (await this.getRolePermissions(role)).forEach((permission) => permissions.add(permission));
      }
    }

    const direct = await this.membershipPermissions.listByMembership(membership.id);
    direct.forEach((grant) => permissions.add(grant.permission));

    return [...permissions];
  }

  async hasPermission(membership: Membership, permission: string): Promise<boolean> {
    if (membership.role === 'Propietario') {
      return true;
    }
    const effective = await this.getEffectivePermissions(membership);
    return effective.includes(permission);
  }

  // Public: also used by AssignRoleUseCase/CreateCustomRoleUseCase to compare a Role's
  // own permission set against the actor's effective permissions (research.md #4).
  async getRolePermissions(role: Role): Promise<string[]> {
    if (!role.inheritsFromRoleId) {
      return role.permissions;
    }
    const parent = await this.roles.findById(role.inheritsFromRoleId);
    const parentPermissions = parent ? await this.getRolePermissions(parent) : [];
    return [...new Set([...role.permissions, ...parentPermissions])];
  }
}
