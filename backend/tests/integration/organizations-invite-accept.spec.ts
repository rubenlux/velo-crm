import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createTestApp, resetDatabase } from '../test-app';

describe('Accept invitation (US3, closes spec 004 T064)', () => {
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
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password: 'Sup3rSecret!' })
      .expect(201);

    return request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: 'Sup3rSecret!' })
      .expect(200);
  }

  it('creates a Membership with the invited role when the invitation is accepted', async () => {
    const owner = await registerAndLogin('invite-accept-owner@example.com');
    const org = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .send({ name: 'Accept Org', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);

    const invitee = await registerAndLogin('invitee-accept@example.com');

    const invitation = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${org.body.id}/invitations`)
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .set('X-Organization-Id', org.body.id)
      .send({ email: 'invitee-accept@example.com', role: 'Ventas' })
      .expect(201);

    const accept = await request(app.getHttpServer())
      .post(`/api/v1/auth/invitations/${invitation.body.invitationToken}/accept`)
      .set('Authorization', `Bearer ${invitee.body.accessToken}`)
      .expect(200);

    expect(accept.body).toMatchObject({ organizationId: org.body.id, role: 'Ventas' });

    const inviteeOrgAccess = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${org.body.id}`)
      .set('Authorization', `Bearer ${invitee.body.accessToken}`)
      .set('X-Organization-Id', org.body.id)
      .expect(200);
    expect(inviteeOrgAccess.body.id).toBe(org.body.id);

    const invitationRecord = await prisma.organizationInvitation.findUnique({ where: { id: invitation.body.id } });
    expect(invitationRecord?.status).toBe('accepted');
  });

  it('rejects accepting an already-used invitation token', async () => {
    const owner = await registerAndLogin('invite-reuse-token-owner@example.com');
    const org = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .send({ name: 'Reuse Token Org', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);

    const invitee = await registerAndLogin('invitee-reuse-token@example.com');

    const invitation = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${org.body.id}/invitations`)
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .set('X-Organization-Id', org.body.id)
      .send({ email: 'invitee-reuse-token@example.com', role: 'Ventas' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/auth/invitations/${invitation.body.invitationToken}/accept`)
      .set('Authorization', `Bearer ${invitee.body.accessToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .post(`/api/v1/auth/invitations/${invitation.body.invitationToken}/accept`)
      .set('Authorization', `Bearer ${invitee.body.accessToken}`)
      .expect(400);
  });

  it('rejects accepting an invitation intended for a different email, and keeps it usable by the real recipient', async () => {
    const owner = await registerAndLogin('invite-wrong-email-owner@example.com');
    const org = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .send({ name: 'Wrong Email Org', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);

    const realInvitee = await registerAndLogin('real-invitee@example.com');
    const attacker = await registerAndLogin('attacker@example.com');

    const invitation = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${org.body.id}/invitations`)
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .set('X-Organization-Id', org.body.id)
      .send({ email: 'real-invitee@example.com', role: 'Ventas' })
      .expect(201);

    // Someone other than the invited email must not be able to redeem the token.
    await request(app.getHttpServer())
      .post(`/api/v1/auth/invitations/${invitation.body.invitationToken}/accept`)
      .set('Authorization', `Bearer ${attacker.body.accessToken}`)
      .expect(400);

    // The invitation must still be usable by its real recipient afterwards.
    await request(app.getHttpServer())
      .post(`/api/v1/auth/invitations/${invitation.body.invitationToken}/accept`)
      .set('Authorization', `Bearer ${realInvitee.body.accessToken}`)
      .expect(200);
  });
});
