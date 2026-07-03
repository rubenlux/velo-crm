import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { AuditLogPublisher } from '../../../shared/audit/audit-log.publisher';
import { UserRepository } from '../../identity/infrastructure/user.repository';
import { LastAdminGuard } from './last-admin.guard';
import { InvalidStatusTransitionError, UserNotFoundError } from '../domain/errors';

export interface DeleteUserInput {
  organizationId: string;
  actorUserId: string;
  targetUserId: string;
}

@Injectable()
export class DeleteUserUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly lastAdminGuard: LastAdminGuard,
    private readonly auditLog: AuditLogPublisher,
  ) {}

  async execute(input: DeleteUserInput): Promise<User> {
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
