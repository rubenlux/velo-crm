import { Injectable } from '@nestjs/common';
import { PasswordResetTokenRepository } from '../infrastructure/password-reset-token.repository';
import { PasswordHasher } from '../infrastructure/password-hasher';
import { RefreshTokenService } from '../infrastructure/refresh-token.service';
import { PrismaService } from '../infrastructure/prisma.service';
import { IdentityAuditPublisher } from '../../../shared/audit/identity-audit.publisher';
import { InvalidOrExpiredTokenError } from '../domain/errors';

/**
 * FR-003: consumes a reset token, sets the new password, and revokes every active
 * Session (Acceptance Scenario 2 of User Story 2).
 */
@Injectable()
export class ConfirmPasswordResetUseCase {
  constructor(
    private readonly passwordResetTokens: PasswordResetTokenRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly refreshTokens: RefreshTokenService,
    private readonly prisma: PrismaService,
    private readonly audit: IdentityAuditPublisher,
  ) {}

  async execute(plainToken: string, newPassword: string): Promise<void> {
    const record = await this.passwordResetTokens.consume(plainToken);

    if (!record) {
      throw new InvalidOrExpiredTokenError();
    }

    const passwordHash = await this.passwordHasher.hash(newPassword);
    await this.prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    });

    await this.refreshTokens.revokeAllForUser(record.userId);

    this.audit.publish({ action: 'PasswordResetCompleted', userId: record.userId });
  }
}
