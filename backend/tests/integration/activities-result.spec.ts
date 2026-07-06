import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createTestApp, resetDatabase } from '../test-app';

describe('Registrar el resultado de una Activity finalizada (US2, Acceptance Scenario 1)', () => {
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

  it('queda visible sobre una Finalizada; rechaza con 409 sobre una no finalizada', async () => {
    const owner = await registerAndLogin('activities-result-owner@example.com');
    const token = owner.body.accessToken as string;
    const org = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Activities Result Org', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);
    const organizationId = org.body.id as string;

    const customer = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/customers`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ name: 'Result Corp' })
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
      .send({ customerId: customer.body.id, activityTypeId: llamada.id, title: 'Llamada con resultado', scheduledAt: new Date().toISOString() })
      .expect(201);

    const rejected = await request(app.getHttpServer())
      .patch(`/api/v1/organizations/${organizationId}/activities/${activity.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ version: activity.body.version, result: 'Demasiado pronto' })
      .expect(409);
    expect(rejected.body.message).toBe('activity_not_finished');

    const finished = await request(app.getHttpServer())
      .patch(`/api/v1/organizations/${organizationId}/activities/${activity.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ version: activity.body.version, status: 'Finalizada' })
      .expect(200);

    const withResult = await request(app.getHttpServer())
      .patch(`/api/v1/organizations/${organizationId}/activities/${activity.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ version: finished.body.version, result: 'Cliente interesado, pidió cotización' })
      .expect(200);
    expect(withResult.body.result).toBe('Cliente interesado, pidió cotización');
  });
});
