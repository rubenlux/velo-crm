import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createTestApp, resetDatabase } from '../test-app';

describe('Search Leads by multiple attributes (US5, Acceptance Scenario 1)', () => {
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

  it('finds Leads by name, company, email, phone, status, tags, city and source', async () => {
    const owner = await registerAndLogin('leads-search-owner@example.com');
    const token = owner.body.accessToken as string;
    const org = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Leads Search Org', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);
    const organizationId = org.body.id as string;

    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/leads`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ name: 'Roberto Gomez', company: 'Gomez Corp', email: 'roberto@gomez.com', phone: '555-2000', city: 'Cordoba', source: 'Referido', tags: ['vip'] })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/leads`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ name: 'Otro Prospecto', company: 'Otra SRL', city: 'Rosario', source: 'Evento' })
      .expect(201);

    async function search(query: Record<string, string>) {
      return request(app.getHttpServer())
        .get(`/api/v1/organizations/${organizationId}/leads`)
        .query(query)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Organization-Id', organizationId)
        .expect(200);
    }

    expect((await search({ q: 'Roberto' })).body.items).toHaveLength(1);
    expect((await search({ q: 'Gomez Corp' })).body.items).toHaveLength(1);
    expect((await search({ q: 'roberto@gomez.com' })).body.items).toHaveLength(1);
    expect((await search({ q: '555-2000' })).body.items).toHaveLength(1);
    expect((await search({ city: 'Cordoba' })).body.items).toHaveLength(1);
    expect((await search({ source: 'Referido' })).body.items).toHaveLength(1);
    expect((await search({ tag: 'vip' })).body.items).toHaveLength(1);
    expect((await search({ status: 'Nuevo' })).body.items).toHaveLength(2);
  });

  it('responds in under 300ms (SC-002)', async () => {
    const owner = await registerAndLogin('leads-search-perf-owner@example.com');
    const token = owner.body.accessToken as string;
    const org = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Leads Search Perf Org', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);
    const organizationId = org.body.id as string;

    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/leads`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ name: 'Perf Test Lead' })
      .expect(201);

    const start = Date.now();
    await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}/leads`)
      .query({ q: 'Perf' })
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);
    expect(Date.now() - start).toBeLessThan(300);
  });
});
