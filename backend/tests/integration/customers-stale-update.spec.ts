import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createTestApp, resetDatabase } from '../test-app';

describe('Editing with a stale version is rejected without corrupting the record (Edge Case, research.md #8)', () => {
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

  it('rejects a second concurrent edit sent with the original (now stale) version', async () => {
    const owner = await registerAndLogin('customers-stale-owner@example.com');
    const org = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .send({ name: 'Stale Update Org', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);
    const organizationId = org.body.id as string;
    const ownerToken = owner.body.accessToken as string;

    const created = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/customers`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ name: 'Concurrent Customer', city: 'Buenos Aires' })
      .expect(201);
    const originalVersion = created.body.version as number;

    // First session succeeds and moves the version forward.
    await request(app.getHttpServer())
      .patch(`/api/v1/organizations/${organizationId}/customers/${created.body.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ version: originalVersion, city: 'Cordoba' })
      .expect(200);

    // Second session still holds the original version.
    await request(app.getHttpServer())
      .patch(`/api/v1/organizations/${organizationId}/customers/${created.body.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ version: originalVersion, city: 'Rosario' })
      .expect(409);

    const current = await prisma.customer.findUniqueOrThrow({ where: { id: created.body.id } });
    expect(current.city).toBe('Cordoba');
    expect(current.version).toBe(2);
  });
});
