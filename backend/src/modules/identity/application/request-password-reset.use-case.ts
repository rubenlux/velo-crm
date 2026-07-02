import { Injectable } from '@nestjs/common';
import { UserRepository } from '../infrastructure/user.repository';
import { PasswordResetTokenRepository } from '../infrastructure/password-reset-token.repository';
import { IdentityAuditPublisher } from '../../../shared/audit/identity-audit.publisher';

/**
 * FR-003: issues a single-use, expiring password reset link.
 * Deliberately does not reveal whether the email exists (returns null silently).
 */
@Injectable()
export class RequestPasswordResetUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly passwordResetTokens: PasswordResetTokenRepository,
    private readonly audit: IdentityAuditPublisher,
  ) {}

  async execute(email: string): Promise<string | null> {
    const user = await this.users.findByEmail(email);

    if (!user || !user.passwordHash) {
      // Unknown email or OAuth-only account: do not leak which case it is.
      return null;
    }

    const { plainToken } = await this.passwordResetTokens.issue(user.id);
    this.audit.publish({ action: 'PasswordResetRequested', userId: user.id });
    return plainToken;
  }
}
