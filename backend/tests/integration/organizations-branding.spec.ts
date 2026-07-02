import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createTestApp, resetDatabase } from '../test-app';

describe('Organization branding (US2, FR-004, FR-014)', () => {
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

  it('updates logo and custom domain (Acceptance Scenario 1)', async () => {
    const { accessToken, organizationId } = await createOrganization('branding-owner@example.com', 'Branded Org');

    const response = await request(app.getHttpServer())
      .patch(`/api/v1/organizations/${organizationId}/branding`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ logoUrl: 'https://cdn.example.com/logo.png', customDomain: 'branded.example.com' })
      .expect(200);

    expect(response.body).toMatchObject({
      logoUrl: 'https://cdn.example.com/logo.png',
      customDomain: 'branded.example.com',
    });
  });

  it('rejects a custom domain already used by another Organization (FR-014)', async () => {
    const orgA = await createOrganization('domain-a@example.com', 'Org A');
    const orgB = await createOrganization('domain-b@example.com', 'Org B');

    await request(app.getHttpServer())
      .patch(`/api/v1/organizations/${orgA.organizationId}/branding`)
      .set('Authorization', `Bearer ${orgA.accessToken}`)
      .set('X-Organization-Id', orgA.organizationId)
      .send({ customDomain: 'shared.example.com' })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/api/v1/organizations/${orgB.organizationId}/branding`)
      .set('Authorization', `Bearer ${orgB.accessToken}`)
      .set('X-Organization-Id', orgB.organizationId)
      .send({ customDomain: 'shared.example.com' })
      .expect(409);
  });
});
