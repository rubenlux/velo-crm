import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../../src/shared/prisma/prisma.service';
import { createTestApp, resetDatabase } from '../../test-app';

/**
 * End-to-end walk of specs/010-leads/quickstart.md: register and qualify a Lead,
 * assign a responsable, convert it into a Customer/Contact/Opportunity, confirm
 * re-conversion and duplicate detection are rejected, and confirm every mutation
 * lands in the Audit Log.
 */
describe('E2E: Leads quickstart (US1, US3)', () => {
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

  it('walks create -> qualify -> assign owner -> convert -> reject re-conversion -> duplicate warning -> audit log', async () => {
    const server = app.getHttpServer();

    const owner = await registerAndLogin('leads-quickstart-owner@example.com');
    const org = await request(server)
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .send({ name: 'Leads Quickstart Org', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);
    const organizationId = org.body.id as string;
    const ownerToken = owner.body.accessToken as string;

    // Step 1: create (US1, Acceptance Scenario 1).
    const lead = await request(server)
      .post(`/api/v1/organizations/${organizationId}/leads`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ name: 'Quickstart Prospecto', company: 'Quickstart SA', email: 'quickstart@lead.com', source: 'SitioWeb' })
      .expect(201);
    expect(lead.body.status).toBe('Nuevo');

    // Step 2/3: contact then qualify with a Score (US1, Acceptance Scenarios 2-3).
    const contacted = await request(server)
      .patch(`/api/v1/organizations/${organizationId}/leads/${lead.body.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ version: lead.body.version, status: 'Contactado' })
      .expect(200);
    const qualified = await request(server)
      .patch(`/api/v1/organizations/${organizationId}/leads/${lead.body.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ version: contacted.body.version, status: 'Calificado', score: 80 })
      .expect(200);
    expect(qualified.body).toMatchObject({ status: 'Calificado', score: 80 });

    // Step 4: assign a responsable (US1, Acceptance Scenario 4).
    await request(server)
      .patch(`/api/v1/organizations/${organizationId}/leads/${lead.body.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ version: qualified.body.version, ownerUserId: owner.body.user.id })
      .expect(200);

    // Step 5: convert (US3, Acceptance Scenario 1).
    const converted = await request(server)
      .post(`/api/v1/organizations/${organizationId}/leads/${lead.body.id}/convert`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .send({})
      .expect(201);
    expect(converted.body.customer.name).toBe('Quickstart SA');
    expect(converted.body.contact.isPrimary).toBe(true);
    expect(converted.body.opportunity).toMatchObject({ state: 'Abierta', leadId: lead.body.id });
    expect(converted.body.opportunity.stage.name).toBe('Nueva');

    // Step 6: the Lead is Convertido and preserves its links (US3, Acceptance Scenario 2).
    const afterConvert = await request(server)
      .get(`/api/v1/organizations/${organizationId}/leads/${lead.body.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);
    expect(afterConvert.body).toMatchObject({
      status: 'Convertido',
      convertedCustomerId: converted.body.customer.id,
      convertedContactId: converted.body.contact.id,
      convertedOpportunityId: converted.body.opportunity.id,
    });

    // Step 7: re-conversion is rejected (US3, Acceptance Scenario 3, FR-011).
    await request(server)
      .post(`/api/v1/organizations/${organizationId}/leads/${lead.body.id}/convert`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .send({})
      .expect(409);

    // Step 8: a new Lead sharing the same email is flagged as a duplicate, not converted.
    const duplicateLead = await request(server)
      .post(`/api/v1/organizations/${organizationId}/leads`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ name: 'Otro Prospecto', email: 'quickstart@lead.com' })
      .expect(201);
    const warning = await request(server)
      .post(`/api/v1/organizations/${organizationId}/leads/${duplicateLead.body.id}/convert`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .send({})
      .expect(409);
    expect(warning.body.candidateCustomerId).toBe(converted.body.customer.id);

    // Step 9: every mutation above is in the Audit Log.
    const auditLog = await request(server)
      .get(`/api/v1/organizations/${organizationId}/audit-log`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);
    const actions = auditLog.body.map((entry: { action: string }) => entry.action);
    expect(actions).toEqual(
      expect.arrayContaining(['LeadCreated', 'LeadStatusChanged', 'LeadOwnerChanged', 'LeadConverted', 'CustomerCreated', 'ContactCreated']),
    );
  });
});
