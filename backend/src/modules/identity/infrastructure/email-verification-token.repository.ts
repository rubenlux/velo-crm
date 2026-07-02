import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { EmailVerificationToken } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';

const TOKEN_TTL_HOURS = 24;

export interface IssuedEmailVerificationToken {
  record: EmailVerificationToken;
  plainToken: string;
}

@Injectable()
export class EmailVerificationTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  private hash(plainToken: string): string {
    return createHash('sha256').update(plainToken).digest('hex');
  }

  async issue(userId: string): Promise<IssuedEmailVerificationToken> {
    // Invalidate any previous pending token for this user before issuing a new one.
    await this.prisma.emailVerificationToken.updateMany({
      where: { userId, status: 'pending' },
      data: { status: 'expired' },
    });

    const plainToken = randomBytes(32).toString('hex');
    const record = await this.prisma.emailVerificationToken.create({
      data: {
        userId,
        tokenHash: this.hash(plainToken),
        expiresAt: new Date(Date.now() + TOKEN_TTL_HOURS * 60 * 60 * 1000),
      },
    });

    return { record, plainToken };
  }

  async consume(plainToken: string): Promise<EmailVerificationToken | null> {
    const record = await this.prisma.emailVerificationToken.findFirst({
      where: { tokenHash: this.hash(plainToken), status: 'pending' },
    });

    if (!record) {
      return null;
    }

    if (record.expiresAt.getTime() < Date.now()) {
      await this.prisma.emailVerificationToken.update({
        where: { id: record.id },
        data: { status: 'expired' },
      });
      return null;
    }

    await this.prisma.emailVerificationToken.update({
      where: { id: record.id },
      data: { status: 'used', usedAt: new Date() },
    });

    return record;
  }
}
