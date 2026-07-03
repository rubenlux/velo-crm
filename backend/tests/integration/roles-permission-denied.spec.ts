import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createTestApp, resetDatabase } from '../test-app';

describe('An action without the required Permission is denied and audited (US1, Acceptance Scenario 4, SC-002)', () => {
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

  it('denies the action with 403 and records a PermissionDenied Audit Log entry', async () => {
    const owner = await registerAndLogin('denied-owner@example.com');
    const org = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .send({ name: 'Permission Denied Org', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);
    const organizationId = org.body.id as string;
    const ownerToken = owner.body.accessToken as string;

    const salesToken = await inviteAndAccept(ownerToken, organizationId, 'denied-sales@example.com', 'Ventas');
    await inviteAndAccept(ownerToken, organizationId, 'denied-target@example.com', 'Lector');
    const targetId = (await prisma.user.findUniqueOrThrow({ where: { email: 'denied-target@example.com' } })).id;
    const salesUserId = (await prisma.user.findUniqueOrThrow({ where: { email: 'denied-sales@example.com' } })).id;

    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/members/${targetId}/deactivate`)
      .set('Authorization', `Bearer ${salesToken}`)
      .set('X-Organization-Id', organizationId)
      .expect(403);

    const auditLog = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}/audit-log`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);

    const denials = auditLog.body.filter(
      (entry: { action: string; actorUserId: string }) => entry.action === 'PermissionDenied' && entry.actorUserId === salesUserId,
    );
    expect(denials).toHaveLength(1);
    expect(denials[0].metadata).toMatchObject({ permission: 'user.manage' });
  });
});
