import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createTestApp, resetDatabase } from '../test-app';

describe('User status blocks Organization access (US3, FR-012, SC-005)', () => {
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

  it('denies Organization data access to a deactivated member even though login still works', async () => {
    const owner = await registerAndLogin('status-block-owner@example.com');
    const org = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .send({ name: 'Status Block Org', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);

    const memberEmail = 'status-block-member@example.com';
    const member = await registerAndLogin(memberEmail);
    const invitation = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${org.body.id}/invitations`)
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .set('X-Organization-Id', org.body.id)
      .send({ email: memberEmail, role: 'Ventas' })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/auth/invitations/${invitation.body.invitationToken}/accept`)
      .set('Authorization', `Bearer ${member.body.accessToken}`)
      .expect(200);

    const memberId = (await prisma.user.findUniqueOrThrow({ where: { email: memberEmail } })).id;

    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${org.body.id}/members/${memberId}/deactivate`)
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .set('X-Organization-Id', org.body.id)
      .expect(200);

    // Login (credential check) still succeeds per the edge case in spec.md.
    const reLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: memberEmail, password: 'Sup3rSecret!' })
      .expect(200);

    // But Organization data access is denied.
    await request(app.getHttpServer())
      .get(`/api/v1/organizations/${org.body.id}`)
      .set('Authorization', `Bearer ${reLogin.body.accessToken}`)
      .set('X-Organization-Id', org.body.id)
      .expect(403);
  });
});
