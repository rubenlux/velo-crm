import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createTestApp, resetDatabase } from '../test-app';

describe('Available Permissions reflect the enabled modules of the Organization (US4, Acceptance Scenario 1-2)', () => {
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

  it('excludes a disabled module and includes it again once re-enabled', async () => {
    const owner = await registerAndLogin('available-permissions-owner@example.com');
    const org = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .send({ name: 'Available Permissions Org', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);
    const organizationId = org.body.id as string;
    const ownerToken = owner.body.accessToken as string;

    // A freshly created Organization has enabledModules = [] (spec 005 default) —
    // only platform-level permissions (module: null) are available until a module is
    // explicitly enabled.
    let catalog = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}/permissions/catalog`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);
    expect(catalog.body.some((p: { key: string }) => p.key === 'user.manage')).toBe(true);
    expect(catalog.body.some((p: { key: string }) => p.key === 'lead.create')).toBe(false);
    expect(catalog.body.some((p: { key: string }) => p.key === 'product.read')).toBe(false);

    await request(app.getHttpServer())
      .patch(`/api/v1/organizations/${organizationId}/modules`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ enabledModules: ['crm'] })
      .expect(200);

    catalog = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}/permissions/catalog`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);
    expect(catalog.body.some((p: { key: string }) => p.key === 'lead.create')).toBe(true);
    expect(catalog.body.some((p: { key: string }) => p.key === 'product.read')).toBe(false);

    await request(app.getHttpServer())
      .patch(`/api/v1/organizations/${organizationId}/plan`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ plan: 'Enterprise' })
      .expect(200);
    await request(app.getHttpServer())
      .patch(`/api/v1/organizations/${organizationId}/modules`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ enabledModules: ['crm', 'inventario'] })
      .expect(200);

    catalog = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}/permissions/catalog`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);
    expect(catalog.body.some((p: { key: string }) => p.key === 'product.read')).toBe(true);

    await request(app.getHttpServer())
      .patch(`/api/v1/organizations/${organizationId}/modules`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ enabledModules: ['crm'] })
      .expect(200);

    catalog = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}/permissions/catalog`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);
    expect(catalog.body.some((p: { key: string }) => p.key === 'product.read')).toBe(false);
  });
});
