import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../../src/shared/prisma/prisma.service';
import { createTestApp, resetDatabase } from '../../test-app';

/**
 * End-to-end walk of specs/011-opportunities/quickstart.md: pipeline por defecto,
 * alta y movimiento de Oportunidad, renombrado de etapa gated por
 * opportunity.manage_pipeline, valor ponderado, cierre/reapertura/archivado y
 * verificación del Audit Log.
 */
describe('E2E: Opportunities quickstart (US1, US2, US3)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  afterAll(async () => {
    await resetDatabase(prisma);
    await app.close();
  });

  async function registerAndLogin(email: string) {
    await request(app.getHttpServer()).post('/api/v1/auth/register').send({ email, password: 'Sup3rSecret!' }).expect(201);
    return request(app.getHttpServer()).post('/api/v1/auth/login').send({ email, password: 'Sup3rSecret!' }).expect(200);
  }

  it('walks pipeline por defecto -> crear -> mover etapa -> renombrar etapa (gated) -> valor ponderado -> perder -> reabrir -> ganar -> archivar/restaurar -> audit log', async () => {
    const server = app.getHttpServer();

    const owner = await registerAndLogin('opportunities-quickstart-owner@example.com');
    const ownerToken = owner.body.accessToken as string;
    const org = await request(server)
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Opportunities Quickstart Org', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);
    const organizationId = org.body.id as string;

    const sales = await registerAndLogin('opportunities-quickstart-sales@example.com');
    const invitation = await request(server)
      .post(`/api/v1/organizations/${organizationId}/invitations`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ email: 'opportunities-quickstart-sales@example.com', role: 'Ventas' })
      .expect(201);
    await request(server)
      .post(`/api/v1/auth/invitations/${invitation.body.invitationToken}/accept`)
      .set('Authorization', `Bearer ${sales.body.accessToken}`)
      .expect(200);
    const salesToken = sales.body.accessToken as string;

    const customer = await request(server)
      .post(`/api/v1/organizations/${organizationId}/customers`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ name: 'Quickstart Corp' })
      .expect(201);

    // Step 1: pipeline por defecto se crea perezosamente en la primera consulta (US1, research.md #3).
    const pipelines = await request(server)
      .get(`/api/v1/organizations/${organizationId}/pipelines`)
      .set('Authorization', `Bearer ${salesToken}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);
    expect(pipelines.body).toHaveLength(1);
    const defaultPipeline = pipelines.body[0];
    expect(defaultPipeline.stages.map((s: { name: string }) => s.name)).toEqual([
      'Nueva',
      'Calificada',
      'Descubrimiento',
      'Propuesta',
      'Negociación',
      'Cierre',
      'Ganada',
      'Perdida',
    ]);

    // Step 2: alta de Oportunidad en la etapa "Nueva" (US1, Acceptance Scenario 1).
    const opportunity = await request(server)
      .post(`/api/v1/organizations/${organizationId}/opportunities`)
      .set('Authorization', `Bearer ${salesToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ customerId: customer.body.id, name: 'Quickstart Deal', ownerUserId: sales.body.user.id })
      .expect(201);
    expect(opportunity.body.state).toBe('Abierta');
    expect(opportunity.body.stage.name).toBe('Nueva');

    // Step 3: mover de etapa (US1, Acceptance Scenario 3).
    const qualifiedStage = defaultPipeline.stages.find((s: { name: string }) => s.name === 'Calificada');
    const moved = await request(server)
      .post(`/api/v1/organizations/${organizationId}/opportunities/${opportunity.body.id}/move-stage`)
      .set('Authorization', `Bearer ${salesToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ stageId: qualifiedStage.id })
      .expect(201);
    expect(moved.body.stage.name).toBe('Calificada');

    // Step 4: renombrar etapa requiere opportunity.manage_pipeline — Ventas no lo tiene, Propietario sí (US1, Acceptance Scenario 4).
    const discoveryStage = defaultPipeline.stages.find((s: { name: string }) => s.name === 'Descubrimiento');
    await request(server)
      .patch(`/api/v1/organizations/${organizationId}/pipelines/${defaultPipeline.id}/stages/${discoveryStage.id}`)
      .set('Authorization', `Bearer ${salesToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ name: 'Diagnóstico' })
      .expect(403);
    await request(server)
      .patch(`/api/v1/organizations/${organizationId}/pipelines/${defaultPipeline.id}/stages/${discoveryStage.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ name: 'Diagnóstico' })
      .expect(200);

    // Step 5: valor, probabilidad y valor ponderado calculado (US2, Acceptance Scenario 1).
    const valued = await request(server)
      .patch(`/api/v1/organizations/${organizationId}/opportunities/${opportunity.body.id}`)
      .set('Authorization', `Bearer ${salesToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ version: moved.body.version, estimatedValue: 100000, probability: 40 })
      .expect(200);
    const afterValue = await request(server)
      .get(`/api/v1/organizations/${organizationId}/opportunities/${opportunity.body.id}`)
      .set('Authorization', `Bearer ${salesToken}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);
    expect(afterValue.body.weightedValue).toBe(40000);

    // Step 6: perder y reabrir (US3, Acceptance Scenarios 2-3).
    const lost = await request(server)
      .post(`/api/v1/organizations/${organizationId}/opportunities/${opportunity.body.id}/lose`)
      .set('Authorization', `Bearer ${salesToken}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);
    expect(lost.body.state).toBe('Perdida');
    const reopened = await request(server)
      .post(`/api/v1/organizations/${organizationId}/opportunities/${opportunity.body.id}/reopen`)
      .set('Authorization', `Bearer ${salesToken}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);
    expect(reopened.body.state).toBe('Abierta');
    expect(reopened.body.stage.name).toBe('Calificada');

    // Step 7: ganar bloquea ediciones posteriores sin opportunity.edit_won (US3, Acceptance Scenario 1, RN-005).
    const won = await request(server)
      .post(`/api/v1/organizations/${organizationId}/opportunities/${opportunity.body.id}/win`)
      .set('Authorization', `Bearer ${salesToken}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);
    expect(won.body.state).toBe('Ganada');
    await request(server)
      .patch(`/api/v1/organizations/${organizationId}/opportunities/${opportunity.body.id}`)
      .set('Authorization', `Bearer ${salesToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ version: won.body.version, name: 'Intento bloqueado' })
      .expect(403);

    // Step 8: archivar/restaurar con una segunda Oportunidad (US3, Acceptance Scenario 4, RN-008).
    const second = await request(server)
      .post(`/api/v1/organizations/${organizationId}/opportunities`)
      .set('Authorization', `Bearer ${salesToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ customerId: customer.body.id, name: 'Quickstart Deal 2' })
      .expect(201);
    await request(server)
      .post(`/api/v1/organizations/${organizationId}/opportunities/${second.body.id}/archive`)
      .set('Authorization', `Bearer ${salesToken}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);
    await request(server)
      .post(`/api/v1/organizations/${organizationId}/opportunities/${second.body.id}/move-stage`)
      .set('Authorization', `Bearer ${salesToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ stageId: qualifiedStage.id })
      .expect(409);
    await request(server)
      .post(`/api/v1/organizations/${organizationId}/opportunities/${second.body.id}/restore`)
      .set('Authorization', `Bearer ${salesToken}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);

    // Step 9: todas las mutaciones anteriores aparecen en el Audit Log (FR-016, SC-004).
    const auditLog = await request(server)
      .get(`/api/v1/organizations/${organizationId}/audit-log`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);
    const actions = auditLog.body.map((entry: { action: string }) => entry.action);
    expect(actions).toEqual(
      expect.arrayContaining([
        'OpportunityCreated',
        'OpportunityStageChanged',
        'OpportunityValueChanged',
        'OpportunityLost',
        'OpportunityReopened',
        'OpportunityWon',
        'OpportunityArchived',
        'OpportunityRestored',
      ]),
    );
  });
});
