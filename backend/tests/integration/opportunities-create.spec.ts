import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createTestApp, resetDatabase } from '../test-app';

describe('Crear una Opportunity manual (US1, Acceptance Scenario 1)', () => {
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

  it('crea la Oportunidad en la etapa Nueva del Pipeline por defecto, state Abierta', async () => {
    const owner = await registerAndLogin('opportunities-create-owner@example.com');
    const token = owner.body.accessToken as string;
    const org = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Opportunities Create Org', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);
    const organizationId = org.body.id as string;

    const customer = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/customers`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ name: 'Acme SRL' })
      .expect(201);

    const created = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/opportunities`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ customerId: customer.body.id, name: 'Venta anual Acme', ownerUserId: owner.body.user.id })
      .expect(201);

    expect(created.body).toMatchObject({ name: 'Venta anual Acme', customerId: customer.body.id, state: 'Abierta' });
    expect(created.body.stage.name).toBe('Nueva');
    expect(created.body.pipeline.isDefault).toBe(true);

    const fetched = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}/opportunities/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);
    expect(fetched.body.id).toBe(created.body.id);
  });
});
