import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createTestApp, resetDatabase } from '../test-app';

describe('Session management (US4)', () => {
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

  it('lists sessions from multiple devices and allows revoking one remotely', async () => {
    const server = app.getHttpServer();
    const firstLogin = await registerAndLogin('multi-device@example.com', 'device-A');
    const secondLogin = await request(server)
      .post('/api/v1/auth/login')
      .set('User-Agent', 'device-B')
      .send({ email: 'multi-device@example.com', password: 'Sup3rSecret!' })
      .expect(200);

    const sessionsResponse = await request(server)
      .get('/api/v1/auth/sessions')
      .set('Authorization', `Bearer ${firstLogin.body.accessToken}`)
      .expect(200);

    expect(sessionsResponse.body).toHaveLength(2);
    const deviceBSession = sessionsResponse.body.find((s: { device: { userAgent: string } }) => s.device.userAgent === 'device-B');
    expect(deviceBSession).toBeDefined();

    await request(server)
      .delete(`/api/v1/auth/sessions/${deviceBSession.id}`)
      .set('Authorization', `Bearer ${firstLogin.body.accessToken}`)
      .expect(204);

    // The revoked session's refresh token no longer works.
    await request(server)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: secondLogin.body.refreshToken })
      .expect(401);

    const sessionsAfterRevoke = await request(server)
      .get('/api/v1/auth/sessions')
      .set('Authorization', `Bearer ${firstLogin.body.accessToken}`)
      .expect(200);
    expect(sessionsAfterRevoke.body).toHaveLength(1);
  });

  it('revokes all sessions at once', async () => {
    const server = app.getHttpServer();
    const firstLogin = await registerAndLogin('revoke-all@example.com', 'device-A');
    await request(server)
      .post('/api/v1/auth/login')
      .set('User-Agent', 'device-B')
      .send({ email: 'revoke-all@example.com', password: 'Sup3rSecret!' })
      .expect(200);

    await request(server)
      .delete('/api/v1/auth/sessions')
      .set('Authorization', `Bearer ${firstLogin.body.accessToken}`)
      .expect(204);

    await request(server)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: firstLogin.body.refreshToken })
      .expect(401);
  });

  it('rejects revoking a session that belongs to another User', async () => {
    const server = app.getHttpServer();
    const userA = await registerAndLogin('owner-a@example.com', 'device-A');
    const userB = await registerAndLogin('owner-b@example.com', 'device-A');

    const userBSessions = await request(server)
      .get('/api/v1/auth/sessions')
      .set('Authorization', `Bearer ${userB.body.accessToken}`)
      .expect(200);

    await request(server)
      .delete(`/api/v1/auth/sessions/${userBSessions.body[0].id}`)
      .set('Authorization', `Bearer ${userA.body.accessToken}`)
      .expect(403);
  });
});
