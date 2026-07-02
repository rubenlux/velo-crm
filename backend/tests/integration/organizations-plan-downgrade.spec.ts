import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createTestApp, resetDatabase } from '../test-app';

describe('Change plan - downgrade (US4, Acceptance Scenario 2)', () => {
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

  it('rejects downgrading when enabled modules are not available in the target plan', async () => {
    const owner = await registerAndLogin('plan-downgrade-modules@example.com');
    const org = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .send({ name: 'Downgrade Org', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/v1/organizations/${org.body.id}/plan`)
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .set('X-Organization-Id', org.body.id)
      .send({ plan: 'Pro' })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/api/v1/organizations/${org.body.id}/modules`)
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .set('X-Organization-Id', org.body.id)
      .send({ enabledModules: ['crm', 'agenda'] })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/api/v1/organizations/${org.body.id}/plan`)
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .set('X-Organization-Id', org.body.id)
      .send({ plan: 'Free' })
      .expect(409);
  });

  it('rejects downgrading when active users exceed the target plan limit', async () => {
    const owner = await registerAndLogin('plan-downgrade-users@example.com');
    const org = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .send({ name: 'Downgrade Users Org', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/v1/organizations/${org.body.id}/plan`)
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .set('X-Organization-Id', org.body.id)
      .send({ plan: 'Pro' })
      .expect(200);

    for (let i = 0; i < 5; i += 1) {
      const invitee = await registerAndLogin(`downgrade-member-${i}@example.com`);
      const invitation = await request(app.getHttpServer())
        .post(`/api/v1/organizations/${org.body.id}/invitations`)
        .set('Authorization', `Bearer ${owner.body.accessToken}`)
        .set('X-Organization-Id', org.body.id)
        .send({ email: `downgrade-member-${i}@example.com`, role: 'Ventas' })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/api/v1/auth/invitations/${invitation.body.invitationToken}/accept`)
        .set('Authorization', `Bearer ${invitee.body.accessToken}`)
        .expect(200);
    }

    // Owner + 5 members = 6 active users, above the Free plan limit of 3.
    await request(app.getHttpServer())
      .patch(`/api/v1/organizations/${org.body.id}/plan`)
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .set('X-Organization-Id', org.body.id)
      .send({ plan: 'Free' })
      .expect(409);
  });
});
