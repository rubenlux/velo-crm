import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createTestApp, resetDatabase } from '../test-app';

describe('KPIs comerciales del pipeline (US4, Acceptance Scenario 1)', () => {
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

  it('muestra valor total, valor ponderado, conteos por estado, tasa de conversión y ticket promedio', async () => {
    const owner = await registerAndLogin('opportunities-kpis-owner@example.com');
    const token = owner.body.accessToken as string;
    const org = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Opportunities Kpis Org', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);
    const organizationId = org.body.id as string;

    const customer = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/customers`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ name: 'Kpis Corp' })
      .expect(201);

    const opened = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/opportunities`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ customerId: customer.body.id, name: 'Kpis Open Deal', estimatedValue: 100000, probability: 50, ownerUserId: owner.body.user.id })
      .expect(201);

    const won = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/opportunities`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ customerId: customer.body.id, name: 'Kpis Won Deal', estimatedValue: 60000, ownerUserId: owner.body.user.id })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/opportunities/${won.body.id}/win`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);

    const lost = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/opportunities`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ customerId: customer.body.id, name: 'Kpis Lost Deal', estimatedValue: 20000 })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/opportunities/${lost.body.id}/lose`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);

    const kpis = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}/opportunities/kpis`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);

    expect(kpis.body.openCount).toBe(1);
    expect(kpis.body.wonCount).toBe(1);
    expect(kpis.body.lostCount).toBe(1);
    expect(kpis.body.totalValue).toBe(100000);
    expect(kpis.body.weightedValue).toBe(50000);
    expect(kpis.body.conversionRate).toBe(0.5);
    expect(kpis.body.averageTicket).toBe(60000);
    expect(kpis.body.byOwner.find((o: { ownerUserId: string }) => o.ownerUserId === owner.body.user.id).count).toBe(2);

    expect(opened.body.id).toBeDefined();
  });
});
