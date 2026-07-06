import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createTestApp, resetDatabase } from '../test-app';

describe('Línea de tiempo de una Oportunidad (US5, Acceptance Scenario 2)', () => {
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

  it('combina cambios de valor/etapa (OpportunityHistory) y eventos de ciclo de vida (AuditLog) en orden cronológico', async () => {
    const owner = await registerAndLogin('opportunities-timeline-owner@example.com');
    const token = owner.body.accessToken as string;
    const org = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Opportunities Timeline Org', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);
    const organizationId = org.body.id as string;

    const customer = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/customers`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ name: 'Timeline Corp' })
      .expect(201);

    const opportunity = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/opportunities`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ customerId: customer.body.id, name: 'Timeline Deal', estimatedValue: 20000, probability: 30 })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/v1/organizations/${organizationId}/opportunities/${opportunity.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ version: opportunity.body.version, estimatedValue: 25000 })
      .expect(200);

    const pipelines = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}/pipelines`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);
    const proposalStage = pipelines.body[0].stages.find((s: { name: string }) => s.name === 'Propuesta');

    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/opportunities/${opportunity.body.id}/move-stage`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ stageId: proposalStage.id })
      .expect(201);

    const timeline = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}/opportunities/${opportunity.body.id}/timeline`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);

    const actions = timeline.body.map((entry: { detail?: { action?: string } }) => entry.detail?.action).filter(Boolean);
    expect(actions).toEqual(expect.arrayContaining(['OpportunityCreated', 'OpportunityValueChanged', 'OpportunityStageChanged']));

    const editEntry = timeline.body.find((entry: { type: string }) => entry.type === 'edit');
    expect(editEntry).toBeDefined();
    expect(editEntry.detail.changes).toBeDefined();

    const timestamps = timeline.body.map((entry: { occurredAt: string }) => new Date(entry.occurredAt).getTime());
    const sorted = [...timestamps].sort((a, b) => a - b);
    expect(timestamps).toEqual(sorted);
  });
});
