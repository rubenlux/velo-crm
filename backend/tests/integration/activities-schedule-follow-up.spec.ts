import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createTestApp, resetDatabase } from '../test-app';

describe('Programar la próxima actividad (US2, Acceptance Scenario 2)', () => {
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

  it('crea una nueva Activity Pendiente vinculada a la misma entidad y a la Activity que la originó', async () => {
    const owner = await registerAndLogin('activities-follow-up-owner@example.com');
    const token = owner.body.accessToken as string;
    const org = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Activities Follow Up Org', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);
    const organizationId = org.body.id as string;

    const customer = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/customers`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ name: 'Follow Up Corp' })
      .expect(201);

    const types = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}/activity-types`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);
    const llamada = types.body.find((t: { name: string }) => t.name === 'Llamada');
    const reunion = types.body.find((t: { name: string }) => t.name === 'Reunión');

    const origin = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/activities`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ customerId: customer.body.id, activityTypeId: llamada.id, title: 'Llamada inicial', scheduledAt: new Date().toISOString() })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/v1/organizations/${organizationId}/activities/${origin.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ version: origin.body.version, status: 'Finalizada' })
      .expect(200);

    const followUp = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/activities/${origin.body.id}/schedule-follow-up`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ activityTypeId: reunion.id, title: 'Reunión de seguimiento', scheduledAt: new Date(Date.now() + 86400000).toISOString() })
      .expect(201);

    expect(followUp.body).toMatchObject({
      status: 'Pendiente',
      customerId: customer.body.id,
      originActivityId: origin.body.id,
    });
  });
});
