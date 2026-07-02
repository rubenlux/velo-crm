import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createTestApp, resetDatabase } from '../test-app';

describe('POST /api/v1/organizations (contract)', () => {
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
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password: 'Sup3rSecret!' })
      .expect(201);

    return request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: 'Sup3rSecret!' })
      .expect(200);
  }

  it('creates an Organization and makes the creator its Propietario (FR-001, FR-002)', async () => {
    const login = await registerAndLogin('owner@example.com');

    const response = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send({ name: 'Acme SRL', timezone: 'America/Argentina/Buenos_Aires', currency: 'ARS', language: 'es' })
      .expect(201);

    expect(response.body).toMatchObject({
      name: 'Acme SRL',
      timezone: 'America/Argentina/Buenos_Aires',
      currency: 'ARS',
      language: 'es',
      plan: 'Free',
      status: 'active',
    });

    const memberships = await prisma.membership.findMany({ where: { organizationId: response.body.id } });
    expect(memberships).toHaveLength(1);
    expect(memberships[0].role).toBe('Propietario');
  });

  it('rejects a request missing required fields', async () => {
    const login = await registerAndLogin('owner-invalid@example.com');

    await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send({ name: 'Acme SRL' })
      .expect(400);
  });

  it('rejects unauthenticated requests', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .send({ name: 'Acme SRL', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(401);
  });
});
