import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createTestApp, resetDatabase } from '../test-app';

describe('Suspend Organization (US5, SC-005)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const adminEmail = 'platform-admin@example.com';

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

  it('blocks TenantContextGuard for all Users once suspended (Acceptance Scenario 1, 2)', async () => {
    const owner = await registerAndLogin('suspend-owner@example.com');
    const admin = await registerAndLogin(adminEmail);

    const org = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .send({ name: 'Suspend Org', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${org.body.id}/suspend`)
      .set('Authorization', `Bearer ${admin.body.accessToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .get(`/api/v1/organizations/${org.body.id}`)
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .set('X-Organization-Id', org.body.id)
      .expect(403);
  });

  it('rejects suspend/reactivate from a non-admin email', async () => {
    const owner = await registerAndLogin('suspend-nonadmin-owner@example.com');
    const org = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .send({ name: 'Non Admin Org', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${org.body.id}/suspend`)
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .expect(403);
  });
});
