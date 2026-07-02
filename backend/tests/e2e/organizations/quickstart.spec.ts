import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../../src/shared/prisma/prisma.service';
import { createTestApp, resetDatabase } from '../../test-app';

/**
 * End-to-end walk of specs/005-organizations-multi-tenant/quickstart.md across all
 * five user stories: create -> configure -> isolate -> branding/modules -> invite ->
 * accept -> change plan -> suspend -> reactivate -> Audit Log.
 */
describe('E2E: Organizations (Multi-Tenant) quickstart (all user stories)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const adminEmail = 'org-quickstart-admin@example.com';

  beforeAll(async () => {
    process.env.PLATFORM_ADMIN_EMAILS = adminEmail;
    ({ app, prisma } = await createTestApp());
  });

  afterAll(async () => {
    delete process.env.PLATFORM_ADMIN_EMAILS;
    await resetDatabase(prisma);
    await app.close();
  });

  async function registerAndLogin(email: string) {
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password: 'Sup3rSecret!' })
      .expect(201);

    return request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: 'Sup3rSecret!' })
      .expect(200);
  }

  it('walks create -> configure -> isolate -> invite -> accept -> plan -> suspend -> reactivate', async () => {
    const server = app.getHttpServer();

    // US1: create + configure, and Propietario Membership is created automatically.
    const owner = await registerAndLogin('quickstart-owner@example.com');
    const org = await request(server)
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .send({ name: 'Quickstart Org', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);

    await request(server)
      .patch(`/api/v1/organizations/${org.body.id}`)
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .set('X-Organization-Id', org.body.id)
      .send({ name: 'Quickstart Org Renamed' })
      .expect(200);

    // Isolation: a second Organization's Users cannot read the first one.
    const otherOwner = await registerAndLogin('quickstart-other-owner@example.com');
    const otherOrg = await request(server)
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${otherOwner.body.accessToken}`)
      .send({ name: 'Other Org', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);

    await request(server)
      .get(`/api/v1/organizations/${org.body.id}`)
      .set('Authorization', `Bearer ${otherOwner.body.accessToken}`)
      .set('X-Organization-Id', org.body.id)
      .expect(403);

    // US2: branding + modules, gated by the current (Free) plan.
    await request(server)
      .patch(`/api/v1/organizations/${org.body.id}/branding`)
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .set('X-Organization-Id', org.body.id)
      .send({ customDomain: 'quickstart.example.com' })
      .expect(200);

    await request(server)
      .patch(`/api/v1/organizations/${org.body.id}/modules`)
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .set('X-Organization-Id', org.body.id)
      .send({ enabledModules: ['crm'] })
      .expect(200);

    // US3: invite -> accept, closing spec 004's deferred T064.
    const invitee = await registerAndLogin('quickstart-invitee@example.com');
    const invitation = await request(server)
      .post(`/api/v1/organizations/${org.body.id}/invitations`)
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .set('X-Organization-Id', org.body.id)
      .send({ email: 'quickstart-invitee@example.com', role: 'Ventas' })
      .expect(201);

    await request(server)
      .post(`/api/v1/auth/invitations/${invitation.body.invitationToken}/accept`)
      .set('Authorization', `Bearer ${invitee.body.accessToken}`)
      .expect(200);

    await request(server)
      .get(`/api/v1/organizations/${org.body.id}`)
      .set('Authorization', `Bearer ${invitee.body.accessToken}`)
      .set('X-Organization-Id', org.body.id)
      .expect(200);

    // US4: upgrade plan to unlock more modules.
    await request(server)
      .patch(`/api/v1/organizations/${org.body.id}/plan`)
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .set('X-Organization-Id', org.body.id)
      .send({ plan: 'Pro' })
      .expect(200);

    // US5: suspend (platform admin only) blocks access, reactivate restores it.
    const admin = await registerAndLogin(adminEmail);
    await request(server)
      .post(`/api/v1/organizations/${org.body.id}/suspend`)
      .set('Authorization', `Bearer ${admin.body.accessToken}`)
      .expect(200);

    await request(server)
      .get(`/api/v1/organizations/${org.body.id}`)
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .set('X-Organization-Id', org.body.id)
      .expect(403);

    await request(server)
      .post(`/api/v1/organizations/${org.body.id}/reactivate`)
      .set('Authorization', `Bearer ${admin.body.accessToken}`)
      .expect(200);

    const finalState = await request(server)
      .get(`/api/v1/organizations/${org.body.id}`)
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .set('X-Organization-Id', org.body.id)
      .expect(200);
    expect(finalState.body).toMatchObject({
      name: 'Quickstart Org Renamed',
      plan: 'Pro',
      status: 'active',
      customDomain: 'quickstart.example.com',
    });

    // Every lifecycle action is in the Audit Log (FR-013, SC-004).
    const auditLog = await request(server)
      .get(`/api/v1/organizations/${org.body.id}/audit-log`)
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .set('X-Organization-Id', org.body.id)
      .expect(200);

    const actions = auditLog.body.map((entry: { action: string }) => entry.action);
    expect(actions).toEqual(
      expect.arrayContaining([
        'OrganizationCreated',
        'OrganizationUpdated',
        'MemberInvited',
        'InvitationAccepted',
        'PlanChanged',
        'OrganizationSuspended',
        'OrganizationReactivated',
      ]),
    );

    // otherOrg stays fully isolated throughout.
    const otherOrgState = await request(server)
      .get(`/api/v1/organizations/${otherOrg.body.id}`)
      .set('Authorization', `Bearer ${otherOwner.body.accessToken}`)
      .set('X-Organization-Id', otherOrg.body.id)
      .expect(200);
    expect(otherOrgState.body.name).toBe('Other Org');
  });
});
