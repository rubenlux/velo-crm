import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createTestApp, resetDatabase } from '../test-app';

describe('El primer GET /pipelines crea perezosamente el Pipeline por defecto (research.md #3)', () => {
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

  it('crea el Pipeline "Por defecto" con sus 8 etapas la primera vez', async () => {
    const owner = await registerAndLogin('opportunities-default-pipeline-owner@example.com');
    const token = owner.body.accessToken as string;
    const org = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Opportunities Default Pipeline Org', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);
    const organizationId = org.body.id as string;

    const pipelines = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}/pipelines`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);

    expect(pipelines.body).toHaveLength(1);
    expect(pipelines.body[0]).toMatchObject({ name: 'Por defecto', isDefault: true });
    expect(pipelines.body[0].stages).toHaveLength(8);
    expect(pipelines.body[0].stages.map((s: { name: string }) => s.name)).toEqual([
      'Nueva',
      'Calificada',
      'Descubrimiento',
      'Propuesta',
      'Negociación',
      'Cierre',
      'Ganada',
      'Perdida',
    ]);
    const wonStage = pipelines.body[0].stages.find((s: { isWonStage: boolean }) => s.isWonStage);
    const lostStage = pipelines.body[0].stages.find((s: { isLostStage: boolean }) => s.isLostStage);
    expect(wonStage.name).toBe('Ganada');
    expect(lostStage.name).toBe('Perdida');

    // Idempotente: un segundo GET no crea un segundo Pipeline por defecto.
    const secondCall = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}/pipelines`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);
    expect(secondCall.body).toHaveLength(1);
  });
});
