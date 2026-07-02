import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createTestApp, resetDatabase } from '../test-app';

describe('GET/PATCH /api/v1/organizations/:id (contract)', () => {
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

  async function createOrganization(email: string) {
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password: 'Sup3rSecret!' })
      .expect(201);

    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: 'Sup3rSecret!' })
      .expect(200);

    const org = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send({ name: 'Acme SRL', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);

    return { accessToken: login.body.accessToken as string, organizationId: org.body.id as string };
  }

  it('returns the Organization configuration when Membership is valid (Acceptance Scenario 2)', async () => {
    const { accessToken, organizationId } = await createOrganization('get-owner@example.com');

    const response = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);

    expect(response.body).toMatchObject({ id: organizationId, name: 'Acme SRL' });
  });

  it('rejects a request without the X-Organization-Id header', async () => {
    const { accessToken, organizationId } = await createOrganization('get-no-header@example.com');

    await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(403);
  });

  it('updates name/timezone/currency/language as Propietario (Acceptance Scenario 3)', async () => {
    const { accessToken, organizationId } = await createOrganization('patch-owner@example.com');

    await request(app.getHttpServer())
      .patch(`/api/v1/organizations/${organizationId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ name: 'Acme Renombrada' })
      .expect(200);

    const response = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);

    expect(response.body.name).toBe('Acme Renombrada');
  });
});
