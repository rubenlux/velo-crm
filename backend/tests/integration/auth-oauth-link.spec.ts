import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { OAuthLoginUseCase } from '../../src/modules/identity/application/oauth-login.use-case';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createTestApp, resetDatabase } from '../test-app';

describe('OAuth account linking to a User registered by email/password (US3)', () => {
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

  it('links a Google account to a User who registered with email/password, preserving the password login', async () => {
    const server = app.getHttpServer();
    await request(server)
      .post('/api/v1/auth/register')
      .send({ email: 'password-then-oauth@example.com', password: 'Sup3rSecret!' })
      .expect(201);

    const oauthResult = await oauthLogin.execute(
      {
        provider: 'google',
        providerAccountId: 'google-account-link',
        email: 'password-then-oauth@example.com',
        emailVerified: true,
      },
      'jest-agent',
    );

    const userByEmail = await prisma.user.findUniqueOrThrow({
      where: { email: 'password-then-oauth@example.com' },
    });
    expect(oauthResult.user.id).toBe(userByEmail.id);
    expect(userByEmail.passwordHash).not.toBeNull();

    // The original password login still works after linking.
    await request(server)
      .post('/api/v1/auth/login')
      .send({ email: 'password-then-oauth@example.com', password: 'Sup3rSecret!' })
      .expect(200);
  });

  it('links Google and Microsoft accounts to the same User when the verified email matches both', async () => {
    const first = await oauthLogin.execute(
      {
        provider: 'google',
        providerAccountId: 'multi-provider-google',
        email: 'multi-provider@example.com',
        emailVerified: true,
      },
      'jest-agent',
    );

    const second = await oauthLogin.execute(
      {
        provider: 'microsoft',
        providerAccountId: 'multi-provider-microsoft',
        email: 'multi-provider@example.com',
        emailVerified: true,
      },
      'jest-agent',
    );

    expect(second.user.id).toBe(first.user.id);
    const linkedAccounts = await prisma.oAuthAccount.findMany({ where: { userId: first.user.id } });
    expect(linkedAccounts.map((account) => account.provider).sort()).toEqual(['google', 'microsoft']);
  });
});
