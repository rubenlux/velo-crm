import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createTestApp, resetDatabase } from '../test-app';

describe('Múltiples participantes en una Activity (US1, Acceptance Scenario 5)', () => {
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

  it('conserva la lista completa de participantes', async () => {
    const owner = await registerAndLogin('activities-participants-owner@example.com');
    const token = owner.body.accessToken as string;
    const org = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Activities Participants Org', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);
    const organizationId = org.body.id as string;

    const other = await registerAndLogin('activities-participants-other@example.com');

    const customer = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/customers`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ name: 'Participants Corp' })
      .expect(201);

    const types = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}/activity-types`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);
    const reunion = types.body.find((t: { name: string }) => t.name === 'Reunión');

    const activity = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/activities`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({
        customerId: customer.body.id,
        activityTypeId: reunion.id,
        title: 'Reunión con varios participantes',
        scheduledAt: new Date().toISOString(),
        participantUserIds: [owner.body.user.id, other.body.user.id],
      })
      .expect(201);

    expect(activity.body.participantUserIds.sort()).toEqual([owner.body.user.id, other.body.user.id].sort());
  });
});
