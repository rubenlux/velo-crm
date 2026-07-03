import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createTestApp, resetDatabase } from '../test-app';

describe('View own effective permissions (US2, Acceptance Scenario 1)', () => {
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

  it('matches exactly the permissions of the assigned Role', async () => {
    const owner = await registerAndLogin('effective-owner@example.com');
    const org = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .send({ name: 'Effective Permissions Org', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);
    const organizationId = org.body.id as string;
    const ownerToken = owner.body.accessToken as string;

    const invitation = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/invitations`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ email: 'effective-sales@example.com', role: 'Ventas' })
      .expect(201);
    const salesLogin = await registerAndLogin('effective-sales@example.com');
    await request(app.getHttpServer())
      .post(`/api/v1/auth/invitations/${invitation.body.invitationToken}/accept`)
      .set('Authorization', `Bearer ${salesLogin.body.accessToken}`)
      .expect(200);
    const salesUserId = (await prisma.user.findUniqueOrThrow({ where: { email: 'effective-sales@example.com' } })).id;

    const ventasRole = await prisma.role.findFirstOrThrow({ where: { organizationId: null, name: 'Ventas' } });

    const response = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}/members/${salesUserId}/effective-permissions`)
      .set('Authorization', `Bearer ${salesLogin.body.accessToken}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);

    expect(response.body.userId).toBe(salesUserId);
    expect(new Set(response.body.permissions)).toEqual(new Set(ventasRole.permissions));
  });

  it('reflects a direct Permission grant in addition to the Role permissions (Acceptance Scenario 2)', async () => {
    const owner = await registerAndLogin('effective-direct-owner@example.com');
    const org = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .send({ name: 'Effective Direct Org', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);
    const organizationId = org.body.id as string;
    const ownerToken = owner.body.accessToken as string;

    const invitation = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/invitations`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ email: 'effective-direct-sales@example.com', role: 'Ventas' })
      .expect(201);
    const salesLogin = await registerAndLogin('effective-direct-sales@example.com');
    await request(app.getHttpServer())
      .post(`/api/v1/auth/invitations/${invitation.body.invitationToken}/accept`)
      .set('Authorization', `Bearer ${salesLogin.body.accessToken}`)
      .expect(200);
    const salesUserId = (
      await prisma.user.findUniqueOrThrow({ where: { email: 'effective-direct-sales@example.com' } })
    ).id;

    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/members/${salesUserId}/permissions`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ permission: 'invoice.read' })
      .expect(201);

    const response = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}/members/${salesUserId}/effective-permissions`)
      .set('Authorization', `Bearer ${salesLogin.body.accessToken}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);

    expect(response.body.permissions).toEqual(expect.arrayContaining(['invoice.read']));
  });
});
