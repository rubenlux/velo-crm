import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRepository } from '../infrastructure/user.repository';
import { EmailVerificationTokenRepository } from '../infrastructure/email-verification-token.repository';

/**
 * FR-004: confirms email ownership via a single-use token.
 */
@Injectable()
export class VerifyEmailUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly emailVerificationTokens: EmailVerificationTokenRepository,
  ) {}

  async execute(plainToken: string): Promise<void> {
    const record = await this.emailVerificationTokens.consume(plainToken);

    if (!record) {
      throw new BadRequestException('invalid_or_expired_token');
    }

    await this.users.markEmailVerified(record.userId);
  }
}

/**
 * FR-004: reissues a verification token, invalidating any previous pending one.
 */
@Injectable()
export class ResendVerificationUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly emailVerificationTokens: EmailVerificationTokenRepository,
  ) {}

  async execute(email: string): Promise<string> {
    const user = await this.users.findByEmail(email);

    if (!user) {
      throw new NotFoundException('user_not_found');
    }

    const { plainToken } = await this.emailVerificationTokens.issue(user.id);
    return plainToken;
  }
}
