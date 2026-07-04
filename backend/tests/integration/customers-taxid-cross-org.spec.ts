import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createTestApp, resetDatabase } from '../test-app';

describe('Same taxId across different Organizations is allowed (US1, Acceptance Scenario 4, RN-002)', () => {
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

  it('allows the same taxId to be used by two different Organizations', async () => {
    const ownerA = await registerAndLogin('customers-cross-org-a@example.com');
    const orgA = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${ownerA.body.accessToken}`)
      .send({ name: 'Org A', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);

    const ownerB = await registerAndLogin('customers-cross-org-b@example.com');
    const orgB = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${ownerB.body.accessToken}`)
      .send({ name: 'Org B', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${orgA.body.id}/customers`)
      .set('Authorization', `Bearer ${ownerA.body.accessToken}`)
      .set('X-Organization-Id', orgA.body.id)
      .send({ name: 'Customer A', taxId: '27-11111111-4' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${orgB.body.id}/customers`)
      .set('Authorization', `Bearer ${ownerB.body.accessToken}`)
      .set('X-Organization-Id', orgB.body.id)
      .send({ name: 'Customer B', taxId: '27-11111111-4' })
      .expect(201);
  });
});
