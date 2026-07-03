import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { AuditLogPublisher } from '../../../shared/audit/audit-log.publisher';
import { UserRepository } from '../../identity/infrastructure/user.repository';
import { LastAdminGuard } from './last-admin.guard';
import { InvalidStatusTransitionError, UserNotFoundError } from '../domain/errors';

export interface DeactivateUserInput {
  organizationId: string;
  actorUserId: string;
  targetUserId: string;
}

@Injectable()
export class DeactivateUserUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly lastAdminGuard: LastAdminGuard,
    private readonly auditLog: AuditLogPublisher,
  ) {}

  async execute(input: DeactivateUserInput): Promise<User> {
    const target = await this.users.findById(input.targetUserId);
    if (!target) {
      throw new UserNotFoundError();
    }
    if (target.status !== 'Active') {
      throw new InvalidStatusTransitionError('Only an Active User can be deactivated');
    }

    await this.lastAdminGuard.assertCanChangeStatus(input.organizationId, input.targetUserId);

    const updated = await this.users.updateStatus(input.targetUserId, 'Inactive');

    await this.auditLog.publish({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: 'UserStatusChanged',
      metadata: { targetUserId: input.targetUserId, from: 'Active', to: 'Inactive' },
    });

    return updated;
  }
}
