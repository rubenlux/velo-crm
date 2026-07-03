import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createTestApp, resetDatabase } from '../test-app';

describe('Delete a custom Role (US3, Acceptance Scenario 3-4, FR-008)', () => {
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

  it('deletes a custom Role with no Users assigned, but rejects deletion while one is assigned', async () => {
    const owner = await registerAndLogin('custom-delete-owner@example.com');
    const org = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .send({ name: 'Custom Delete Org', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);
    const organizationId = org.body.id as string;
    const ownerToken = owner.body.accessToken as string;

    const unassigned = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/roles`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ name: 'Sin Uso', permissions: ['invoice.read'] })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/api/v1/organizations/${organizationId}/roles/${unassigned.body.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .expect(204);

    const assigned = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/roles`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ name: 'En Uso', permissions: ['invoice.read'] })
      .expect(201);

    const invitation = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/invitations`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ email: 'custom-delete-member@example.com', role: 'Lector' })
      .expect(201);
    const memberLogin = await registerAndLogin('custom-delete-member@example.com');
    await request(app.getHttpServer())
      .post(`/api/v1/auth/invitations/${invitation.body.invitationToken}/accept`)
      .set('Authorization', `Bearer ${memberLogin.body.accessToken}`)
      .expect(200);
    const memberUserId = (
      await prisma.user.findUniqueOrThrow({ where: { email: 'custom-delete-member@example.com' } })
    ).id;

    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/members/${memberUserId}/roles`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ roleId: assigned.body.id })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/api/v1/organizations/${organizationId}/roles/${assigned.body.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .expect(409);

    await request(app.getHttpServer())
      .delete(`/api/v1/organizations/${organizationId}/members/${memberUserId}/roles/${assigned.body.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .expect(204);

    await request(app.getHttpServer())
      .delete(`/api/v1/organizations/${organizationId}/roles/${assigned.body.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .expect(204);
  });
});
