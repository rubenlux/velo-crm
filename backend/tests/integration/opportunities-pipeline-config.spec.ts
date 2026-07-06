import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createTestApp, resetDatabase } from '../test-app';

describe('Configurar las etapas del Pipeline (US1, Acceptance Scenario 4)', () => {
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

  it('un Administrador puede renombrar una etapa; un Ventas sin el permiso recibe 403', async () => {
    const owner = await registerAndLogin('opportunities-pipeline-config-owner@example.com');
    const ownerToken = owner.body.accessToken as string;
    const org = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Opportunities Pipeline Config Org', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);
    const organizationId = org.body.id as string;

    const pipelines = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}/pipelines`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);
    const pipelineId = pipelines.body[0].id;
    const discoveryStage = pipelines.body[0].stages.find((s: { name: string }) => s.name === 'Descubrimiento');

    // El Propietario (bypass total, spec 007) puede reconfigurar.
    const renamed = await request(app.getHttpServer())
      .patch(`/api/v1/organizations/${organizationId}/pipelines/${pipelineId}/stages/${discoveryStage.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ name: 'Diagnóstico' })
      .expect(200);
    expect(renamed.body.name).toBe('Diagnóstico');

    // Invitar un Ventas y confirmar que NO tiene opportunity.manage_pipeline.
    const salesUser = await registerAndLogin('opportunities-pipeline-config-sales@example.com');
    const invitation = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/invitations`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ email: 'opportunities-pipeline-config-sales@example.com', role: 'Ventas' })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/auth/invitations/${invitation.body.invitationToken}/accept`)
      .set('Authorization', `Bearer ${salesUser.body.accessToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/api/v1/organizations/${organizationId}/pipelines/${pipelineId}/stages/${discoveryStage.id}`)
      .set('Authorization', `Bearer ${salesUser.body.accessToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ name: 'Otro nombre' })
      .expect(403);
  });
});
