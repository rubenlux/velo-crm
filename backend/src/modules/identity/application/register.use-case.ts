import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { UserRepository } from '../infrastructure/user.repository';
import { EmailVerificationTokenRepository } from '../infrastructure/email-verification-token.repository';
import { PasswordHasher } from '../infrastructure/password-hasher';
import { IdentityAuditPublisher } from '../../../shared/audit/identity-audit.publisher';
import { EmailAlreadyRegisteredError } from '../domain/errors';

export interface RegisterInput {
  email: string;
  password: string;
}

export interface RegisterOutput {
  user: User;
  emailVerificationToken: string;
}

/**
 * FR-001: creates a User with email/password and issues an EmailVerificationToken.
 */
@Injectable()
export class RegisterUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly emailVerificationTokens: EmailVerificationTokenRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly audit: IdentityAuditPublisher,
  ) {}

  async execute(input: RegisterInput): Promise<RegisterOutput> {
    const existing = await this.users.findByEmail(input.email);
    if (existing) {
      throw new EmailAlreadyRegisteredError(input.email);
    }

    const passwordHash = await this.passwordHasher.hash(input.password);
    const user = await this.users.create({ email: input.email, passwordHash });
    const { plainToken } = await this.emailVerificationTokens.issue(user.id);

    this.audit.publish({ action: 'UserRegistered', userId: user.id });

    return { user, emailVerificationToken: plainToken };
  }
}
