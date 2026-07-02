import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { PasswordResetToken } from '@prisma/client';
import { PrismaService } from './prisma.service';

const TOKEN_TTL_MINUTES = 60;

export interface IssuedPasswordResetToken {
  record: PasswordResetToken;
  plainToken: string;
}

@Injectable()
export class PasswordResetTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  private hash(plainToken: string): string {
    return createHash('sha256').update(plainToken).digest('hex');
  }

  async issue(userId: string): Promise<IssuedPasswordResetToken> {
    // Only the most recently issued reset link is valid (edge case in spec.md).
    await this.prisma.passwordResetToken.updateMany({
      where: { userId, status: 'pending' },
      data: { status: 'expired' },
    });

    const plainToken = randomBytes(32).toString('hex');
    const record = await this.prisma.passwordResetToken.create({
      data: {
        userId,
        tokenHash: this.hash(plainToken),
        expiresAt: new Date(Date.now() + TOKEN_TTL_MINUTES * 60 * 1000),
      },
    });

    return { record, plainToken };
  }

  async consume(plainToken: string): Promise<PasswordResetToken | null> {
    const record = await this.prisma.passwordResetToken.findFirst({
      where: { tokenHash: this.hash(plainToken), status: 'pending' },
    });

    if (!record) {
      return null;
    }

    if (record.expiresAt.getTime() < Date.now()) {
      await this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { status: 'expired' },
      });
      return null;
    }

    await this.prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { status: 'used', usedAt: new Date() },
    });

    return record;
  }
}
