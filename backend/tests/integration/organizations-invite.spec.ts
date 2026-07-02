import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createTestApp, resetDatabase } from '../test-app';

describe('Invite members (US3, SC-006)', () => {
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

  async function createOrganization(email: string) {
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password: 'Sup3rSecret!' })
      .expect(201);

    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: 'Sup3rSecret!' })
      .expect(200);

    const org = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send({ name: 'Invite Org', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);

    return { accessToken: login.body.accessToken as string, organizationId: org.body.id as string };
  }

  it('invites a new email and issues a pending invitation token', async () => {
    const { accessToken, organizationId } = await createOrganization('invite-owner@example.com');

    const response = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/invitations`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ email: 'invitee@example.com', role: 'Ventas' })
      .expect(201);

    expect(response.body).toMatchObject({ email: 'invitee@example.com', role: 'Ventas', status: 'pending' });
    expect(typeof response.body.invitationToken).toBe('string');
  });

  it('reuses the pending invitation for an already-invited email instead of duplicating it', async () => {
    const { accessToken, organizationId } = await createOrganization('invite-reuse-owner@example.com');

    const first = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/invitations`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ email: 'repeat@example.com', role: 'Ventas' })
      .expect(201);

    const second = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/invitations`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ email: 'repeat@example.com', role: 'Administrador' })
      .expect(201);

    expect(second.body.id).toBe(first.body.id);
    expect(second.body.role).toBe('Administrador');
    expect(second.body.invitationToken).not.toBe(first.body.invitationToken);

    const invitations = await prisma.organizationInvitation.findMany({ where: { organizationId } });
    expect(invitations).toHaveLength(1);
  });

  it('rejects inviting beyond the Free plan user limit (SC-006)', async () => {
    const { accessToken, organizationId } = await createOrganization('invite-limit-owner@example.com');

    // Free plan allows 3 users total; the owner already counts as 1.
    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/invitations`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ email: 'member-1@example.com', role: 'Ventas' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/invitations`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ email: 'member-2@example.com', role: 'Ventas' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/invitations`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ email: 'member-3@example.com', role: 'Ventas' })
      .expect(409);
  });
});
