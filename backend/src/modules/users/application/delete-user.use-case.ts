import { Injectable } from '@nestjs/common';
import { MembershipRole, User } from '@prisma/client';
import { AuditLogPublisher } from '../../../shared/audit/audit-log.publisher';
import { UserRepository } from '../../identity/infrastructure/user.repository';
import { LastAdminGuard } from './last-admin.guard';
import { ForbiddenRoleActionError, InvalidStatusTransitionError, UserNotFoundError } from '../domain/errors';

export interface DeleteUserInput {
  organizationId: string;
  actorUserId: string;
  actorRole: MembershipRole;
  targetUserId: string;
}

const ADMIN_ROLES: MembershipRole[] = ['Propietario', 'Administrador'];

@Injectable()
export class DeleteUserUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly lastAdminGuard: LastAdminGuard,
    private readonly auditLog: AuditLogPublisher,
  ) {}

  async execute(input: DeleteUserInput): Promise<User> {
    if (!ADMIN_ROLES.includes(input.actorRole)) {
      throw new ForbiddenRoleActionError();
    }

    const target = await this.users.findById(input.targetUserId);
    if (!target) {
      throw new UserNotFoundError();
    }
    if (target.status === 'Deleted') {
      throw new InvalidStatusTransitionError('User is already deleted');
    }

    await this.lastAdminGuard.assertCanChangeStatus(input.organizationId, input.targetUserId);

    const previousStatus = target.status;
    const updated = await this.users.updateStatus(input.targetUserId, 'Deleted');

    await this.auditLog.publish({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: 'UserStatusChanged',
      metadata: { targetUserId: input.targetUserId, from: previousStatus, to: 'Deleted' },
    });

    return updated;
  }
}
