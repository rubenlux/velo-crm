import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createTestApp, resetDatabase } from '../test-app';

describe('Reactivate a Perdido Lead (US4, Acceptance Scenario 2)', () => {
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

  async function registerAndLogin(email: string) {
    await request(app.getHttpServer()).post('/api/v1/auth/register').send({ email, password: 'Sup3rSecret!' }).expect(201);
    return request(app.getHttpServer()).post('/api/v1/auth/login').send({ email, password: 'Sup3rSecret!' }).expect(200);
  }

  it('restores exactly the status the Lead had before being marked Perdido', async () => {
    const owner = await registerAndLogin('leads-reactivate-owner@example.com');
    const token = owner.body.accessToken as string;
    const org = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Leads Reactivate Org', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);
    const organizationId = org.body.id as string;

    const lead = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/leads`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ name: 'Reactivar Test' })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/v1/organizations/${organizationId}/leads/${lead.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ version: lead.body.version, status: 'EnNegociacion' })
      .expect(200);

    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/leads/${lead.body.id}/lose`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);

    const reactivated = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/leads/${lead.body.id}/reactivate`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);

    expect(reactivated.body).toMatchObject({ status: 'EnNegociacion', statusBeforeLost: null });
  });
});
