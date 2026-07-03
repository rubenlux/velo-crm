import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createTestApp, resetDatabase } from '../test-app';

describe('User preferences and profile Audit Log (US1, Acceptance Scenario 3-4, SC-003)', () => {
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

  it('persists preferences and records both profile and preference changes in the Audit Log', async () => {
    const email = 'prefs-owner@example.com';
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password: 'Sup3rSecret!' })
      .expect(201);

    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: 'Sup3rSecret!' })
      .expect(200);

    await request(app.getHttpServer())
      .patch('/api/v1/users/me/profile')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send({ firstName: 'Grace' })
      .expect(200);

    const prefsResponse = await request(app.getHttpServer())
      .patch('/api/v1/users/me/preferences')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send({ preferences: { notifications: { email: false } } })
      .expect(200);
    expect(prefsResponse.body.preferences).toEqual({ notifications: { email: false } });

    const auditLog = await request(app.getHttpServer())
      .get('/api/v1/users/me/audit-log')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200);

    expect(auditLog.body).toHaveLength(2);
    expect(auditLog.body.every((entry: { action: string }) => entry.action === 'UserProfileUpdated')).toBe(true);
    expect(auditLog.body.every((entry: { organizationId: string | null }) => entry.organizationId === null)).toBe(
      true,
    );
  });
});
