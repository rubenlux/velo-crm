import { Injectable, UnauthorizedException } from '@nestjs/common';
import { User } from '@prisma/client';
import { AccessTokenService } from '../infrastructure/jwt.service';
import { RefreshTokenService } from '../infrastructure/refresh-token.service';
import { TotpService } from '../infrastructure/totp.service';
import { MfaSecretCipher } from '../infrastructure/mfa-secret-cipher';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { UserRepository } from '../infrastructure/user.repository';
import { IdentityAuditPublisher } from '../../../shared/audit/identity-audit.publisher';

export interface MfaVerifyOutput {
  user: User;
  accessToken: string;
  refreshToken: string;
}

/**
 * FR-009 (login step 2): completes a login that was paused by LoginUseCase because
 * the User has MFA enabled. Accepts either a TOTP code or a one-time recovery code.
 */
@Injectable()
export class MfaVerifyUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly prisma: PrismaService,
    private readonly accessTokens: AccessTokenService,
    private readonly refreshTokens: RefreshTokenService,
    private readonly totp: TotpService,
    private readonly cipher: MfaSecretCipher,
    private readonly audit: IdentityAuditPublisher,
  ) {}

  async execute(mfaChallengeToken: string, code: string): Promise<MfaVerifyOutput> {
    const challenge = this.accessTokens.verifyMfaChallenge(mfaChallengeToken);
    const user = await this.users.findById(challenge.sub);

    if (!user?.mfaEnabled || !user.mfaSecret) {
      throw new UnauthorizedException('mfa_not_enabled');
    }

    const isValidTotp = this.totp.verify(code, this.cipher.decrypt(user.mfaSecret));
    const isValidRecoveryCode = await this.consumeRecoveryCodeIfValid(user, code);

    if (!isValidTotp && !isValidRecoveryCode) {
      this.audit.publish({ action: 'UserLoginFailed', userId: user.id, metadata: { reason: 'invalid_mfa_code' } });
      throw new UnauthorizedException('invalid_mfa_code');
    }

    const { plainRefreshToken } = await this.refreshTokens.issue(
      user.id,
      challenge.deviceId,
      challenge.rememberMe,
    );
    const accessToken = this.accessTokens.sign({ sub: user.id, email: user.email });

    this.audit.publish({ action: 'UserLoggedIn', userId: user.id });

    return { user, accessToken, refreshToken: plainRefreshToken };
  }

  private async consumeRecoveryCodeIfValid(user: User, code: string): Promise<boolean> {
    const hashed = this.totp.hashRecoveryCode(code);
    if (!user.mfaRecoveryCodes.includes(hashed)) {
      return false;
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { mfaRecoveryCodes: user.mfaRecoveryCodes.filter((existing) => existing !== hashed) },
    });

    return true;
  }
}
