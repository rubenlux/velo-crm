import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createTestApp, resetDatabase } from '../test-app';

describe('Archivar y restaurar una Oportunidad (US3, Acceptance Scenario 4, RN-008)', () => {
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

  it('rechaza move-stage sobre una Archivada hasta restaurarla explícitamente', async () => {
    const owner = await registerAndLogin('opportunities-archive-restore-owner@example.com');
    const token = owner.body.accessToken as string;
    const org = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Opportunities Archive Restore Org', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);
    const organizationId = org.body.id as string;

    const customer = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/customers`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ name: 'Archive Restore Corp' })
      .expect(201);

    const opportunity = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/opportunities`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ customerId: customer.body.id, name: 'Archive Restore Deal' })
      .expect(201);

    const archived = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/opportunities/${opportunity.body.id}/archive`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);
    expect(archived.body.state).toBe('Archivada');

    const pipelines = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}/pipelines`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);
    const qualifiedStage = pipelines.body[0].stages.find((s: { name: string }) => s.name === 'Calificada');

    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/opportunities/${opportunity.body.id}/move-stage`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ stageId: qualifiedStage.id })
      .expect(409);

    const restored = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/opportunities/${opportunity.body.id}/restore`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);
    expect(restored.body.state).toBe('Abierta');

    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/opportunities/${opportunity.body.id}/move-stage`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ stageId: qualifiedStage.id })
      .expect(201);
  });
});
