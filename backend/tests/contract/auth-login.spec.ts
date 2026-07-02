import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/modules/identity/infrastructure/prisma.service';
import { createTestApp, resetDatabase } from '../test-app';

describe('POST /api/v1/auth/login (contract)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  beforeEach(async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: 'login-user@example.com', password: 'Sup3rSecret!' })
      .expect(201);
  });

  afterEach(async () => {
    await resetDatabase(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns an access token and refresh token for valid credentials', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'login-user@example.com', password: 'Sup3rSecret!' })
      .expect(200);

    expect(typeof response.body.accessToken).toBe('string');
    expect(typeof response.body.refreshToken).toBe('string');
    expect(response.body.user.emailVerified).toBe(false);
  });

  it('rejects an incorrect password with 401', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'login-user@example.com', password: 'WrongPassword!' })
      .expect(401);
  });

  it('rejects login for an unknown email with 401', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'nobody@example.com', password: 'Sup3rSecret!' })
      .expect(401);
  });
});
