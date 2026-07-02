import { Injectable } from '@nestjs/common';
import { Device } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';

/**
 * Minimal device resolution shared by password and OAuth login. A dedicated
 * DeviceRepository with richer device fingerprinting/listing lands with User
 * Story 4 (session management) — this only finds-or-creates by (userId, userAgent).
 */
@Injectable()
export class DeviceResolverService {
  constructor(private readonly prisma: PrismaService) {}

  async resolve(userId: string, userAgent: string): Promise<Device> {
    const existing = await this.prisma.device.findFirst({ where: { userId, userAgent } });

    if (existing) {
      return this.prisma.device.update({
        where: { id: existing.id },
        data: { lastSeenAt: new Date() },
      });
    }

    return this.prisma.device.create({ data: { userId, userAgent } });
  }
}
