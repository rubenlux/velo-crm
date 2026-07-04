import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createTestApp, resetDatabase } from '../test-app';

describe('Editing a Contact with a stale version is rejected (Edge Case, research.md #8)', () => {
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
    const owner = await registerAndLogin('contacts-stale-owner@example.com');
    const org = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .send({ name: 'Contacts Stale Org', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);
    const organizationId = org.body.id as string;
    const token = owner.body.accessToken as string;

    const customer = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/customers`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ name: 'Delta LLC' })
      .expect(201);
    const created = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/customers/${customer.body.id}/contacts`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ firstName: 'Concurrent', lastName: 'Contact', city: 'Mendoza' })
      .expect(201);
    const originalVersion = created.body.version as number;

    await request(app.getHttpServer())
      .patch(`/api/v1/organizations/${organizationId}/contacts/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ version: originalVersion, city: 'San Juan' })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/api/v1/organizations/${organizationId}/contacts/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ version: originalVersion, city: 'Neuquen' })
      .expect(409);

    const current = await prisma.contact.findUniqueOrThrow({ where: { id: created.body.id } });
    expect(current.city).toBe('San Juan');
    expect(current.version).toBe(2);
  });
});
