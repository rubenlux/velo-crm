import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createTestApp, resetDatabase } from '../test-app';

describe('Configurar tipos custom de Activity (US1, Acceptance Scenario 2)', () => {
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

  it('un Administrador (Propietario) configura un tipo custom disponible para nuevas Activities; sin el permiso da 403', async () => {
    const owner = await registerAndLogin('activities-custom-type-owner@example.com');
    const ownerToken = owner.body.accessToken as string;
    const org = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Activities Custom Type Org', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);
    const organizationId = org.body.id as string;

    const created = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/activity-types`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ name: 'Café con cliente' })
      .expect(201);
    expect(created.body).toMatchObject({ name: 'Café con cliente', organizationId, isDefault: false });

    const list = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}/activity-types`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);
    expect(list.body.some((t: { name: string }) => t.name === 'Café con cliente')).toBe(true);
    expect(list.body.length).toBeGreaterThanOrEqual(13);

    const sales = await registerAndLogin('activities-custom-type-sales@example.com');
    const invitation = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/invitations`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ email: 'activities-custom-type-sales@example.com', role: 'Ventas' })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/auth/invitations/${invitation.body.invitationToken}/accept`)
      .set('Authorization', `Bearer ${sales.body.accessToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/activity-types`)
      .set('Authorization', `Bearer ${sales.body.accessToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ name: 'Otro tipo' })
      .expect(403);
  });
});
