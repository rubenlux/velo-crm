import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createTestApp, resetDatabase } from '../test-app';

describe('Leads are isolated per Organization (FR-017)', () => {
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

  it('never exposes a Lead from a different Organization', async () => {
    const ownerA = await registerAndLogin('leads-cross-org-a@example.com');
    const orgA = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${ownerA.body.accessToken}`)
      .send({ name: 'Org A', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);

    const ownerB = await registerAndLogin('leads-cross-org-b@example.com');
    const orgB = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${ownerB.body.accessToken}`)
      .send({ name: 'Org B', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);

    const lead = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${orgA.body.id}/leads`)
      .set('Authorization', `Bearer ${ownerA.body.accessToken}`)
      .set('X-Organization-Id', orgA.body.id)
      .send({ name: 'Org A Lead' })
      .expect(201);

    await request(app.getHttpServer())
      .get(`/api/v1/organizations/${orgB.body.id}/leads/${lead.body.id}`)
      .set('Authorization', `Bearer ${ownerB.body.accessToken}`)
      .set('X-Organization-Id', orgB.body.id)
      .expect(404);

    const list = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${orgB.body.id}/leads`)
      .set('Authorization', `Bearer ${ownerB.body.accessToken}`)
      .set('X-Organization-Id', orgB.body.id)
      .expect(200);
    expect(list.body.items).toHaveLength(0);
  });
});
