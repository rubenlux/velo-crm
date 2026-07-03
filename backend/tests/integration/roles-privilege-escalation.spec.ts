import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createTestApp, resetDatabase } from '../test-app';

describe('Privilege escalation is rejected when assigning Roles/Permissions (US1, FR-013, SC-003)', () => {
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

  it('rejects granting a Role with more permissions than the actor themselves holds, but allows a subset', async () => {
    const owner = await registerAndLogin('escalation-owner@example.com');
    const org = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .send({ name: 'Escalation Org', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);
    const organizationId = org.body.id as string;
    const ownerToken = owner.body.accessToken as string;

    // A Ventas Membership normally can't reach the roles endpoints at all
    // (no role.manage) — the Owner grants it directly as a narrow, deliberate
    // exception, simulating an actor who has role.manage but limited permissions
    // otherwise (the scenario FR-013 actually guards against).
    const escalatorToken = await inviteAndAccept(ownerToken, organizationId, 'escalator@example.com', 'Ventas');
    await inviteAndAccept(ownerToken, organizationId, 'escalation-target@example.com', 'Lector');
    const escalatorId = (await prisma.user.findUniqueOrThrow({ where: { email: 'escalator@example.com' } })).id;
    const targetId = (await prisma.user.findUniqueOrThrow({ where: { email: 'escalation-target@example.com' } })).id;

    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/members/${escalatorId}/permissions`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ permission: 'role.manage' })
      .expect(201);

    const adminRole = await prisma.role.findFirstOrThrow({ where: { organizationId: null, name: 'Administrador' } });
    const ventasRole = await prisma.role.findFirstOrThrow({ where: { organizationId: null, name: 'Ventas' } });

    // Administrador has far more permissions than Ventas ∪ {role.manage} — rejected.
    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/members/${targetId}/roles`)
      .set('Authorization', `Bearer ${escalatorToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ roleId: adminRole.id })
      .expect(403);

    // Ventas's own permissions are already a subset of what the actor holds — allowed.
    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/members/${targetId}/roles`)
      .set('Authorization', `Bearer ${escalatorToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ roleId: ventasRole.id })
      .expect(201);
  });
});
