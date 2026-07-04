import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createTestApp, resetDatabase } from '../test-app';

describe('Search Contacts by attribute (US3, Acceptance Scenario 1, SC-001)', () => {
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

  it('finds matches by name, email, phone, jobTitle, company, city and tags', async () => {
    const owner = await registerAndLogin('contacts-search-owner@example.com');
    const org = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .send({ name: 'Search Org', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);
    const organizationId = org.body.id as string;
    const token = owner.body.accessToken as string;

    const customer = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/customers`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ name: 'Theta Corp' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/customers/${customer.body.id}/contacts`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ firstName: 'Grace', lastName: 'Hopper', jobTitle: 'Engineer', city: 'La Plata', tags: ['vip'] })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/customers/${customer.body.id}/contacts`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ firstName: 'Alan', lastName: 'Turing' })
      .expect(201);

    const byName = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}/contacts?q=Grace`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);
    expect(byName.body.items).toHaveLength(1);
    expect(byName.body.items[0].lastName).toBe('Hopper');

    const byCompany = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}/contacts?q=Theta`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);
    expect(byCompany.body.items).toHaveLength(2);

    const byTag = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}/contacts?tag=vip`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);
    expect(byTag.body.items).toHaveLength(1);
  });
});
