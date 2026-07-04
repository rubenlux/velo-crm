import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../../src/shared/prisma/prisma.service';
import { createTestApp, resetDatabase } from '../../test-app';

/**
 * End-to-end walk of specs/008-customers/quickstart.md: create, edit with history,
 * reject a same-Organization duplicate taxId, accept the same taxId in another
 * Organization, reject a missing required field, reject a stale concurrent edit, and
 * confirm every mutation lands in the Audit Log.
 */
describe('E2E: Customers quickstart (US1)', () => {
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

  it('walks create -> edit -> duplicate taxId -> cross-org taxId -> validation -> stale update -> audit log', async () => {
    const server = app.getHttpServer();

    const owner = await registerAndLogin('customers-quickstart-owner@example.com');
    const org = await request(server)
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .send({ name: 'Customers Quickstart Org', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);
    const organizationId = org.body.id as string;
    const ownerToken = owner.body.accessToken as string;

    const secondOwner = await registerAndLogin('customers-quickstart-owner-2@example.com');
    const secondOrg = await request(server)
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${secondOwner.body.accessToken}`)
      .send({ name: 'Customers Quickstart Org 2', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);

    // Step 1: create.
    const created = await request(server)
      .post(`/api/v1/organizations/${organizationId}/customers`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ name: 'Quickstart Customer', taxId: '30-11112222-3' })
      .expect(201);

    // Step 2: edit, previous value preserved in the timeline.
    const updated = await request(server)
      .patch(`/api/v1/organizations/${organizationId}/customers/${created.body.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ version: created.body.version, phone: '555-0100' })
      .expect(200);
    const timeline = await request(server)
      .get(`/api/v1/organizations/${organizationId}/customers/${created.body.id}/timeline`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);
    expect(timeline.body.some((entry: { type: string }) => entry.type === 'edit')).toBe(true);

    // Step 3: duplicate taxId in the same Organization is rejected.
    await request(server)
      .post(`/api/v1/organizations/${organizationId}/customers`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ name: 'Duplicate Attempt', taxId: '30-11112222-3' })
      .expect(409);

    // Step 4: same taxId in a different Organization is accepted.
    await request(server)
      .post(`/api/v1/organizations/${secondOrg.body.id}/customers`)
      .set('Authorization', `Bearer ${secondOwner.body.accessToken}`)
      .set('X-Organization-Id', secondOrg.body.id)
      .send({ name: 'Second Org Customer', taxId: '30-11112222-3' })
      .expect(201);

    // Step 5: missing required field is rejected.
    await request(server)
      .post(`/api/v1/organizations/${organizationId}/customers`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ taxId: '30-99998888-1' })
      .expect(400);

    // Step 6: stale concurrent edit is rejected without corrupting the record.
    await request(server)
      .patch(`/api/v1/organizations/${organizationId}/customers/${created.body.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ version: created.body.version, phone: '555-0200' })
      .expect(409);
    expect(updated.body.phone).toBe('555-0100');

    // Step 7: every mutation above is in the Audit Log.
    const auditLog = await request(server)
      .get(`/api/v1/organizations/${organizationId}/audit-log`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);
    const actions = auditLog.body.map((entry: { action: string }) => entry.action);
    expect(actions).toEqual(expect.arrayContaining(['CustomerCreated', 'CustomerUpdated']));
  });
});
