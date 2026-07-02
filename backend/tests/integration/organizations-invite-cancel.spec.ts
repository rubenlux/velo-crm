import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createTestApp, resetDatabase } from '../test-app';

describe('Cancel invitation (US3)', () => {
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

  it('invalidates the token of a cancelled invitation immediately', async () => {
    const owner = await registerAndLogin('cancel-owner@example.com');
    const org = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .send({ name: 'Cancel Org', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);

    const invitee = await registerAndLogin('invitee-cancel@example.com');

    const invitation = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${org.body.id}/invitations`)
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .set('X-Organization-Id', org.body.id)
      .send({ email: 'invitee-cancel@example.com', role: 'Ventas' })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/api/v1/organizations/${org.body.id}/invitations/${invitation.body.id}`)
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .set('X-Organization-Id', org.body.id)
      .expect(204);

    await request(app.getHttpServer())
      .post(`/api/v1/auth/invitations/${invitation.body.invitationToken}/accept`)
      .set('Authorization', `Bearer ${invitee.body.accessToken}`)
      .expect(400);

    const record = await prisma.organizationInvitation.findUnique({ where: { id: invitation.body.id } });
    expect(record?.status).toBe('cancelled');
  });
});
