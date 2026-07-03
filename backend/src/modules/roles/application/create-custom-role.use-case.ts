import { Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuditLogPublisher } from '../../../shared/audit/audit-log.publisher';
import { RoleRepository } from '../infrastructure/role.repository';
import { isKnownPermission } from '../infrastructure/permission-catalog';
import { DuplicateRoleNameError, InvalidRoleInheritanceError, UnknownPermissionError } from '../domain/errors';

export interface CreateCustomRoleInput {
  organizationId: string;
  actorUserId: string;
  name: string;
  permissions: string[];
  inheritsFromRoleId?: string;
}

@Injectable()
export class CreateCustomRoleUseCase {
  constructor(
    private readonly roles: RoleRepository,
    private readonly auditLog: AuditLogPublisher,
  ) {}

  async execute(input: CreateCustomRoleInput): Promise<Role> {
    if (input.permissions.some((permission) => !isKnownPermission(permission))) {
      throw new UnknownPermissionError();
    }

    if (input.inheritsFromRoleId) {
      const parent = await this.roles.findById(input.inheritsFromRoleId);
      if (!parent || !parent.isDefault) {
        throw new InvalidRoleInheritanceError();
      }
    }

    const existing = await this.roles.findByName(input.organizationId, input.name);
    if (existing) {
      throw new DuplicateRoleNameError();
    }

    const role = await this.roles.create({
      organizationId: input.organizationId,
      name: input.name,
      isDefault: false,
      inheritsFromRoleId: input.inheritsFromRoleId ?? null,
      permissions: input.permissions,
    });

    await this.auditLog.publish({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: 'RoleCreated',
      metadata: { roleId: role.id, name: role.name, permissions: role.permissions },
    });

    return role;
  }
}
