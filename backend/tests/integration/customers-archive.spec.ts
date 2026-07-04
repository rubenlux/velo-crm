import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createTestApp, resetDatabase } from '../test-app';

describe('Archive a Customer (US3, Acceptance Scenario 1, RN-004/FR-011)', () => {
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

  it('moves the Customer to archived without losing any data or history', async () => {
    const owner = await registerAndLogin('customers-archive-owner@example.com');
    const org = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .send({ name: 'Archive Org', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);
    const organizationId = org.body.id as string;
    const token = owner.body.accessToken as string;

    const created = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/customers`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ name: 'Archive Me', email: 'archived@example.com' })
      .expect(201);

    const archived = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/customers/${created.body.id}/archive`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);

    expect(archived.body.status).toBe('archived');
    expect(archived.body.email).toBe('archived@example.com');
    expect(archived.body.name).toBe('Archive Me');
  });
});
