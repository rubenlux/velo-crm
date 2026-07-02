import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService as NestJwtService } from '@nestjs/jwt';

export interface AccessTokenPayload {
  sub: string; // User.id
  email: string;
}

export interface MfaChallengePayload {
  sub: string; // User.id
  deviceId: string;
  rememberMe: boolean;
  typ: 'mfa_challenge';
}

/**
 * Issues and verifies short-lived access tokens (RS256) per research.md #2, plus
 * short-lived MFA challenge tokens used between "password verified" and "TOTP
 * verified" during a User Story 5 login (see MfaVerifyUseCase).
 */
@Injectable()
export class AccessTokenService {
  constructor(
    private readonly jwt: NestJwtService,
    private readonly config: ConfigService,
  ) {}

  private privateKey(): string {
    return (this.config.get<string>('JWT_ACCESS_PRIVATE_KEY') ?? '').replace(/\\n/g, '\n');
  }

  private publicKey(): string {
    return (this.config.get<string>('JWT_ACCESS_PUBLIC_KEY') ?? '').replace(/\\n/g, '\n');
  }

  sign(payload: AccessTokenPayload): string {
    return this.jwt.sign(payload, {
      algorithm: 'RS256',
      privateKey: this.privateKey(),
      expiresIn: this.config.get<string>('JWT_ACCESS_TTL', '15m'),
    });
  }

  verify(token: string): AccessTokenPayload {
    return this.jwt.verify<AccessTokenPayload>(token, {
      algorithms: ['RS256'],
      publicKey: this.publicKey(),
    });
  }

  signMfaChallenge(payload: Omit<MfaChallengePayload, 'typ'>): string {
    return this.jwt.sign(
      { ...payload, typ: 'mfa_challenge' },
      {
        algorithm: 'RS256',
        privateKey: this.privateKey(),
        expiresIn: this.config.get<string>('MFA_CHALLENGE_TTL', '5m'),
      },
    );
  }

  verifyMfaChallenge(token: string): MfaChallengePayload {
    const payload = this.jwt.verify<MfaChallengePayload>(token, {
      algorithms: ['RS256'],
      publicKey: this.publicKey(),
    });

    if (payload.typ !== 'mfa_challenge') {
      throw new UnauthorizedException('invalid_mfa_challenge');
    }

    return payload;
  }
}
