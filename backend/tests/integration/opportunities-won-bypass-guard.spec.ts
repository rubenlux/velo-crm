import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createTestApp, resetDatabase } from '../test-app';

describe('Cierre del bypass de opportunity.edit_won vía archive/lose (RN-005, revisión de seguridad)', () => {
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

  async function setupOrgWithSalesUser() {
    const owner = await registerAndLogin('opportunities-won-bypass-owner@example.com');
    const ownerToken = owner.body.accessToken as string;
    const org = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Opportunities Won Bypass Org', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);
    const organizationId = org.body.id as string;

    const sales = await registerAndLogin('opportunities-won-bypass-sales@example.com');
    const invitation = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/invitations`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ email: 'opportunities-won-bypass-sales@example.com', role: 'Ventas' })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/auth/invitations/${invitation.body.invitationToken}/accept`)
      .set('Authorization', `Bearer ${sales.body.accessToken}`)
      .expect(200);

    const customer = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/customers`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ name: 'Won Bypass Corp' })
      .expect(201);

    return { ownerToken, salesToken: sales.body.accessToken as string, organizationId, customerId: customer.body.id as string };
  }

  it('rechaza editar una Oportunidad Ganada aunque esté Archivada (archive -> update -> restore ya no evade edit_won)', async () => {
    const { ownerToken, salesToken, organizationId, customerId } = await setupOrgWithSalesUser();

    const opportunity = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/opportunities`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ customerId, name: 'Won Bypass Deal', estimatedValue: 10000 })
      .expect(201);

    const won = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/opportunities/${opportunity.body.id}/win`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);

    const archived = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/opportunities/${opportunity.body.id}/archive`)
      .set('Authorization', `Bearer ${salesToken}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);
    expect(archived.body.state).toBe('Archivada');

    // Ventas no tiene opportunity.edit_won: editar mientras está Archivada (pero
    // era Ganada) debe seguir rechazado, no solo cuando el state literal es Ganada.
    await request(app.getHttpServer())
      .patch(`/api/v1/organizations/${organizationId}/opportunities/${opportunity.body.id}`)
      .set('Authorization', `Bearer ${salesToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ version: archived.body.version, estimatedValue: 999999 })
      .expect(403);

    expect(won.body.state).toBe('Ganada');
  });

  it('rechaza que Ventas ejecute /lose directamente sobre una Oportunidad Ganada sin opportunity.edit_won', async () => {
    const { ownerToken, salesToken, organizationId, customerId } = await setupOrgWithSalesUser();

    const opportunity = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/opportunities`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ customerId, name: 'Won Bypass Lose Deal' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/opportunities/${opportunity.body.id}/win`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);

    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/opportunities/${opportunity.body.id}/lose`)
      .set('Authorization', `Bearer ${salesToken}`)
      .set('X-Organization-Id', organizationId)
      .expect(403);

    // El Propietario (bypass total) sí puede.
    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/opportunities/${opportunity.body.id}/lose`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);
  });

  it('rechaza /win y /lose sobre una Oportunidad Archivada (paridad con move-stage, RN-008)', async () => {
    const { ownerToken, organizationId, customerId } = await setupOrgWithSalesUser();

    const opportunity = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/opportunities`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ customerId, name: 'Archived Win Lose Deal' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/opportunities/${opportunity.body.id}/archive`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);

    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/opportunities/${opportunity.body.id}/win`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .expect(409);

    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/opportunities/${opportunity.body.id}/lose`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .expect(409);
  });
});
