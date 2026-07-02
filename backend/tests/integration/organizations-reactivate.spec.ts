import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createTestApp, resetDatabase } from '../test-app';

describe('Reactivate Organization (US5, Acceptance Scenario 3)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const adminEmail = 'platform-admin-reactivate@example.com';

  beforeAll(async () => {
    process.env.PLATFORM_ADMIN_EMAILS = adminEmail;
    ({ app, prisma } = await createTestApp());
  });

  afterEach(async () => {
    await resetDatabase(prisma);
  });

  afterAll(async () => {
    delete process.env.PLATFORM_ADMIN_EMAILS;
    await app.close();
  });

  async function registerAndLogin(email: string) {
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password: 'Sup3rSecret!' })
      .expect(201);

    return request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: 'Sup3rSecret!' })
      .expect(200);
  }

  it('restores normal access with intact data after reactivation', async () => {
    const owner = await registerAndLogin('reactivate-owner@example.com');
    const admin = await registerAndLogin(adminEmail);

    const org = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .send({ name: 'Reactivate Org', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${org.body.id}/suspend`)
      .set('Authorization', `Bearer ${admin.body.accessToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${org.body.id}/reactivate`)
      .set('Authorization', `Bearer ${admin.body.accessToken}`)
      .expect(200);

    const response = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${org.body.id}`)
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .set('X-Organization-Id', org.body.id)
      .expect(200);

    expect(response.body).toMatchObject({ id: org.body.id, name: 'Reactivate Org', status: 'active' });

    const auditLog = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${org.body.id}/audit-log`)
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .set('X-Organization-Id', org.body.id)
      .expect(200);

    const actions = auditLog.body.map((entry: { action: string }) => entry.action);
    expect(actions).toEqual(expect.arrayContaining(['OrganizationSuspended', 'OrganizationReactivated']));
  });
});
