import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createTestApp, resetDatabase } from '../test-app';

describe('Transición de estado de una Activity (US1, Acceptance Scenario 3)', () => {
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

  it('Pendiente -> EnProceso -> Finalizada puebla finishedAt', async () => {
    const owner = await registerAndLogin('activities-status-change-owner@example.com');
    const token = owner.body.accessToken as string;
    const org = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Activities Status Change Org', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);
    const organizationId = org.body.id as string;

    const customer = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/customers`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ name: 'Status Change Corp' })
      .expect(201);

    const types = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}/activity-types`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);
    const nota = types.body.find((t: { name: string }) => t.name === 'Nota');

    const activity = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/activities`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ customerId: customer.body.id, activityTypeId: nota.id, title: 'Nota de seguimiento', scheduledAt: new Date().toISOString() })
      .expect(201);
    expect(activity.body.finishedAt).toBeNull();

    const inProgress = await request(app.getHttpServer())
      .patch(`/api/v1/organizations/${organizationId}/activities/${activity.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ version: activity.body.version, status: 'EnProceso' })
      .expect(200);
    expect(inProgress.body.status).toBe('EnProceso');
    expect(inProgress.body.finishedAt).toBeNull();

    const finished = await request(app.getHttpServer())
      .patch(`/api/v1/organizations/${organizationId}/activities/${activity.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ version: inProgress.body.version, status: 'Finalizada' })
      .expect(200);
    expect(finished.body.status).toBe('Finalizada');
    expect(finished.body.finishedAt).not.toBeNull();
  });
});
