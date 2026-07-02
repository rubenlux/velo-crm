import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService as NestJwtService } from '@nestjs/jwt';

export interface AccessTokenPayload {
  sub: string; // User.id
  email: string;
}

/**
 * Issues and verifies short-lived access tokens (RS256) per research.md #2.
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
}
