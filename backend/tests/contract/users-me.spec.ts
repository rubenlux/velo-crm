import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createTestApp, resetDatabase } from '../test-app';

describe('GET /api/v1/users/me (contract)', () => {
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

  it('returns the authenticated User profile with default values', async () => {
    const email = 'me-owner@example.com';
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password: 'Sup3rSecret!' })
      .expect(201);

    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: 'Sup3rSecret!' })
      .expect(200);

    const response = await request(app.getHttpServer())
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200);

    expect(response.body).toMatchObject({
      email,
      language: 'es',
      timezone: 'UTC',
      status: 'Active',
    });
  });

  it('rejects a request without a valid access token', async () => {
    await request(app.getHttpServer()).get('/api/v1/users/me').expect(401);
  });
});
