import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createTestApp, resetDatabase } from '../test-app';

describe('Last-admin invariant (US3, FR-008, SC-004)', () => {
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

  it('rejects deactivating the only active Propietario of an Organization', async () => {
    const owner = await registerAndLogin('last-admin-owner@example.com');
    const org = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .send({ name: 'Last Admin Org', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);

    const ownerId = (await prisma.user.findUniqueOrThrow({ where: { email: 'last-admin-owner@example.com' } })).id;

    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${org.body.id}/members/${ownerId}/deactivate`)
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .set('X-Organization-Id', org.body.id)
      .expect(409);

    await request(app.getHttpServer())
      .delete(`/api/v1/organizations/${org.body.id}/members/${ownerId}`)
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .set('X-Organization-Id', org.body.id)
      .expect(409);
  });

  it('allows deactivating an admin when another active admin remains', async () => {
    const owner = await registerAndLogin('two-admins-owner@example.com');
    const org = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .send({ name: 'Two Admins Org', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);

    const admin2 = await registerAndLogin('two-admins-second@example.com');
    const invitation = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${org.body.id}/invitations`)
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .set('X-Organization-Id', org.body.id)
      .send({ email: 'two-admins-second@example.com', role: 'Administrador' })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/auth/invitations/${invitation.body.invitationToken}/accept`)
      .set('Authorization', `Bearer ${admin2.body.accessToken}`)
      .expect(200);

    const ownerId = (await prisma.user.findUniqueOrThrow({ where: { email: 'two-admins-owner@example.com' } })).id;

    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${org.body.id}/members/${ownerId}/deactivate`)
      .set('Authorization', `Bearer ${admin2.body.accessToken}`)
      .set('X-Organization-Id', org.body.id)
      .expect(200);

    const record = await prisma.user.findUniqueOrThrow({ where: { id: ownerId } });
    expect(record.status).toBe('Inactive');
  });
});
