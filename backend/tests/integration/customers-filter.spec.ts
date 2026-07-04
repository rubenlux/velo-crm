import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createTestApp, resetDatabase } from '../test-app';

describe('Filter Customers by status/city/category (US2, Acceptance Scenario 2)', () => {
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

  it('reduces the listing to only the Customers matching the filters', async () => {
    const owner = await registerAndLogin('customers-filter-owner@example.com');
    const org = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .send({ name: 'Filter Org', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);
    const organizationId = org.body.id as string;
    const token = owner.body.accessToken as string;

    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/customers`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ name: 'Buenos Aires Customer', city: 'Buenos Aires', category: 'retail' })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/customers`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ name: 'Cordoba Customer', city: 'Cordoba', category: 'wholesale' })
      .expect(201);

    const byCity = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}/customers?city=Buenos Aires`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);
    expect(byCity.body.items).toHaveLength(1);
    expect(byCity.body.items[0].name).toBe('Buenos Aires Customer');

    const byCategory = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}/customers?category=wholesale`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);
    expect(byCategory.body.items).toHaveLength(1);
    expect(byCategory.body.items[0].name).toBe('Cordoba Customer');

    const byStatus = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}/customers?status=active`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);
    expect(byStatus.body.items).toHaveLength(2);
  });
});
