import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../../src/shared/prisma/prisma.service';
import { createTestApp, resetDatabase } from '../../test-app';

/**
 * End-to-end walk of specs/006-users/quickstart.md across all four user stories:
 * edit profile/preferences -> Audit Log -> list/switch Organizations -> last-admin
 * invariant -> deactivate blocks Organization access -> access history.
 */
describe('E2E: Users quickstart (all user stories)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  afterAll(async () => {
    await resetDatabase(prisma);
    await app.close();
  });

  it('walks profile -> preferences -> audit log -> organizations -> lifecycle -> access history', async () => {
    const server = app.getHttpServer();

    // US1: edit profile + preferences, reflected immediately and audited.
    const ownerEmail = 'users-quickstart-owner@example.com';
    await request(server)
      .post('/api/v1/auth/register')
      .send({ email: ownerEmail, password: 'Sup3rSecret!' })
      .expect(201);
    const owner = await request(server)
      .post('/api/v1/auth/login')
      .set('User-Agent', 'quickstart-device-1')
      .send({ email: ownerEmail, password: 'Sup3rSecret!' })
      .expect(200);

    const me = await request(server)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .expect(200);
    expect(me.body).toMatchObject({ language: 'es', timezone: 'UTC', status: 'Active' });

    await request(server)
      .patch('/api/v1/users/me/profile')
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .send({ firstName: 'Quickstart' })
      .expect(200);

    await request(server)
      .patch('/api/v1/users/me/preferences')
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .send({ preferences: { notifications: { email: false } } })
      .expect(200);

    const myAuditLog = await request(server)
      .get('/api/v1/users/me/audit-log')
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .expect(200);
    expect(myAuditLog.body.length).toBeGreaterThanOrEqual(2);

    // US2: create two Organizations, list them, "switch" via header.
    const orgA = await request(server)
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .send({ name: 'Quickstart Org A', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);
    const orgB = await request(server)
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .send({ name: 'Quickstart Org B', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);

    const myOrgs = await request(server)
      .get('/api/v1/users/me/organizations')
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .expect(200);
    expect(myOrgs.body).toHaveLength(2);

    await request(server)
      .get(`/api/v1/organizations/${orgB.body.id}`)
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .set('X-Organization-Id', orgB.body.id)
      .expect(200);

    // US3: last-admin invariant blocks deactivating the sole owner of Org A.
    const ownerId = (await prisma.user.findUniqueOrThrow({ where: { email: ownerEmail } })).id;
    await request(server)
      .post(`/api/v1/organizations/${orgA.body.id}/members/${ownerId}/deactivate`)
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .set('X-Organization-Id', orgA.body.id)
      .expect(409);

    // Invite + accept a second member, then deactivate them; they lose Org access.
    const memberEmail = 'users-quickstart-member@example.com';
    await request(server)
      .post('/api/v1/auth/register')
      .send({ email: memberEmail, password: 'Sup3rSecret!' })
      .expect(201);
    const member = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: memberEmail, password: 'Sup3rSecret!' })
      .expect(200);

    const invitation = await request(server)
      .post(`/api/v1/organizations/${orgA.body.id}/invitations`)
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .set('X-Organization-Id', orgA.body.id)
      .send({ email: memberEmail, role: 'Ventas' })
      .expect(201);
    await request(server)
      .post(`/api/v1/auth/invitations/${invitation.body.invitationToken}/accept`)
      .set('Authorization', `Bearer ${member.body.accessToken}`)
      .expect(200);

    const memberId = (await prisma.user.findUniqueOrThrow({ where: { email: memberEmail } })).id;
    await request(server)
      .post(`/api/v1/organizations/${orgA.body.id}/members/${memberId}/deactivate`)
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .set('X-Organization-Id', orgA.body.id)
      .expect(200);

    // FR-012: login still works, but Organization data access is denied.
    const memberReLogin = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: memberEmail, password: 'Sup3rSecret!' })
      .expect(200);
    await request(server)
      .get(`/api/v1/organizations/${orgA.body.id}`)
      .set('Authorization', `Bearer ${memberReLogin.body.accessToken}`)
      .set('X-Organization-Id', orgA.body.id)
      .expect(403);

    // Reactivating restores access.
    await request(server)
      .post(`/api/v1/organizations/${orgA.body.id}/members/${memberId}/reactivate`)
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .set('X-Organization-Id', orgA.body.id)
      .expect(200);
    await request(server)
      .get(`/api/v1/organizations/${orgA.body.id}`)
      .set('Authorization', `Bearer ${memberReLogin.body.accessToken}`)
      .set('X-Organization-Id', orgA.body.id)
      .expect(200);

    // US4: access history reflects the owner's logins only.
    const history = await request(server)
      .get('/api/v1/users/me/access-history')
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .expect(200);
    expect(history.body.length).toBeGreaterThanOrEqual(1);
    expect(history.body.every((entry: { device: { userAgent: string } }) => entry.device.userAgent !== undefined)).toBe(
      true,
    );
  });
});
