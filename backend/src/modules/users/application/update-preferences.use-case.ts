import { Injectable } from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import { AuditLogPublisher } from '../../../shared/audit/audit-log.publisher';
import { UserRepository } from '../../identity/infrastructure/user.repository';

export interface UpdatePreferencesCommand {
  userId: string;
  preferences: Prisma.InputJsonValue;
}

@Injectable()
export class UpdatePreferencesUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly auditLog: AuditLogPublisher,
  ) {}

  async execute(command: UpdatePreferencesCommand): Promise<User> {
    const before = await this.users.findById(command.userId);
    const updated = await this.users.updatePreferences(command.userId, command.preferences);

    await this.auditLog.publish({
      organizationId: null,
      actorUserId: command.userId,
      action: 'UserProfileUpdated',
      metadata: { before: before?.preferences, after: command.preferences },
    });

    return updated;
  }
}
