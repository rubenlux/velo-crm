import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createTestApp, resetDatabase } from '../test-app';

describe('Grant/revoke a direct Permission without an intermediate Role (US1, research.md #6)', () => {
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

  it('reflects a direct Permission grant/revoke on effective access without any Role change', async () => {
    const owner = await registerAndLogin('direct-owner@example.com');
    const org = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .send({ name: 'Direct Permission Org', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);
    const organizationId = org.body.id as string;
    const ownerToken = owner.body.accessToken as string;

    const salesToken = await inviteAndAccept(ownerToken, organizationId, 'direct-sales@example.com', 'Ventas');
    await inviteAndAccept(ownerToken, organizationId, 'direct-target@example.com', 'Lector');
    const salesUserId = (await prisma.user.findUniqueOrThrow({ where: { email: 'direct-sales@example.com' } })).id;
    const targetId = (await prisma.user.findUniqueOrThrow({ where: { email: 'direct-target@example.com' } })).id;

    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/members/${targetId}/deactivate`)
      .set('Authorization', `Bearer ${salesToken}`)
      .set('X-Organization-Id', organizationId)
      .expect(403);

    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/members/${salesUserId}/permissions`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ permission: 'user.manage' })
      .expect(201);

    const salesMembership = await prisma.membership.findUniqueOrThrow({
      where: { userId_organizationId: { userId: salesUserId, organizationId } },
    });
    const grant = await prisma.membershipPermission.findUnique({
      where: { membershipId_permission: { membershipId: salesMembership.id, permission: 'user.manage' } },
    });
    expect(grant).not.toBeNull();

    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/members/${targetId}/deactivate`)
      .set('Authorization', `Bearer ${salesToken}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);

    await request(app.getHttpServer())
      .delete(`/api/v1/organizations/${organizationId}/members/${salesUserId}/permissions/user.manage`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .expect(204);

    const revoked = await prisma.membershipPermission.findUnique({
      where: { membershipId_permission: { membershipId: salesMembership.id, permission: 'user.manage' } },
    });
    expect(revoked).toBeNull();
  });
});
