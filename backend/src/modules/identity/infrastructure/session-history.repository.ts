import { Injectable } from '@nestjs/common';
import { Session, Device } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';

export type SessionHistoryEntry = Session & { device: Device };

/**
 * Read-only view over Session for "access history" (spec 006-users, US4) — includes
 * revoked/expired sessions, unlike ListSessionsUseCase (spec 004) which only lists
 * currently active ones for session management. See specs/006-users/research.md #3.
 */
@Injectable()
export class SessionHistoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  listByUserId(userId: string, limit = 20): Promise<SessionHistoryEntry[]> {
    return this.prisma.session.findMany({
      where: { userId },
      include: { device: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
