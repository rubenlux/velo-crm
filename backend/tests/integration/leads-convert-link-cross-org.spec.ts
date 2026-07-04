import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createTestApp, resetDatabase } from '../test-app';

describe('Converting cannot link to a Customer/Contact from another Organization (security)', () => {
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

  it('rejects linkToExistingCustomerId pointing at a Customer from a different Organization', async () => {
    const ownerA = await registerAndLogin('leads-convert-link-cross-org-a@example.com');
    const orgA = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${ownerA.body.accessToken}`)
      .send({ name: 'Cross Org Link A', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);

    const ownerB = await registerAndLogin('leads-convert-link-cross-org-b@example.com');
    const orgB = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${ownerB.body.accessToken}`)
      .send({ name: 'Cross Org Link B', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);

    const foreignCustomer = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${orgB.body.id}/customers`)
      .set('Authorization', `Bearer ${ownerB.body.accessToken}`)
      .set('X-Organization-Id', orgB.body.id)
      .send({ name: 'Foreign Corp' })
      .expect(201);

    const lead = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${orgA.body.id}/leads`)
      .set('Authorization', `Bearer ${ownerA.body.accessToken}`)
      .set('X-Organization-Id', orgA.body.id)
      .send({ name: 'Cross Org Attempt' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${orgA.body.id}/leads/${lead.body.id}/convert`)
      .set('Authorization', `Bearer ${ownerA.body.accessToken}`)
      .set('X-Organization-Id', orgA.body.id)
      .send({ linkToExistingCustomerId: foreignCustomer.body.id })
      .expect(400);

    const customersInOrgA = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${orgA.body.id}/customers`)
      .set('Authorization', `Bearer ${ownerA.body.accessToken}`)
      .set('X-Organization-Id', orgA.body.id)
      .expect(200);
    expect(customersInOrgA.body.items).toHaveLength(0);
  });
});
