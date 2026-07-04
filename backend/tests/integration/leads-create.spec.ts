import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createTestApp, resetDatabase } from '../test-app';

describe('Create a Lead (US1, Acceptance Scenario 1)', () => {
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

  it('creates a Lead in status Nuevo with a responsable when provided', async () => {
    const owner = await registerAndLogin('leads-create-owner@example.com');
    const token = owner.body.accessToken as string;
    const org = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Leads Create Org', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);
    const organizationId = org.body.id as string;

    const created = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/leads`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ name: 'Juan Perez', company: 'Acme SRL', email: 'juan@acme.com', source: 'SitioWeb', ownerUserId: owner.body.user.id })
      .expect(201);

    expect(created.body).toMatchObject({
      name: 'Juan Perez',
      company: 'Acme SRL',
      status: 'Nuevo',
      ownerUserId: owner.body.user.id,
    });

    const fetched = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}/leads/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);
    expect(fetched.body.id).toBe(created.body.id);
  });
});
