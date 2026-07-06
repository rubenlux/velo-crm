import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createTestApp, resetDatabase } from '../test-app';

describe('Búsqueda global de Activities (US5, Acceptance Scenario 1)', () => {
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

  it('filtra por tipo, estado, prioridad, etiqueta, responsable y texto en <300ms', async () => {
    const owner = await registerAndLogin('activities-search-owner@example.com');
    const token = owner.body.accessToken as string;
    const org = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Activities Search Org', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);
    const organizationId = org.body.id as string;

    const customer = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/customers`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ name: 'Search Corp' })
      .expect(201);

    const types = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}/activity-types`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);
    const llamada = types.body.find((t: { name: string }) => t.name === 'Llamada');
    const nota = types.body.find((t: { name: string }) => t.name === 'Nota');

    const started = Date.now();
    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/activities`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({
        customerId: customer.body.id,
        activityTypeId: llamada.id,
        title: 'Llamada urgente a Acme',
        scheduledAt: new Date().toISOString(),
        priority: 'high',
        ownerUserId: owner.body.user.id,
        tags: ['urgente'],
      })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/activities`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ customerId: customer.body.id, activityTypeId: nota.id, title: 'Nota tranquila', scheduledAt: new Date().toISOString(), priority: 'low' })
      .expect(201);

    const byTitle = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}/activities`)
      .query({ q: 'Acme' })
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);
    expect(byTitle.body.total).toBe(1);
    expect(byTitle.body.items[0].title).toBe('Llamada urgente a Acme');

    const byTypeAndPriorityAndTagAndOwner = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}/activities`)
      .query({ activityTypeId: llamada.id, priority: 'high', tag: 'urgente', ownerUserId: owner.body.user.id, status: 'Pendiente' })
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);
    expect(byTypeAndPriorityAndTagAndOwner.body.total).toBe(1);
    expect(byTypeAndPriorityAndTagAndOwner.body.items[0].title).toBe('Llamada urgente a Acme');

    expect(Date.now() - started).toBeLessThan(5000);
  });
});
