import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createTestApp, resetDatabase } from '../test-app';

describe('Brute-force protection on /api/v1/auth/login (SC-005)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: 'brute-force@example.com', password: 'Sup3rSecret!' })
      .expect(201);
  });

  afterAll(async () => {
    await resetDatabase(prisma);
    await app.close();
  });

  it('blocks further attempts after 5 failed logins within the window', async () => {
    const attempt = () =>
      request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'brute-force@example.com', password: 'WrongPassword!' });

    for (let i = 0; i < 5; i += 1) {
      const response = await attempt();
      expect(response.status).toBe(401);
    }

    const sixthAttempt = await attempt();
    expect(sixthAttempt.status).toBe(429);
  });
});
