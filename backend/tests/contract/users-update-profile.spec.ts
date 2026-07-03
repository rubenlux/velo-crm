import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createTestApp, resetDatabase } from '../test-app';

describe('PATCH /api/v1/users/me/profile (contract)', () => {
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

  it('updates name, avatar, language and timezone (Acceptance Scenario 1-2)', async () => {
    const email = 'profile-owner@example.com';
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password: 'Sup3rSecret!' })
      .expect(201);

    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: 'Sup3rSecret!' })
      .expect(200);

    const response = await request(app.getHttpServer())
      .patch('/api/v1/users/me/profile')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send({ firstName: 'Ada', lastName: 'Lovelace', avatarUrl: 'https://cdn.example.com/ada.png', language: 'en', timezone: 'Europe/London' })
      .expect(200);

    expect(response.body).toMatchObject({
      firstName: 'Ada',
      lastName: 'Lovelace',
      avatarUrl: 'https://cdn.example.com/ada.png',
      language: 'en',
      timezone: 'Europe/London',
    });

    const persisted = await request(app.getHttpServer())
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200);
    expect(persisted.body.firstName).toBe('Ada');
  });
});
