import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { authenticator } from 'otplib';

/**
 * TOTP (RFC 6238) secret generation/verification and recovery codes, per research.md #4.
 */
@Injectable()
export class TotpService {
  generateSecret(): string {
    return authenticator.generateSecret();
  }

  keyUri(accountEmail: string, secret: string): string {
    return authenticator.keyuri(accountEmail, 'Velo CRM', secret);
  }

  verify(token: string, secret: string): boolean {
    try {
      return authenticator.verify({ token, secret });
    } catch {
      return false;
    }
  }

  generateRecoveryCodes(count = 8): string[] {
    return Array.from({ length: count }, () => randomBytes(5).toString('hex'));
  }

  hashRecoveryCode(code: string): string {
    return createHash('sha256').update(code).digest('hex');
  }
}
