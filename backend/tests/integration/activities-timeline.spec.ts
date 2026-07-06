import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createTestApp, resetDatabase } from '../test-app';

describe('Línea de tiempo propia de una Activity (US5, research.md #14)', () => {
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

  it('combina ActivityHistory + AuditLog en orden cronológico', async () => {
    const owner = await registerAndLogin('activities-timeline-owner@example.com');
    const token = owner.body.accessToken as string;
    const org = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Activities Timeline Org', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);
    const organizationId = org.body.id as string;

    const customer = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/customers`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ name: 'Timeline Corp' })
      .expect(201);

    const types = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}/activity-types`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);
    const llamada = types.body.find((t: { name: string }) => t.name === 'Llamada');

    const activity = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/activities`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ customerId: customer.body.id, activityTypeId: llamada.id, title: 'Llamada con timeline', scheduledAt: new Date().toISOString() })
      .expect(201);

    const inProgress = await request(app.getHttpServer())
      .patch(`/api/v1/organizations/${organizationId}/activities/${activity.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ version: activity.body.version, status: 'EnProceso' })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/api/v1/organizations/${organizationId}/activities/${activity.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ version: inProgress.body.version, status: 'Finalizada' })
      .expect(200);

    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/activities/${activity.body.id}/comments`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ body: 'Comentario en la timeline' })
      .expect(201);

    const timeline = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}/activities/${activity.body.id}/timeline`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);

    const actions = timeline.body.map((entry: { detail?: { action?: string } }) => entry.detail?.action).filter(Boolean);
    expect(actions).toEqual(
      expect.arrayContaining(['ActivityCreated', 'ActivityStatusChanged', 'ActivityCommentAdded']),
    );

    const editEntry = timeline.body.find((entry: { type: string }) => entry.type === 'edit');
    expect(editEntry).toBeDefined();
    expect(editEntry.detail.changes).toBeDefined();

    const timestamps = timeline.body.map((entry: { occurredAt: string }) => new Date(entry.occurredAt).getTime());
    const sorted = [...timestamps].sort((a, b) => a - b);
    expect(timestamps).toEqual(sorted);
  });
});
