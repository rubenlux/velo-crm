import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../infrastructure/prisma.service';
import { RefreshTokenService } from '../infrastructure/refresh-token.service';
import { IdentityAuditPublisher } from '../../../shared/audit/identity-audit.publisher';

/**
 * FR-007: lets a User revoke one of their own Sessions remotely.
 */
@Injectable()
export class RevokeSessionUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly refreshTokens: RefreshTokenService,
    private readonly audit: IdentityAuditPublisher,
  ) {}

  async execute(requestingUserId: string, sessionId: string): Promise<void> {
    const session = await this.prisma.session.findUnique({ where: { id: sessionId } });

    if (!session) {
      throw new NotFoundException('session_not_found');
    }

    if (session.userId !== requestingUserId) {
      throw new ForbiddenException('cannot_revoke_another_users_session');
    }

    await this.refreshTokens.revoke(sessionId);
    this.audit.publish({ action: 'SessionRevoked', userId: requestingUserId, metadata: { sessionId } });
  }
}

/**
 * FR-006: lets a User revoke every active Session at once (e.g., suspected compromise).
 */
@Injectable()
export class RevokeAllSessionsUseCase {
  constructor(
    private readonly refreshTokens: RefreshTokenService,
    private readonly audit: IdentityAuditPublisher,
  ) {}

  async execute(userId: string): Promise<void> {
    await this.refreshTokens.revokeAllForUser(userId);
    this.audit.publish({ action: 'SessionRevoked', userId, metadata: { scope: 'all' } });
  }
}
