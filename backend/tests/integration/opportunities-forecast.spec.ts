import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createTestApp, resetDatabase } from '../test-app';

describe('Forecast de ventas por período (US4, Acceptance Scenario 2)', () => {
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

  it('agrega por mes/trimestre/año y por vendedor, excluyendo Oportunidades sin estimatedCloseDate', async () => {
    const owner = await registerAndLogin('opportunities-forecast-owner@example.com');
    const token = owner.body.accessToken as string;
    const org = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Opportunities Forecast Org', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);
    const organizationId = org.body.id as string;

    const customer = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/customers`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ name: 'Forecast Corp' })
      .expect(201);

    const now = new Date();
    const thisMonthDate = new Date(now.getFullYear(), now.getMonth(), 15).toISOString();
    const nextYearDate = new Date(now.getFullYear() + 1, 0, 15).toISOString();

    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/opportunities`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({
        customerId: customer.body.id,
        name: 'Forecast This Month Deal',
        estimatedValue: 30000,
        estimatedCloseDate: thisMonthDate,
        ownerUserId: owner.body.user.id,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/opportunities`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({
        customerId: customer.body.id,
        name: 'Forecast Next Year Deal',
        estimatedValue: 15000,
        estimatedCloseDate: nextYearDate,
        ownerUserId: owner.body.user.id,
      })
      .expect(201);

    // Sin estimatedCloseDate: debe quedar excluida del forecast (edge case).
    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/opportunities`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ customerId: customer.body.id, name: 'Forecast Undated Deal', estimatedValue: 99999 })
      .expect(201);

    const forecast = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}/opportunities/forecast`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);

    expect(forecast.body.month).toBe(30000);
    expect(forecast.body.quarter).toBe(30000);
    expect(forecast.body.year).toBe(30000);
    expect(forecast.body.byOwner.find((o: { ownerUserId: string }) => o.ownerUserId === owner.body.user.id).value).toBe(45000);
  });
});
