import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { TotpService } from '../infrastructure/totp.service';
import { MfaSecretCipher } from '../infrastructure/mfa-secret-cipher';
import { PrismaService } from '../infrastructure/prisma.service';
import { UserRepository } from '../infrastructure/user.repository';
import { IdentityAuditPublisher } from '../../../shared/audit/identity-audit.publisher';

export interface EnrollMfaOutput {
  otpauthUrl: string;
  recoveryCodes: string[];
}

/**
 * FR-009 (step 1): generates a TOTP secret + recovery codes. MFA is not enabled yet
 * until EnableMfaUseCase confirms the first code.
 */
@Injectable()
export class EnrollMfaUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly prisma: PrismaService,
    private readonly totp: TotpService,
    private readonly cipher: MfaSecretCipher,
  ) {}

  async execute(userId: string): Promise<EnrollMfaOutput> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new NotFoundException('user_not_found');
    }

    const secret = this.totp.generateSecret();
    const recoveryCodes = this.totp.generateRecoveryCodes();

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        mfaSecret: this.cipher.encrypt(secret),
        mfaRecoveryCodes: recoveryCodes.map((code) => this.totp.hashRecoveryCode(code)),
      },
    });

    return { otpauthUrl: this.totp.keyUri(user.email, secret), recoveryCodes };
  }
}

/**
 * FR-009 (step 2): confirms the first TOTP code and flips mfaEnabled to true.
 */
@Injectable()
export class EnableMfaUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly prisma: PrismaService,
    private readonly totp: TotpService,
    private readonly cipher: MfaSecretCipher,
    private readonly audit: IdentityAuditPublisher,
  ) {}

  async execute(userId: string, code: string): Promise<void> {
    const user = await this.users.findById(userId);

    if (!user?.mfaSecret) {
      throw new BadRequestException('mfa_not_enrolled');
    }

    const secret = this.cipher.decrypt(user.mfaSecret);
    if (!this.totp.verify(code, secret)) {
      throw new BadRequestException('invalid_mfa_code');
    }

    await this.prisma.user.update({ where: { id: userId }, data: { mfaEnabled: true } });
    this.audit.publish({ action: 'MfaEnabled', userId });
  }
}
