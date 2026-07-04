import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createTestApp, resetDatabase } from '../test-app';

describe('Concurrent conversion attempts on the same Lead (Edge Case, research.md #11)', () => {
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

  it('results in exactly one Customer/Contact/Opportunity created', async () => {
    const owner = await registerAndLogin('leads-convert-race-owner@example.com');
    const token = owner.body.accessToken as string;
    const org = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Leads Convert Race Org', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);
    const organizationId = org.body.id as string;

    const lead = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/leads`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ name: 'Carrera Conversion' })
      .expect(201);

    const attempts = await Promise.all(
      Array.from({ length: 5 }, () =>
        request(app.getHttpServer())
          .post(`/api/v1/organizations/${organizationId}/leads/${lead.body.id}/convert`)
          .set('Authorization', `Bearer ${token}`)
          .set('X-Organization-Id', organizationId)
          .send({}),
      ),
    );

    const succeeded = attempts.filter((res) => res.status === 201);
    const conflicted = attempts.filter((res) => res.status === 409);
    expect(succeeded).toHaveLength(1);
    expect(conflicted).toHaveLength(4);

    const customers = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}/customers`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);
    expect(customers.body.items).toHaveLength(1);

    const contacts = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}/contacts`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);
    expect(contacts.body.items).toHaveLength(1);
  });
});
