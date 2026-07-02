import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';

export interface SessionSummary {
  id: string;
  device: { id: string; userAgent: string; approxLocation: string | null };
  rememberMe: boolean;
  lastActivityAt: Date;
  createdAt: Date;
  expiresAt: Date;
}

/**
 * FR-007: lists a User's active Sessions with their Device, for self-service review.
 */
@Injectable()
export class ListSessionsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(userId: string): Promise<SessionSummary[]> {
    const sessions = await this.prisma.session.findMany({
      where: { userId, status: 'active' },
      include: { device: true },
      orderBy: { lastActivityAt: 'desc' },
    });

    return sessions.map((session) => ({
      id: session.id,
      device: {
        id: session.device.id,
        userAgent: session.device.userAgent,
        approxLocation: session.device.approxLocation,
      },
      rememberMe: session.rememberMe,
      lastActivityAt: session.lastActivityAt,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
    }));
  }
}
