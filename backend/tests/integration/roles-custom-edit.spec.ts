import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createTestApp, resetDatabase } from '../test-app';

describe('Editing a custom Role reflects immediately for every Member that holds it (US3, Acceptance Scenario 2)', () => {
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

  it('adds a permission to the Role and it appears immediately for the assigned Member', async () => {
    const owner = await registerAndLogin('custom-edit-owner@example.com');
    const org = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .send({ name: 'Custom Edit Org', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);
    const organizationId = org.body.id as string;
    const ownerToken = owner.body.accessToken as string;

    const created = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/roles`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ name: 'Facturador', permissions: ['invoice.read'] })
      .expect(201);

    const invitation = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/invitations`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ email: 'custom-edit-member@example.com', role: 'Lector' })
      .expect(201);
    const memberLogin = await registerAndLogin('custom-edit-member@example.com');
    await request(app.getHttpServer())
      .post(`/api/v1/auth/invitations/${invitation.body.invitationToken}/accept`)
      .set('Authorization', `Bearer ${memberLogin.body.accessToken}`)
      .expect(200);
    const memberUserId = (await prisma.user.findUniqueOrThrow({ where: { email: 'custom-edit-member@example.com' } }))
      .id;

    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/members/${memberUserId}/roles`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ roleId: created.body.id })
      .expect(201);

    let effective = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}/members/${memberUserId}/effective-permissions`)
      .set('Authorization', `Bearer ${memberLogin.body.accessToken}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);
    expect(effective.body.permissions).not.toEqual(expect.arrayContaining(['invoice.create']));

    await request(app.getHttpServer())
      .patch(`/api/v1/organizations/${organizationId}/roles/${created.body.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ permissions: ['invoice.read', 'invoice.create'] })
      .expect(200);

    effective = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}/members/${memberUserId}/effective-permissions`)
      .set('Authorization', `Bearer ${memberLogin.body.accessToken}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);
    expect(effective.body.permissions).toEqual(expect.arrayContaining(['invoice.create']));
  });
});
