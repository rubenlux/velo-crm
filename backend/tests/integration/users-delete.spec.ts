import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createTestApp, resetDatabase } from '../test-app';

describe('Soft delete a User (US3, FR-007, Acceptance Scenario 3)', () => {
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

  it('soft-deletes a member and rejects any later reactivation attempt', async () => {
    const owner = await registerAndLogin('delete-owner@example.com');
    const org = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .send({ name: 'Delete Org', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);

    const member = await registerAndLogin('delete-member@example.com');
    const invitation = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${org.body.id}/invitations`)
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .set('X-Organization-Id', org.body.id)
      .send({ email: 'delete-member@example.com', role: 'Ventas' })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/auth/invitations/${invitation.body.invitationToken}/accept`)
      .set('Authorization', `Bearer ${member.body.accessToken}`)
      .expect(200);

    const memberId = (await prisma.user.findUniqueOrThrow({ where: { email: 'delete-member@example.com' } })).id;

    await request(app.getHttpServer())
      .delete(`/api/v1/organizations/${org.body.id}/members/${memberId}`)
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .set('X-Organization-Id', org.body.id)
      .expect(200);

    const record = await prisma.user.findUniqueOrThrow({ where: { id: memberId } });
    expect(record.status).toBe('Deleted');
    expect(record.deletedAt).not.toBeNull();

    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${org.body.id}/members/${memberId}/reactivate`)
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .set('X-Organization-Id', org.body.id)
      .expect(409);

    const membership = await prisma.membership.findUniqueOrThrow({
      where: { userId_organizationId: { userId: memberId, organizationId: org.body.id } },
    });
    expect(membership).toBeTruthy();
  });
});
