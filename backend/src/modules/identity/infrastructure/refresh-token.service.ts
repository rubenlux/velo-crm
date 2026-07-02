import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';
import { Session } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';

export interface IssuedRefreshToken {
  session: Session;
  plainRefreshToken: string;
}

/**
 * Opaque refresh tokens with rotation and reuse detection, per research.md #2.
 * A reused (already-rotated) refresh token revokes the entire token family.
 */
@Injectable()
export class RefreshTokenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private hashToken(plainToken: string): string {
    return createHash('sha256').update(plainToken).digest('hex');
  }

  private expiresAt(rememberMe: boolean): Date {
    const days = rememberMe
      ? Number(this.config.get('REFRESH_TOKEN_TTL_REMEMBER_ME_DAYS', '30'))
      : Number(this.config.get('REFRESH_TOKEN_TTL_DAYS', '7'));
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }

  async issue(userId: string, deviceId: string, rememberMe: boolean): Promise<IssuedRefreshToken> {
    const plainRefreshToken = randomBytes(32).toString('hex');
    const session = await this.prisma.session.create({
      data: {
        userId,
        deviceId,
        refreshTokenHash: this.hashToken(plainRefreshToken),
        refreshTokenFamilyId: randomBytes(16).toString('hex'),
        rememberMe,
        expiresAt: this.expiresAt(rememberMe),
      },
    });
    return { session, plainRefreshToken };
  }

  async rotate(plainRefreshToken: string): Promise<IssuedRefreshToken> {
    const hash = this.hashToken(plainRefreshToken);
    const session = await this.prisma.session.findFirst({ where: { refreshTokenHash: hash } });

    if (!session) {
      throw new UnauthorizedException('invalid_refresh_token');
    }

    if (session.status === 'revoked') {
      // Reuse of an already-rotated (or explicitly revoked) token: burn the whole family.
      await this.revokeFamily(session.refreshTokenFamilyId);
      throw new UnauthorizedException('refresh_token_reuse_detected');
    }

    if (session.expiresAt.getTime() < Date.now()) {
      await this.revoke(session.id);
      throw new UnauthorizedException('refresh_token_expired');
    }

    await this.prisma.session.update({
      where: { id: session.id },
      data: { status: 'revoked', revokedAt: new Date() },
    });

    const plainNext = randomBytes(32).toString('hex');
    const nextSession = await this.prisma.session.create({
      data: {
        userId: session.userId,
        deviceId: session.deviceId,
        refreshTokenHash: this.hashToken(plainNext),
        refreshTokenFamilyId: session.refreshTokenFamilyId,
        rememberMe: session.rememberMe,
        expiresAt: this.expiresAt(session.rememberMe),
      },
    });

    return { session: nextSession, plainRefreshToken: plainNext };
  }

  async revoke(sessionId: string): Promise<void> {
    await this.prisma.session.update({
      where: { id: sessionId },
      data: { status: 'revoked', revokedAt: new Date() },
    });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { userId, status: 'active' },
      data: { status: 'revoked', revokedAt: new Date() },
    });
  }

  async revokeFamily(refreshTokenFamilyId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { refreshTokenFamilyId, status: 'active' },
      data: { status: 'revoked', revokedAt: new Date() },
    });
  }
}
