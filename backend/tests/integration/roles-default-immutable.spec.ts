import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createTestApp, resetDatabase } from '../test-app';

describe('A default Role cannot be edited or deleted (US3, Acceptance Scenario 5, FR-007)', () => {
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

  it('rejects PATCH and DELETE on a default Role', async () => {
    const owner = await registerAndLogin('default-immutable-owner@example.com');
    const org = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .send({ name: 'Default Immutable Org', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);
    const organizationId = org.body.id as string;
    const ownerToken = owner.body.accessToken as string;

    const ventasRole = await prisma.role.findFirstOrThrow({ where: { organizationId: null, name: 'Ventas' } });

    await request(app.getHttpServer())
      .patch(`/api/v1/organizations/${organizationId}/roles/${ventasRole.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ permissions: ['organization.manage'] })
      .expect(403);

    await request(app.getHttpServer())
      .delete(`/api/v1/organizations/${organizationId}/roles/${ventasRole.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .expect(403);

    const unchanged = await prisma.role.findUniqueOrThrow({ where: { id: ventasRole.id } });
    expect(unchanged.permissions).toEqual(ventasRole.permissions);
  });
});
