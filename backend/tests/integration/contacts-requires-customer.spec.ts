import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createTestApp, resetDatabase } from '../test-app';

describe('A Contact cannot be created without a valid Customer (RN-001, FR-002)', () => {
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

  it('rejects creation under a Customer id that does not exist in this Organization', async () => {
    const owner = await registerAndLogin('contacts-requires-customer-owner@example.com');
    const org = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .send({ name: 'Requires Customer Org', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);
    const organizationId = org.body.id as string;

    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/customers/00000000-0000-0000-0000-000000000000/contacts`)
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ firstName: 'No', lastName: 'Customer' })
      .expect(400);
  });
});
