import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { UserRepository } from '../infrastructure/user.repository';
import { PasswordHasher } from '../infrastructure/password-hasher';
import { AccessTokenService } from '../infrastructure/jwt.service';
import { RefreshTokenService } from '../infrastructure/refresh-token.service';
import { DeviceResolverService } from '../infrastructure/device-resolver.service';
import { IdentityAuditPublisher } from '../../../shared/audit/identity-audit.publisher';
import { InvalidCredentialsError } from '../domain/errors';

export interface LoginInput {
  email: string;
  password: string;
  userAgent: string;
  rememberMe?: boolean;
}

export interface LoggedInOutput {
  mfaRequired: false;
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface MfaRequiredOutput {
  mfaRequired: true;
  mfaChallengeToken: string;
}

export type LoginOutput = LoggedInOutput | MfaRequiredOutput;

/**
 * FR-001/FR-014: authenticates a User by email/password and issues a Session — or,
 * when MFA is enabled (User Story 5), returns a short-lived challenge instead and
 * defers issuing the Session to MfaVerifyUseCase.
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
    private readonly devices: DeviceResolverService,
    private readonly audit: IdentityAuditPublisher,
  ) {}

  async execute(input: LoginInput): Promise<LoginOutput> {
    const user = await this.users.findByEmail(input.email);

    if (!user?.passwordHash || !(await this.passwordHasher.verify(user.passwordHash, input.password))) {
      this.audit.publish({ action: 'UserLoginFailed', metadata: { email: input.email } });
      throw new InvalidCredentialsError();
    }

    const device = await this.devices.resolve(user.id, input.userAgent);

    if (user.mfaEnabled) {
      const mfaChallengeToken = this.accessTokens.signMfaChallenge({
        sub: user.id,
        deviceId: device.id,
        rememberMe: input.rememberMe ?? false,
      });
      return { mfaRequired: true, mfaChallengeToken };
    }

    const { plainRefreshToken } = await this.refreshTokens.issue(user.id, device.id, input.rememberMe ?? false);
    const accessToken = this.accessTokens.sign({ sub: user.id, email: user.email });

    this.audit.publish({ action: 'UserLoggedIn', userId: user.id });

    return { mfaRequired: false, user, accessToken, refreshToken: plainRefreshToken };
  }
}
