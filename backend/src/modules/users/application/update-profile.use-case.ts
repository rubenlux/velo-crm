import { Injectable } from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import { AuditLogPublisher } from '../../../shared/audit/audit-log.publisher';
import { UserRepository, UpdateProfileInput } from '../../identity/infrastructure/user.repository';

export interface UpdateProfileCommand {
  userId: string;
  updates: UpdateProfileInput;
}

@Injectable()
export class UpdateProfileUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly auditLog: AuditLogPublisher,
  ) {}

  async execute(command: UpdateProfileCommand): Promise<User> {
    const before = await this.users.findById(command.userId);
    const updated = await this.users.updateProfile(command.userId, command.updates);

    await this.auditLog.publish({
      organizationId: null,
      actorUserId: command.userId,
      action: 'UserProfileUpdated',
      metadata: {
        before: before ? pick(before, command.updates) : undefined,
        after: command.updates,
      } as unknown as Prisma.InputJsonValue,
    });

    return updated;
  }
}

function pick<T extends object>(source: T, shape: Partial<Record<keyof T, unknown>>): Partial<T> {
  const result: Partial<T> = {};
  for (const key of Object.keys(shape) as (keyof T)[]) {
    result[key] = source[key];
  }
  return result;
}
