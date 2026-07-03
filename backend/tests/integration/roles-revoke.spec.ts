import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createTestApp, resetDatabase } from '../test-app';

describe('Revoke an additional Role from a Membership (US1, Acceptance Scenario 3)', () => {
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

  it('removes the immediate effect of a Role as soon as it is revoked', async () => {
    const owner = await registerAndLogin('revoke-owner@example.com');
    const org = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .send({ name: 'Revoke Role Org', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);
    const organizationId = org.body.id as string;
    const ownerToken = owner.body.accessToken as string;

    // Free plan caps at 3 users; this scenario needs owner + sales + 2 targets.
    await request(app.getHttpServer())
      .patch(`/api/v1/organizations/${organizationId}/plan`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ plan: 'Pro' })
      .expect(200);

    const salesToken = await inviteAndAccept(ownerToken, organizationId, 'revoke-sales@example.com', 'Ventas');
    await inviteAndAccept(ownerToken, organizationId, 'revoke-target-a@example.com', 'Lector');
    await inviteAndAccept(ownerToken, organizationId, 'revoke-target-b@example.com', 'Lector');
    const salesUserId = (await prisma.user.findUniqueOrThrow({ where: { email: 'revoke-sales@example.com' } })).id;
    const targetAId = (await prisma.user.findUniqueOrThrow({ where: { email: 'revoke-target-a@example.com' } })).id;
    const targetBId = (await prisma.user.findUniqueOrThrow({ where: { email: 'revoke-target-b@example.com' } })).id;

    const adminRole = await prisma.role.findFirstOrThrow({ where: { organizationId: null, name: 'Administrador' } });
    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/members/${salesUserId}/roles`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ roleId: adminRole.id })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/members/${targetAId}/deactivate`)
      .set('Authorization', `Bearer ${salesToken}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);

    await request(app.getHttpServer())
      .delete(`/api/v1/organizations/${organizationId}/members/${salesUserId}/roles/${adminRole.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .expect(204);

    const salesMembership = await prisma.membership.findUniqueOrThrow({
      where: { userId_organizationId: { userId: salesUserId, organizationId } },
    });
    const remaining = await prisma.roleAssignment.findUnique({
      where: { membershipId_roleId: { membershipId: salesMembership.id, roleId: adminRole.id } },
    });
    expect(remaining).toBeNull();

    // Same actor, fresh target, same action — now forbidden again with no code path
    // left granting user.manage.
    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/members/${targetBId}/deactivate`)
      .set('Authorization', `Bearer ${salesToken}`)
      .set('X-Organization-Id', organizationId)
      .expect(403);
  });
});
