import { Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuditLogPublisher } from '../../../shared/audit/audit-log.publisher';
import { RoleRepository } from '../infrastructure/role.repository';
import { isKnownPermission } from '../infrastructure/permission-catalog';
import {
  DefaultRoleImmutableError,
  DuplicateRoleNameError,
  InvalidRoleInheritanceError,
  RoleNotFoundError,
  UnknownPermissionError,
} from '../domain/errors';

export interface UpdateCustomRoleInput {
  organizationId: string;
  actorUserId: string;
  roleId: string;
  name?: string;
  permissions?: string[];
  inheritsFromRoleId?: string | null;
}

@Injectable()
export class UpdateCustomRoleUseCase {
  constructor(
    private readonly roles: RoleRepository,
    private readonly auditLog: AuditLogPublisher,
  ) {}

  async execute(input: UpdateCustomRoleInput): Promise<Role> {
    const role = await this.roles.findById(input.roleId);
    if (!role || (role.organizationId !== null && role.organizationId !== input.organizationId)) {
      throw new RoleNotFoundError();
    }
    if (role.isDefault) {
      throw new DefaultRoleImmutableError();
    }

    if (input.permissions && input.permissions.some((permission) => !isKnownPermission(permission))) {
      throw new UnknownPermissionError();
    }

    if (input.inheritsFromRoleId) {
      const parent = await this.roles.findById(input.inheritsFromRoleId);
      if (!parent || !parent.isDefault) {
        throw new InvalidRoleInheritanceError();
      }
    }

    if (input.name && input.name !== role.name) {
      const existing = await this.roles.findByName(input.organizationId, input.name);
      if (existing) {
        throw new DuplicateRoleNameError();
      }
    }

    const updated = await this.roles.update(input.roleId, {
      name: input.name,
      permissions: input.permissions,
      inheritsFromRoleId: input.inheritsFromRoleId,
    });

    await this.auditLog.publish({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: 'RoleUpdated',
      metadata: { roleId: role.id, name: updated.name, permissions: updated.permissions },
    });

    return updated;
  }
}
