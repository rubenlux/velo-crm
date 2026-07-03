import { Injectable } from '@nestjs/common';
import { AuditLogPublisher } from '../../../shared/audit/audit-log.publisher';
import { RoleRepository } from '../infrastructure/role.repository';
import { RoleAssignmentRepository } from '../infrastructure/role-assignment.repository';
import { DefaultRoleImmutableError, RoleInUseError, RoleNotFoundError } from '../domain/errors';

export interface DeleteCustomRoleInput {
  organizationId: string;
  actorUserId: string;
  roleId: string;
}

@Injectable()
export class DeleteCustomRoleUseCase {
  constructor(
    private readonly roles: RoleRepository,
    private readonly roleAssignments: RoleAssignmentRepository,
    private readonly auditLog: AuditLogPublisher,
  ) {}

  async execute(input: DeleteCustomRoleInput): Promise<void> {
    const role = await this.roles.findById(input.roleId);
    if (!role || (role.organizationId !== null && role.organizationId !== input.organizationId)) {
      throw new RoleNotFoundError();
    }
    if (role.isDefault) {
      throw new DefaultRoleImmutableError();
    }

    const assignmentCount = await this.roleAssignments.countByRole(input.roleId);
    if (assignmentCount > 0) {
      throw new RoleInUseError();
    }

    await this.roles.delete(input.roleId);

    await this.auditLog.publish({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: 'RoleDeleted',
      metadata: { roleId: role.id, name: role.name },
    });
  }
}
