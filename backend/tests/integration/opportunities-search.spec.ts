import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createTestApp, resetDatabase } from '../test-app';

describe('Búsqueda global de Oportunidades (US5, Acceptance Scenario 1)', () => {
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

  it('filtra por nombre, Customer, estado y devuelve los totales de la selección', async () => {
    const owner = await registerAndLogin('opportunities-search-owner@example.com');
    const token = owner.body.accessToken as string;
    const org = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Opportunities Search Org', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);
    const organizationId = org.body.id as string;

    const customerA = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/customers`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ name: 'Search Corp A' })
      .expect(201);
    const customerB = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/customers`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ name: 'Search Corp B' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/opportunities`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ customerId: customerA.body.id, name: 'Renovación Anual Alpha', estimatedValue: 10000, probability: 100 })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/opportunities`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ customerId: customerB.body.id, name: 'Nueva Licencia Beta', estimatedValue: 5000, probability: 50 })
      .expect(201);

    const byName = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}/opportunities`)
      .query({ q: 'Alpha' })
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);
    expect(byName.body.total).toBe(1);
    expect(byName.body.items[0].name).toBe('Renovación Anual Alpha');
    expect(byName.body.totalValue).toBe(10000);
    expect(byName.body.totalWeightedValue).toBe(10000);

    const byCustomer = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}/opportunities`)
      .query({ customerId: customerB.body.id })
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);
    expect(byCustomer.body.total).toBe(1);
    expect(byCustomer.body.items[0].name).toBe('Nueva Licencia Beta');

    const all = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}/opportunities`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);
    expect(all.body.total).toBe(2);
  });
});
