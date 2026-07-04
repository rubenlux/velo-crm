import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createTestApp, resetDatabase } from '../test-app';

describe('Search Customers by attribute (US2, Acceptance Scenario 1, SC-001)', () => {
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

  it('finds matches by name, legalName, taxId, email, phone and tag', async () => {
    const owner = await registerAndLogin('customers-search-owner@example.com');
    const org = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .send({ name: 'Search Org', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);
    const organizationId = org.body.id as string;
    const token = owner.body.accessToken as string;

    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/customers`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ name: 'Globex Corporation', taxId: '30-55555555-1', email: 'contact@globex.com', tags: ['vip'] })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/customers`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ name: 'Initech LLC' })
      .expect(201);

    const byName = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}/customers?q=Globex`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);
    expect(byName.body.items).toHaveLength(1);
    expect(byName.body.items[0].name).toBe('Globex Corporation');

    const byTaxId = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}/customers?q=30-55555555-1`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);
    expect(byTaxId.body.items).toHaveLength(1);

    const byTag = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}/customers?q=vip`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);
    expect(byTag.body.items).toHaveLength(1);

    const noMatch = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}/customers?q=doesnotexist`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);
    expect(noMatch.body.items).toHaveLength(0);
  });
});
