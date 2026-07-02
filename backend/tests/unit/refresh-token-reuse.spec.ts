import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../src/modules/identity/infrastructure/prisma.service';
import { RefreshTokenService } from '../../src/modules/identity/infrastructure/refresh-token.service';

describe('RefreshTokenService rotation & reuse detection (research.md #2)', () => {
  let prisma: PrismaService;
  let refreshTokens: RefreshTokenService;
  let userId: string;
  let deviceId: string;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    refreshTokens = new RefreshTokenService(prisma, new ConfigService());

    const user = await prisma.user.create({
      data: { email: 'reuse-detection@example.com', passwordHash: 'irrelevant-for-this-test' },
    });
    userId = user.id;
    const device = await prisma.device.create({ data: { userId, userAgent: 'jest' } });
    deviceId = device.id;
  });

  afterAll(async () => {
    await prisma.session.deleteMany({ where: { userId } });
    await prisma.device.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it('rotates to a new token while keeping the same family', async () => {
    const issued = await refreshTokens.issue(userId, deviceId, false);
    const rotated = await refreshTokens.rotate(issued.plainRefreshToken);

    expect(rotated.plainRefreshToken).not.toBe(issued.plainRefreshToken);
    expect(rotated.session.refreshTokenFamilyId).toBe(issued.session.refreshTokenFamilyId);
  });

  it('revokes the whole family when a rotated (used) token is replayed', async () => {
    const issued = await refreshTokens.issue(userId, deviceId, false);
    const rotated = await refreshTokens.rotate(issued.plainRefreshToken);

    // Replaying the already-rotated token must be rejected and burn the family.
    await expect(refreshTokens.rotate(issued.plainRefreshToken)).rejects.toThrow(UnauthorizedException);

    // The legitimately-rotated token must now be rejected too (family revoked).
    await expect(refreshTokens.rotate(rotated.plainRefreshToken)).rejects.toThrow(UnauthorizedException);
  });

  it('rejects an unknown refresh token', async () => {
    await expect(refreshTokens.rotate('does-not-exist')).rejects.toThrow(UnauthorizedException);
  });
});
