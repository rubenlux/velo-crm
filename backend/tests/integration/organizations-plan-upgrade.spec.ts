import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createTestApp, resetDatabase } from '../test-app';

describe('Change plan - upgrade (US4)', () => {
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

  it('upgrades from Free to Pro and immediately allows Pro-only modules (Acceptance Scenario 1)', async () => {
    const email = 'plan-upgrade-owner@example.com';
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password: 'Sup3rSecret!' })
      .expect(201);

    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: 'Sup3rSecret!' })
      .expect(200);

    const org = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send({ name: 'Upgrade Org', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);

    const upgraded = await request(app.getHttpServer())
      .patch(`/api/v1/organizations/${org.body.id}/plan`)
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .set('X-Organization-Id', org.body.id)
      .send({ plan: 'Pro' })
      .expect(200);

    expect(upgraded.body.plan).toBe('Pro');

    await request(app.getHttpServer())
      .patch(`/api/v1/organizations/${org.body.id}/modules`)
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .set('X-Organization-Id', org.body.id)
      .send({ enabledModules: ['crm', 'agenda', 'facturacion'] })
      .expect(200);
  });
});
