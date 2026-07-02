import { INestApplication } from '@nestjs/common';
import { OAuthLoginUseCase, OAuthProfile } from '../../src/modules/identity/application/oauth-login.use-case';
import { PrismaService } from '../../src/modules/identity/infrastructure/prisma.service';
import { createTestApp, resetDatabase } from '../test-app';

/**
 * These tests exercise OAuthLoginUseCase directly with a fabricated, already-verified
 * OAuth profile — equivalent to what GoogleStrategy#validate() would produce after a
 * real Google consent flow. A true end-to-end HTTP redirect test would require live
 * Google OAuth credentials, which this environment does not have (see spec.md
 * Assumptions and research.md #3).
 */
describe('OAuth login (US3): create-or-link a User from a verified profile', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let oauthLogin: OAuthLoginUseCase;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
    oauthLogin = app.get(OAuthLoginUseCase);
  });

  afterEach(async () => {
    await resetDatabase(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  function googleProfile(overrides: Partial<OAuthProfile> = {}): OAuthProfile {
    return {
      provider: 'google',
      providerAccountId: 'google-account-1',
      email: 'oauth-new@example.com',
      emailVerified: true,
      ...overrides,
    };
  }

  it('creates a new User with a verified email on first login', async () => {
    const result = await oauthLogin.execute(googleProfile(), 'jest-agent');

    expect(result.user.email).toBe('oauth-new@example.com');
    expect(result.user.emailVerifiedAt).not.toBeNull();
    expect(result.user.passwordHash).toBeNull();
    expect(typeof result.accessToken).toBe('string');
    expect(typeof result.refreshToken).toBe('string');
  });

  it('logs in as the same User on a second login with the same provider account', async () => {
    const first = await oauthLogin.execute(googleProfile(), 'jest-agent');
    const second = await oauthLogin.execute(googleProfile(), 'jest-agent');

    expect(second.user.id).toBe(first.user.id);

    const accountCount = await prisma.oAuthAccount.count({ where: { userId: first.user.id } });
    expect(accountCount).toBe(1);
  });

  it('links to an existing User that already has the same email instead of duplicating it', async () => {
    const existingUser = await prisma.user.create({
      data: { email: 'existing@example.com', passwordHash: 'irrelevant-for-this-test' },
    });

    const result = await oauthLogin.execute(
      googleProfile({ email: 'existing@example.com', providerAccountId: 'google-account-2' }),
      'jest-agent',
    );

    expect(result.user.id).toBe(existingUser.id);
    const totalUsers = await prisma.user.count({ where: { email: 'existing@example.com' } });
    expect(totalUsers).toBe(1);
  });

  it('treats an unverified provider email the same as an unverified registration', async () => {
    const result = await oauthLogin.execute(
      googleProfile({ email: 'oauth-unverified@example.com', emailVerified: false, providerAccountId: 'google-account-3' }),
      'jest-agent',
    );

    expect(result.user.emailVerifiedAt).toBeNull();
  });
});
