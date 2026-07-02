import { Injectable } from '@nestjs/common';
import { OAuthProvider, User } from '@prisma/client';
import { UserRepository } from '../infrastructure/user.repository';
import { OAuthAccountRepository } from '../infrastructure/oauth-account.repository';
import { AccessTokenService } from '../infrastructure/jwt.service';
import { RefreshTokenService } from '../infrastructure/refresh-token.service';
import { DeviceResolverService } from '../infrastructure/device-resolver.service';
import { IdentityAuditPublisher } from '../../../shared/audit/identity-audit.publisher';

export interface OAuthProfile {
  provider: OAuthProvider;
  providerAccountId: string;
  email: string;
  emailVerified: boolean;
}

export interface OAuthLoginOutput {
  user: User;
  accessToken: string;
  refreshToken: string;
}

/**
 * FR-002: creates or links a User from a verified OAuth profile (Google/Microsoft),
 * per research.md #3. If the provider account is already linked, logs in as that
 * User; otherwise links to an existing User with the same verified email, or creates
 * a new User.
 */
@Injectable()
export class OAuthLoginUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly oauthAccounts: OAuthAccountRepository,
    private readonly accessTokens: AccessTokenService,
    private readonly refreshTokens: RefreshTokenService,
    private readonly devices: DeviceResolverService,
    private readonly audit: IdentityAuditPublisher,
  ) {}

  async execute(profile: OAuthProfile, userAgent: string): Promise<OAuthLoginOutput> {
    const user = await this.resolveUser(profile);
    const device = await this.devices.resolve(user.id, userAgent);

    const { plainRefreshToken } = await this.refreshTokens.issue(user.id, device.id, false);
    const accessToken = this.accessTokens.sign({ sub: user.id, email: user.email });

    this.audit.publish({ action: 'UserLoggedIn', userId: user.id, metadata: { provider: profile.provider } });

    return { user, accessToken, refreshToken: plainRefreshToken };
  }

  private async resolveUser(profile: OAuthProfile): Promise<User> {
    const existingLink = await this.oauthAccounts.findByProviderAccount(
      profile.provider,
      profile.providerAccountId,
    );
    if (existingLink) {
      return existingLink.user;
    }

    const existingUserByEmail = await this.users.findByEmail(profile.email);
    if (existingUserByEmail) {
      await this.oauthAccounts.link(existingUserByEmail.id, profile.provider, profile.providerAccountId);
      return existingUserByEmail;
    }

    const created = await this.users.create({ email: profile.email, passwordHash: null });
    // OAuth-created Users have no password; mark their email verified when the
    // provider vouches for it (FR-002 / edge case: unverified provider emails are
    // treated as unverified, same as a plain email registration).
    const user = profile.emailVerified ? await this.users.markEmailVerified(created.id) : created;
    await this.oauthAccounts.link(user.id, profile.provider, profile.providerAccountId);
    return user;
  }
}
