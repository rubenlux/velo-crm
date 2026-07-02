import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createTestApp, resetDatabase } from '../test-app';

describe('Organization tax settings and modules (US2, FR-006, FR-007)', () => {
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
      .send({ name: 'Modules Org', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);

    return { accessToken: login.body.accessToken as string, organizationId: org.body.id as string };
  }

  it('updates tax settings (Acceptance Scenario 2)', async () => {
    const { accessToken, organizationId } = await createOrganization('tax-owner@example.com');

    const response = await request(app.getHttpServer())
      .patch(`/api/v1/organizations/${organizationId}/tax-settings`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ taxSettings: { iva: 21 } })
      .expect(200);

    expect(response.body.taxSettings).toEqual({ iva: 21 });
  });

  it('enables a module available in the current plan (Acceptance Scenario 3)', async () => {
    const { accessToken, organizationId } = await createOrganization('modules-owner@example.com');

    const response = await request(app.getHttpServer())
      .patch(`/api/v1/organizations/${organizationId}/modules`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ enabledModules: ['crm'] })
      .expect(200);

    expect(response.body.enabledModules).toEqual(['crm']);
  });

  it('rejects enabling a module not included in the Free plan', async () => {
    const { accessToken, organizationId } = await createOrganization('modules-reject@example.com');

    await request(app.getHttpServer())
      .patch(`/api/v1/organizations/${organizationId}/modules`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ enabledModules: ['inventario'] })
      .expect(409);
  });
});
