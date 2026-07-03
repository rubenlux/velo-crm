import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createTestApp, resetDatabase } from '../test-app';

describe('Switching active Organization (US2, Acceptance Scenario 2-3)', () => {
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

  it('reflects the Role of whichever Organization is sent via X-Organization-Id, without a server-side switch call', async () => {
    const owner = await registerAndLogin('switch-owner@example.com');
    const orgA = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .send({ name: 'Switch Org A', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);
    const orgB = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .send({ name: 'Switch Org B', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);

    const asOrgA = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${orgA.body.id}`)
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .set('X-Organization-Id', orgA.body.id)
      .expect(200);
    expect(asOrgA.body.name).toBe('Switch Org A');

    const asOrgB = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${orgB.body.id}`)
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .set('X-Organization-Id', orgB.body.id)
      .expect(200);
    expect(asOrgB.body.name).toBe('Switch Org B');
  });

  it('denies switching to an Organization without Membership (Acceptance Scenario 3)', async () => {
    const owner = await registerAndLogin('switch-no-membership-owner@example.com');
    const otherOwner = await registerAndLogin('switch-no-membership-other@example.com');

    const otherOrg = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${otherOwner.body.accessToken}`)
      .send({ name: 'Not Mine', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);

    await request(app.getHttpServer())
      .get(`/api/v1/organizations/${otherOrg.body.id}`)
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .set('X-Organization-Id', otherOrg.body.id)
      .expect(403);
  });
});
