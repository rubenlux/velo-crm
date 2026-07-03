import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createTestApp, resetDatabase } from '../test-app';

describe('Create a custom Role and assign it (US3, Acceptance Scenario 1)', () => {
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

  it('limits an assigned custom Role to exactly its own set of permissions', async () => {
    const owner = await registerAndLogin('custom-create-owner@example.com');
    const org = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .send({ name: 'Custom Role Org', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);
    const organizationId = org.body.id as string;
    const ownerToken = owner.body.accessToken as string;

    const created = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/roles`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ name: 'Cobrador', permissions: ['invoice.read', 'payment.read'] })
      .expect(201);

    expect(created.body).toMatchObject({
      organizationId,
      name: 'Cobrador',
      isDefault: false,
      permissions: expect.arrayContaining(['invoice.read', 'payment.read']),
    });

    const invitation = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/invitations`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ email: 'custom-create-member@example.com', role: 'Lector' })
      .expect(201);
    const memberLogin = await registerAndLogin('custom-create-member@example.com');
    await request(app.getHttpServer())
      .post(`/api/v1/auth/invitations/${invitation.body.invitationToken}/accept`)
      .set('Authorization', `Bearer ${memberLogin.body.accessToken}`)
      .expect(200);
    const memberUserId = (
      await prisma.user.findUniqueOrThrow({ where: { email: 'custom-create-member@example.com' } })
    ).id;

    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/members/${memberUserId}/roles`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ roleId: created.body.id })
      .expect(201);

    const effective = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}/members/${memberUserId}/effective-permissions`)
      .set('Authorization', `Bearer ${memberLogin.body.accessToken}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);

    // Lector's own read-only permissions ∪ Cobrador's two explicit permissions —
    // nothing beyond that (e.g. no write permission of any kind).
    expect(effective.body.permissions).toEqual(expect.arrayContaining(['invoice.read', 'payment.read']));
    expect(effective.body.permissions.some((p: string) => p.endsWith('.create') || p.endsWith('.update') || p.endsWith('.delete'))).toBe(
      false,
    );
  });

  it('is only visible for assignment within the Organization that created it', async () => {
    const ownerA = await registerAndLogin('custom-create-owner-a@example.com');
    const orgA = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${ownerA.body.accessToken}`)
      .send({ name: 'Org A', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);

    const ownerB = await registerAndLogin('custom-create-owner-b@example.com');
    const orgB = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${ownerB.body.accessToken}`)
      .send({ name: 'Org B', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${orgA.body.id}/roles`)
      .set('Authorization', `Bearer ${ownerA.body.accessToken}`)
      .set('X-Organization-Id', orgA.body.id)
      .send({ name: 'Solo Org A', permissions: ['invoice.read'] })
      .expect(201);

    const rolesInOrgB = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${orgB.body.id}/roles`)
      .set('Authorization', `Bearer ${ownerB.body.accessToken}`)
      .set('X-Organization-Id', orgB.body.id)
      .expect(200);

    expect(rolesInOrgB.body.some((role: { name: string }) => role.name === 'Solo Org A')).toBe(false);
  });
});
