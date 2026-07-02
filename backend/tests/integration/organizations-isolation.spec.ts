import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createTestApp, resetDatabase } from '../test-app';

describe('Organizations multi-tenant isolation (US1, FR-011)', () => {
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

  async function createOrganization(email: string, name: string) {
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
      .send({ name, timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);

    return { accessToken: login.body.accessToken as string, organizationId: org.body.id as string };
  }

  it('denies a User without Membership from reading another Organization (Acceptance Scenario 4)', async () => {
    const orgA = await createOrganization('org-a-owner@example.com', 'Org A');
    const orgB = await createOrganization('org-b-owner@example.com', 'Org B');

    await request(app.getHttpServer())
      .get(`/api/v1/organizations/${orgA.organizationId}`)
      .set('Authorization', `Bearer ${orgB.accessToken}`)
      .set('X-Organization-Id', orgA.organizationId)
      .expect(403);
  });

  it('denies updating another Organization even with a valid header for a different one', async () => {
    const orgA = await createOrganization('org-a-owner-2@example.com', 'Org A');
    const orgB = await createOrganization('org-b-owner-2@example.com', 'Org B');

    // Confused-deputy attempt: valid header for own Organization B, path targets Organization A.
    await request(app.getHttpServer())
      .patch(`/api/v1/organizations/${orgA.organizationId}`)
      .set('Authorization', `Bearer ${orgB.accessToken}`)
      .set('X-Organization-Id', orgB.organizationId)
      .send({ name: 'Hijacked' })
      .expect(403);

    const untouched = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${orgA.organizationId}`)
      .set('Authorization', `Bearer ${orgA.accessToken}`)
      .set('X-Organization-Id', orgA.organizationId)
      .expect(200);
    expect(untouched.body.name).toBe('Org A');
  });
});
