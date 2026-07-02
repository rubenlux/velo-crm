import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createTestApp, resetDatabase } from '../test-app';

describe('Identity flow: register -> verify email -> login -> logout (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  afterEach(async () => {
    await resetDatabase(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('walks the full US1 quickstart scenario', async () => {
    const server = app.getHttpServer();

    // 1. Register
    const registerResponse = await request(server)
      .post('/api/v1/auth/register')
      .send({ email: 'flow-user@example.com', password: 'Sup3rSecret!' })
      .expect(201);

    expect(registerResponse.body.emailVerified).toBe(false);
    const verificationToken = registerResponse.body.emailVerificationToken as string;

    // 2. Login while unverified is allowed, but flags emailVerified: false (Acceptance Scenario 2)
    const unverifiedLogin = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: 'flow-user@example.com', password: 'Sup3rSecret!' })
      .expect(200);
    expect(unverifiedLogin.body.user.emailVerified).toBe(false);

    // 3. Verify email
    await request(server)
      .post('/api/v1/auth/verify-email')
      .send({ token: verificationToken })
      .expect(200);

    // 4. Login again now verified
    const verifiedLogin = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: 'flow-user@example.com', password: 'Sup3rSecret!' })
      .expect(200);
    expect(verifiedLogin.body.user.emailVerified).toBe(true);

    const { accessToken, refreshToken } = verifiedLogin.body;

    // 5. Logout revokes the session
    await request(server)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ refreshToken })
      .expect(204);

    // 6. The revoked refresh token can no longer be rotated
    await request(server)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken })
      .expect(401);
  });
});
