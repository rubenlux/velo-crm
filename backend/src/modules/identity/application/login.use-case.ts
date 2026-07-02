import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { UserRepository } from '../infrastructure/user.repository';
import { PasswordHasher } from '../infrastructure/password-hasher';
import { AccessTokenService } from '../infrastructure/jwt.service';
import { RefreshTokenService } from '../infrastructure/refresh-token.service';
import { PrismaService } from '../infrastructure/prisma.service';
import { IdentityAuditPublisher } from '../../../shared/audit/identity-audit.publisher';
import { InvalidCredentialsError } from '../domain/errors';

export interface LoginInput {
  email: string;
  password: string;
  userAgent: string;
  rememberMe?: boolean;
}

export interface LoginOutput {
  user: User;
  accessToken: string;
  refreshToken: string;
}

/**
 * FR-001/FR-014: authenticates a User by email/password and issues a Session.
 * Email verification is enforced at the API layer (US1 Acceptance Scenario 2 allows
 * login while unverified, but flags it), not here.
 */
@Injectable()
export class LoginUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly accessTokens: AccessTokenService,
    private readonly refreshTokens: RefreshTokenService,
    private readonly prisma: PrismaService,
    private readonly audit: IdentityAuditPublisher,
  ) {}

  async execute(input: LoginInput): Promise<LoginOutput> {
    const user = await this.users.findByEmail(input.email);

    if (!user?.passwordHash || !(await this.passwordHasher.verify(user.passwordHash, input.password))) {
      this.audit.publish({ action: 'UserLoginFailed', metadata: { email: input.email } });
      throw new InvalidCredentialsError();
    }

    const device = await this.resolveDevice(user.id, input.userAgent);
    const { plainRefreshToken } = await this.refreshTokens.issue(user.id, device.id, input.rememberMe ?? false);
    const accessToken = this.accessTokens.sign({ sub: user.id, email: user.email });

    this.audit.publish({ action: 'UserLoggedIn', userId: user.id });

    return { user, accessToken, refreshToken: plainRefreshToken };
  }

  /**
   * Minimal device resolution for US1. A dedicated DeviceRepository with richer
   * device fingerprinting/listing lands with User Story 4 (session management).
   */
  private async resolveDevice(userId: string, userAgent: string) {
    const existing = await this.prisma.device.findFirst({ where: { userId, userAgent } });

    if (existing) {
      return this.prisma.device.update({
        where: { id: existing.id },
        data: { lastSeenAt: new Date() },
      });
    }

    return this.prisma.device.create({ data: { userId, userAgent } });
  }
}
