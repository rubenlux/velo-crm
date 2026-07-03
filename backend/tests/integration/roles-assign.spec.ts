import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createTestApp, resetDatabase } from '../test-app';

describe('Assign a second Role to a Membership (US1, Acceptance Scenario 1-2, SC-001)', () => {
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

  it('grants the union of permissions immediately once a second Role is assigned', async () => {
    const owner = await registerAndLogin('assign-owner@example.com');
    const org = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .send({ name: 'Assign Role Org', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);
    const organizationId = org.body.id as string;
    const ownerToken = owner.body.accessToken as string;

    const salesToken = await inviteAndAccept(ownerToken, organizationId, 'assign-sales@example.com', 'Ventas');
    await inviteAndAccept(ownerToken, organizationId, 'assign-target@example.com', 'Lector');
    const targetId = (await prisma.user.findUniqueOrThrow({ where: { email: 'assign-target@example.com' } })).id;

    // Baseline: a Ventas Membership has no user.manage, cannot deactivate anyone.
    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/members/${targetId}/deactivate`)
      .set('Authorization', `Bearer ${salesToken}`)
      .set('X-Organization-Id', organizationId)
      .expect(403);

    const adminRole = await prisma.role.findFirstOrThrow({ where: { organizationId: null, name: 'Administrador' } });
    const salesUserId = (await prisma.user.findUniqueOrThrow({ where: { email: 'assign-sales@example.com' } })).id;
    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/members/${salesUserId}/roles`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ roleId: adminRole.id })
      .expect(201);

    const salesMembership = await prisma.membership.findUniqueOrThrow({
      where: { userId_organizationId: { userId: salesUserId, organizationId } },
    });
    const assignment = await prisma.roleAssignment.findUnique({
      where: { membershipId_roleId: { membershipId: salesMembership.id, roleId: adminRole.id } },
    });
    expect(assignment).not.toBeNull();

    // With the second Role (Administrador, which includes user.manage) assigned, the
    // exact same action that was forbidden a moment ago now succeeds — immediately,
    // without re-login (SC-001: reflected in under 3 seconds).
    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/members/${targetId}/deactivate`)
      .set('Authorization', `Bearer ${salesToken}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);
  });
});
