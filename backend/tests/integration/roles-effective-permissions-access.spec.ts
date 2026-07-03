import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createTestApp, resetDatabase } from '../test-app';

describe('Access control for viewing another Member effective permissions (US2, Acceptance Scenario 3)', () => {
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

  async function inviteAndAccept(ownerToken: string, organizationId: string, email: string, role: string) {
    const invitation = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/invitations`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ email, role })
      .expect(201);
    const login = await registerAndLogin(email);
    await request(app.getHttpServer())
      .post(`/api/v1/auth/invitations/${invitation.body.invitationToken}/accept`)
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200);
    return login.body.accessToken as string;
  }

  it('allows an Administrador (role.manage) to view another Member permissions, and denies a Member without it', async () => {
    const owner = await registerAndLogin('access-owner@example.com');
    const org = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .send({ name: 'Effective Access Org', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);
    const organizationId = org.body.id as string;
    const ownerToken = owner.body.accessToken as string;

    await request(app.getHttpServer())
      .patch(`/api/v1/organizations/${organizationId}/plan`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ plan: 'Pro' })
      .expect(200);

    const salesToken = await inviteAndAccept(ownerToken, organizationId, 'access-sales@example.com', 'Ventas');
    const adminToken = await inviteAndAccept(ownerToken, organizationId, 'access-admin@example.com', 'Administrador');
    const salesUserId = (await prisma.user.findUniqueOrThrow({ where: { email: 'access-sales@example.com' } })).id;

    // Owner (Propietario, bypass) can view anyone's.
    await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}/members/${salesUserId}/effective-permissions`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);

    // Administrador (has role.manage by default) can view someone else's.
    await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}/members/${salesUserId}/effective-permissions`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);

    // A Ventas Member (no role.manage) can view their own...
    await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}/members/${salesUserId}/effective-permissions`)
      .set('Authorization', `Bearer ${salesToken}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);

    // ...but not someone else's.
    const adminUserId = (await prisma.user.findUniqueOrThrow({ where: { email: 'access-admin@example.com' } })).id;
    await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}/members/${adminUserId}/effective-permissions`)
      .set('Authorization', `Bearer ${salesToken}`)
      .set('X-Organization-Id', organizationId)
      .expect(403);
  });
});
