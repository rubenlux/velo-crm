import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createTestApp, resetDatabase } from '../test-app';

describe('Create a Customer (US1, Acceptance Scenario 1)', () => {
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

  it('creates a Customer with core data and lists it in its Organization', async () => {
    const owner = await registerAndLogin('customers-create-owner@example.com');
    const org = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .send({ name: 'Customers Create Org', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);
    const organizationId = org.body.id as string;
    const ownerToken = owner.body.accessToken as string;

    const created = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/customers`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ name: 'Acme SRL', legalName: 'Acme Sociedad de Responsabilidad Limitada', taxId: '30-12345678-9' })
      .expect(201);

    expect(created.body).toMatchObject({
      organizationId,
      name: 'Acme SRL',
      legalName: 'Acme Sociedad de Responsabilidad Limitada',
      taxId: '30-12345678-9',
      status: 'active',
      version: 1,
    });

    const fetched = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}/customers/${created.body.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);

    expect(fetched.body.id).toBe(created.body.id);
  });
});
