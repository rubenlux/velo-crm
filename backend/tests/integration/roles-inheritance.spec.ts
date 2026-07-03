import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createTestApp, resetDatabase } from '../test-app';

describe('A custom Role inheriting from a default Role accumulates permissions (US3, FR-009)', () => {
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

  it('grants the union of the inherited default Role permissions plus its own', async () => {
    const owner = await registerAndLogin('inheritance-owner@example.com');
    const org = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .send({ name: 'Inheritance Org', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);
    const organizationId = org.body.id as string;
    const ownerToken = owner.body.accessToken as string;

    const ventasRole = await prisma.role.findFirstOrThrow({ where: { organizationId: null, name: 'Ventas' } });

    const created = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/roles`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ name: 'Ventas Senior', permissions: ['invoice.read'], inheritsFromRoleId: ventasRole.id })
      .expect(201);

    const invitation = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/invitations`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ email: 'inheritance-member@example.com', role: 'Lector' })
      .expect(201);
    const memberLogin = await registerAndLogin('inheritance-member@example.com');
    await request(app.getHttpServer())
      .post(`/api/v1/auth/invitations/${invitation.body.invitationToken}/accept`)
      .set('Authorization', `Bearer ${memberLogin.body.accessToken}`)
      .expect(200);
    const memberUserId = (
      await prisma.user.findUniqueOrThrow({ where: { email: 'inheritance-member@example.com' } })
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

    // Own permission (invoice.read) + everything inherited from Ventas (e.g. lead.create).
    expect(effective.body.permissions).toEqual(expect.arrayContaining(['invoice.read', 'lead.create']));
    ventasRole.permissions.forEach((permission: string) => {
      expect(effective.body.permissions).toContain(permission);
    });
  });

  it('rejects inheriting from another custom Role (must reference a default Role)', async () => {
    const owner = await registerAndLogin('inheritance-invalid-owner@example.com');
    const org = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .send({ name: 'Invalid Inheritance Org', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);
    const organizationId = org.body.id as string;
    const ownerToken = owner.body.accessToken as string;

    const base = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/roles`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ name: 'Base Custom', permissions: ['invoice.read'] })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/roles`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ name: 'Derived Custom', permissions: [], inheritsFromRoleId: base.body.id })
      .expect(400);
  });
});
