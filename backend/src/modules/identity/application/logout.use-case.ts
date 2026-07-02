import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../infrastructure/prisma.service';
import { RefreshTokenService } from '../infrastructure/refresh-token.service';
import { IdentityAuditPublisher } from '../../../shared/audit/identity-audit.publisher';

/**
 * FR-005: revokes the current Session so a reused access/refresh token is rejected.
 */
@Injectable()
export class LogoutUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly refreshTokens: RefreshTokenService,
    private readonly audit: IdentityAuditPublisher,
  ) {}

  async execute(userId: string, plainRefreshToken: string): Promise<void> {
    const hash = createHash('sha256').update(plainRefreshToken).digest('hex');
    const session = await this.prisma.session.findFirst({ where: { refreshTokenHash: hash, userId } });

    if (session) {
      await this.refreshTokens.revoke(session.id);
    }

    this.audit.publish({ action: 'UserLoggedOut', userId });
  }
}
