import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createTestApp, resetDatabase } from '../test-app';

describe('Mover una Oportunidad de etapa (US1, Acceptance Scenario 3)', () => {
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

  it('mueve la Oportunidad a otra etapa y registra quién y cuándo', async () => {
    const owner = await registerAndLogin('opportunities-move-stage-owner@example.com');
    const token = owner.body.accessToken as string;
    const org = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Opportunities Move Stage Org', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);
    const organizationId = org.body.id as string;

    const customer = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/customers`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ name: 'Move Stage Corp' })
      .expect(201);

    const opportunity = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/opportunities`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ customerId: customer.body.id, name: 'Move Stage Deal' })
      .expect(201);

    const pipelines = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}/pipelines`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);
    const qualifiedStage = pipelines.body[0].stages.find((s: { name: string }) => s.name === 'Calificada');

    const moved = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/opportunities/${opportunity.body.id}/move-stage`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ stageId: qualifiedStage.id })
      .expect(201);
    expect(moved.body.stage.name).toBe('Calificada');

    const timeline = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}/opportunities/${opportunity.body.id}/timeline`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);
    const stageChange = timeline.body.find((entry: { type: string; detail?: { changes?: unknown } }) => entry.type === 'edit');
    expect(stageChange).toBeDefined();
    expect(stageChange.actorUserId).toBe(owner.body.user.id);
  });
});
