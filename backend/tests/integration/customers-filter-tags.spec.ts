import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createTestApp, resetDatabase } from '../test-app';

describe('Filter Customers by tag (US2, Acceptance Scenario 3)', () => {
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

  it('includes a Customer with multiple tags when filtering by one of them', async () => {
    const owner = await registerAndLogin('customers-filter-tags-owner@example.com');
    const org = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .send({ name: 'Filter Tags Org', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);
    const organizationId = org.body.id as string;
    const token = owner.body.accessToken as string;

    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/customers`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ name: 'Multi Tag Customer', tags: ['vip', 'reseller', 'priority'] })
      .expect(201);

    const result = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}/customers?tag=reseller`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);

    expect(result.body.items).toHaveLength(1);
    expect(result.body.items[0].tags).toEqual(expect.arrayContaining(['vip', 'reseller', 'priority']));
  });
});
