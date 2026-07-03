import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createTestApp, resetDatabase } from '../test-app';

describe('Access history (US4, Acceptance Scenario 1-2)', () => {
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

  async function registerAndLogin(email: string, userAgent: string) {
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password: 'Sup3rSecret!' })
      .expect(201);

    return request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('User-Agent', userAgent)
      .send({ email, password: 'Sup3rSecret!' })
      .expect(200);
  }

  it('reflects recent logins and never exposes another User access history', async () => {
    await registerAndLogin('history-user@example.com', 'device-A');
    const secondLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('User-Agent', 'device-B')
      .send({ email: 'history-user@example.com', password: 'Sup3rSecret!' })
      .expect(200);

    const otherUser = await registerAndLogin('history-other@example.com', 'device-C');

    const history = await request(app.getHttpServer())
      .get('/api/v1/users/me/access-history')
      .set('Authorization', `Bearer ${secondLogin.body.accessToken}`)
      .expect(200);

    expect(history.body.length).toBeGreaterThanOrEqual(2);
    const userAgents = history.body.map((entry: { device: { userAgent: string } }) => entry.device.userAgent);
    expect(userAgents).toEqual(expect.arrayContaining(['device-A', 'device-B']));
    expect(userAgents).not.toContain('device-C');

    const otherHistory = await request(app.getHttpServer())
      .get('/api/v1/users/me/access-history')
      .set('Authorization', `Bearer ${otherUser.body.accessToken}`)
      .expect(200);
    expect(otherHistory.body).toHaveLength(1);
    expect(otherHistory.body[0].device.userAgent).toBe('device-C');
  });
});
