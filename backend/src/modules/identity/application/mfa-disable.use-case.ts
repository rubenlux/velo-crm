import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { PasswordHasher } from '../infrastructure/password-hasher';
import { UserRepository } from '../infrastructure/user.repository';
import { IdentityAuditPublisher } from '../../../shared/audit/identity-audit.publisher';
import { InvalidCredentialsError, OAuthOnlyAccountError } from '../domain/errors';

/**
 * FR-009: disables MFA, requiring the User's current password as reauthentication
 * (Acceptance Scenario 3 of User Story 5).
 */
@Injectable()
export class DisableMfaUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly prisma: PrismaService,
    private readonly passwordHasher: PasswordHasher,
    private readonly audit: IdentityAuditPublisher,
  ) {}

  async execute(userId: string, currentPassword: string): Promise<void> {
    const user = await this.users.findById(userId);

    if (!user) {
      throw new NotFoundException('user_not_found');
    }

    if (!user.passwordHash) {
      throw new OAuthOnlyAccountError();
    }

    if (!(await this.passwordHasher.verify(user.passwordHash, currentPassword))) {
      throw new InvalidCredentialsError();
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaEnabled: false, mfaSecret: null, mfaRecoveryCodes: [] },
    });

    this.audit.publish({ action: 'MfaDisabled', userId });
  }
}
