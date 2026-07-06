import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createTestApp, resetDatabase } from '../test-app';

describe('KPIs reflejan cambios recientes de inmediato (US4, Acceptance Scenario 3, SC-005)', () => {
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

  it('la siguiente consulta de KPIs ya cuenta una Oportunidad recién creada y ganada', async () => {
    const owner = await registerAndLogin('opportunities-kpis-live-owner@example.com');
    const token = owner.body.accessToken as string;
    const org = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Opportunities Kpis Live Org', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);
    const organizationId = org.body.id as string;

    const customer = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/customers`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ name: 'Kpis Live Corp' })
      .expect(201);

    const before = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}/opportunities/kpis`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);
    expect(before.body.openCount).toBe(0);
    expect(before.body.wonCount).toBe(0);

    const opportunity = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/opportunities`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ customerId: customer.body.id, name: 'Kpis Live Deal', estimatedValue: 40000 })
      .expect(201);

    const afterCreate = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}/opportunities/kpis`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);
    expect(afterCreate.body.openCount).toBe(1);
    expect(afterCreate.body.totalValue).toBe(40000);

    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/opportunities/${opportunity.body.id}/win`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);

    const afterWin = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}/opportunities/kpis`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);
    expect(afterWin.body.openCount).toBe(0);
    expect(afterWin.body.wonCount).toBe(1);
  });
});
