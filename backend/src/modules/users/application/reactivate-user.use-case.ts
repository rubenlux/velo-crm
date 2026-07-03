import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { AuditLogPublisher } from '../../../shared/audit/audit-log.publisher';
import { UserRepository } from '../../identity/infrastructure/user.repository';
import { InvalidStatusTransitionError, UserNotFoundError } from '../domain/errors';

export interface ReactivateUserInput {
  organizationId: string;
  actorUserId: string;
  targetUserId: string;
}

@Injectable()
export class ReactivateUserUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly auditLog: AuditLogPublisher,
  ) {}

  async execute(input: ReactivateUserInput): Promise<User> {
    const target = await this.users.findById(input.targetUserId);
    if (!target) {
      throw new UserNotFoundError();
    }
    if (target.status === 'Deleted') {
      // FR-007: Deleted is terminal.
      throw new InvalidStatusTransitionError('A Deleted User cannot be reactivated');
    }
    if (target.status !== 'Inactive') {
      throw new InvalidStatusTransitionError('Only an Inactive User can be reactivated');
    }

    const updated = await this.users.updateStatus(input.targetUserId, 'Active');

    await this.auditLog.publish({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: 'UserStatusChanged',
      metadata: { targetUserId: input.targetUserId, from: 'Inactive', to: 'Active' },
    });

    return updated;
  }
}
