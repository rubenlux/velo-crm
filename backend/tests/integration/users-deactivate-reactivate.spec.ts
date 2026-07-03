import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createTestApp, resetDatabase } from '../test-app';

describe('Deactivate/reactivate a User (US3, Acceptance Scenario 1-2)', () => {
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

  it('deactivates an Active member and reactivates them, keeping Role and data intact', async () => {
    const owner = await registerAndLogin('lifecycle-owner@example.com');
    const org = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .send({ name: 'Lifecycle Org', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);

    const member = await registerAndLogin('lifecycle-member@example.com');
    const invitation = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${org.body.id}/invitations`)
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .set('X-Organization-Id', org.body.id)
      .send({ email: 'lifecycle-member@example.com', role: 'Ventas' })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/auth/invitations/${invitation.body.invitationToken}/accept`)
      .set('Authorization', `Bearer ${member.body.accessToken}`)
      .expect(200);

    const memberId = (await prisma.user.findUniqueOrThrow({ where: { email: 'lifecycle-member@example.com' } })).id;

    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${org.body.id}/members/${memberId}/deactivate`)
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .set('X-Organization-Id', org.body.id)
      .expect(200);

    let record = await prisma.user.findUniqueOrThrow({ where: { id: memberId } });
    expect(record.status).toBe('Inactive');

    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${org.body.id}/members/${memberId}/reactivate`)
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .set('X-Organization-Id', org.body.id)
      .expect(200);

    record = await prisma.user.findUniqueOrThrow({ where: { id: memberId } });
    expect(record.status).toBe('Active');

    const membership = await prisma.membership.findUniqueOrThrow({
      where: { userId_organizationId: { userId: memberId, organizationId: org.body.id } },
    });
    expect(membership.role).toBe('Ventas');
  });

  it('rejects deactivation/reactivation from a non-admin actor', async () => {
    const owner = await registerAndLogin('lifecycle-nonadmin-owner@example.com');
    const org = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .send({ name: 'Non Admin Actor Org', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);

    const member = await registerAndLogin('lifecycle-nonadmin-member@example.com');
    const invitation = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${org.body.id}/invitations`)
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .set('X-Organization-Id', org.body.id)
      .send({ email: 'lifecycle-nonadmin-member@example.com', role: 'Ventas' })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/auth/invitations/${invitation.body.invitationToken}/accept`)
      .set('Authorization', `Bearer ${member.body.accessToken}`)
      .expect(200);

    // A Ventas Role member cannot deactivate the owner.
    const ownerId = (await prisma.user.findUniqueOrThrow({ where: { email: 'lifecycle-nonadmin-owner@example.com' } }))
      .id;
    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${org.body.id}/members/${ownerId}/deactivate`)
      .set('Authorization', `Bearer ${member.body.accessToken}`)
      .set('X-Organization-Id', org.body.id)
      .expect(403);
  });
});
