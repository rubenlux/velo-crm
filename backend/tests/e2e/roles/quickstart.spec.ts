import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../../src/shared/prisma/prisma.service';
import { createTestApp, resetDatabase } from '../../test-app';

/**
 * End-to-end walk of specs/007-roles-permissions/quickstart.md: assign/revoke a
 * second Role, deny an unpermitted action end-to-end against the retrofitted spec 006
 * endpoint, reject privilege escalation, and confirm every step lands in the Audit Log.
 */
describe('E2E: Roles & Permissions quickstart (US1, FR-013, FR-014)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  afterAll(async () => {
    await resetDatabase(prisma);
    await app.close();
  });

  async function registerAndLogin(email: string) {
    await request(app.getHttpServer()).post('/api/v1/auth/register').send({ email, password: 'Sup3rSecret!' }).expect(201);
    return request(app.getHttpServer()).post('/api/v1/auth/login').send({ email, password: 'Sup3rSecret!' }).expect(200);
  }

  it('walks assign -> effective-permissions -> revoke -> permission-denied -> escalation -> audit log', async () => {
    const server = app.getHttpServer();

    const owner = await registerAndLogin('roles-quickstart-owner@example.com');
    const org = await request(server)
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .send({ name: 'Roles Quickstart Org', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);
    const organizationId = org.body.id as string;
    const ownerToken = owner.body.accessToken as string;

    await request(server)
      .patch(`/api/v1/organizations/${organizationId}/plan`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ plan: 'Pro' })
      .expect(200);

    const invitation = await request(server)
      .post(`/api/v1/organizations/${organizationId}/invitations`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ email: 'roles-quickstart-sales@example.com', role: 'Ventas' })
      .expect(201);
    const salesLogin = await registerAndLogin('roles-quickstart-sales@example.com');
    await request(server)
      .post(`/api/v1/auth/invitations/${invitation.body.invitationToken}/accept`)
      .set('Authorization', `Bearer ${salesLogin.body.accessToken}`)
      .expect(200);
    const salesToken = salesLogin.body.accessToken as string;
    const salesUserId = (
      await prisma.user.findUniqueOrThrow({ where: { email: 'roles-quickstart-sales@example.com' } })
    ).id;

    const targetInvitation = await request(server)
      .post(`/api/v1/organizations/${organizationId}/invitations`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ email: 'roles-quickstart-target@example.com', role: 'Lector' })
      .expect(201);
    const targetLogin = await registerAndLogin('roles-quickstart-target@example.com');
    await request(server)
      .post(`/api/v1/auth/invitations/${targetInvitation.body.invitationToken}/accept`)
      .set('Authorization', `Bearer ${targetLogin.body.accessToken}`)
      .expect(200);
    const targetUserId = (
      await prisma.user.findUniqueOrThrow({ where: { email: 'roles-quickstart-target@example.com' } })
    ).id;

    // Step 1: Ventas effective permissions include lead.create, not user.manage.
    const baseline = await request(server)
      .get(`/api/v1/organizations/${organizationId}/members/${salesUserId}/effective-permissions`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);
    expect(baseline.body.permissions).toEqual(expect.arrayContaining(['lead.create']));
    expect(baseline.body.permissions).not.toEqual(expect.arrayContaining(['user.manage']));

    // Step 2: assign Contabilidad, effective permissions grow immediately.
    const contabilidadRole = await prisma.role.findFirstOrThrow({
      where: { organizationId: null, name: 'Contabilidad' },
    });
    await request(server)
      .post(`/api/v1/organizations/${organizationId}/members/${salesUserId}/roles`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ roleId: contabilidadRole.id })
      .expect(201);

    const afterAssign = await request(server)
      .get(`/api/v1/organizations/${organizationId}/members/${salesUserId}/effective-permissions`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);
    expect(afterAssign.body.permissions).toEqual(expect.arrayContaining(contabilidadRole.permissions));

    // Step 3: revoke Contabilidad, its permissions disappear immediately.
    await request(server)
      .delete(`/api/v1/organizations/${organizationId}/members/${salesUserId}/roles/${contabilidadRole.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .expect(204);

    const afterRevoke = await request(server)
      .get(`/api/v1/organizations/${organizationId}/members/${salesUserId}/effective-permissions`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);
    expect(afterRevoke.body.permissions).not.toEqual(expect.arrayContaining(['invoice.read']));

    // Step 4: Ventas (no user.manage) cannot deactivate another Member — 403,
    // audited as PermissionDenied (spec 006's endpoint, retrofitted per research.md #7).
    await request(server)
      .post(`/api/v1/organizations/${organizationId}/members/${targetUserId}/deactivate`)
      .set('Authorization', `Bearer ${salesToken}`)
      .set('X-Organization-Id', organizationId)
      .expect(403);

    // Step 5: privilege escalation — grant role.manage directly, then attempt to
    // assign a Role (Administrador) with far more permissions than the actor holds.
    await request(server)
      .post(`/api/v1/organizations/${organizationId}/members/${salesUserId}/permissions`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ permission: 'role.manage' })
      .expect(201);
    const adminRole = await prisma.role.findFirstOrThrow({ where: { organizationId: null, name: 'Administrador' } });
    await request(server)
      .post(`/api/v1/organizations/${organizationId}/members/${targetUserId}/roles`)
      .set('Authorization', `Bearer ${salesToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ roleId: adminRole.id })
      .expect(403);

    // Step 6: every mutation above is in the Audit Log.
    const auditLog = await request(server)
      .get(`/api/v1/organizations/${organizationId}/audit-log`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);
    const actions = auditLog.body.map((entry: { action: string }) => entry.action);
    expect(actions).toEqual(
      expect.arrayContaining(['RoleAssigned', 'RoleRevoked', 'PermissionDenied', 'PermissionGranted']),
    );
  });
});
