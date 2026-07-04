import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../../src/shared/prisma/prisma.service';
import { createTestApp, resetDatabase } from '../../test-app';

/**
 * End-to-end walk of specs/009-contacts/quickstart.md: create a Contact under a
 * Customer, edit it with history, archive it, confirm cross-Organization isolation,
 * set/replace the primary Contact of a Customer, and confirm every mutation lands in
 * the Audit Log.
 */
describe('E2E: Contacts quickstart (US1, US2)', () => {
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

  it('walks create -> edit -> archive -> cross-org isolation -> primary contact -> audit log', async () => {
    const server = app.getHttpServer();

    const owner = await registerAndLogin('contacts-quickstart-owner@example.com');
    const org = await request(server)
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .send({ name: 'Contacts Quickstart Org', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);
    const organizationId = org.body.id as string;
    const ownerToken = owner.body.accessToken as string;

    const customer = await request(server)
      .post(`/api/v1/organizations/${organizationId}/customers`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ name: 'Quickstart Customer' })
      .expect(201);

    // Step 1: create.
    const contactA = await request(server)
      .post(`/api/v1/organizations/${organizationId}/customers/${customer.body.id}/contacts`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ firstName: 'Jane', lastName: 'Doe', jobTitle: 'CFO', primaryEmail: 'jane@quickstart.com' })
      .expect(201);

    // Step 2: edit, previous value preserved in the timeline.
    await request(server)
      .patch(`/api/v1/organizations/${organizationId}/contacts/${contactA.body.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ version: contactA.body.version, jobTitle: 'CEO' })
      .expect(200);
    const timeline = await request(server)
      .get(`/api/v1/organizations/${organizationId}/contacts/${contactA.body.id}/timeline`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);
    expect(timeline.body.some((entry: { type: string }) => entry.type === 'edit')).toBe(true);

    // Step 3: archive, still readable.
    await request(server)
      .post(`/api/v1/organizations/${organizationId}/contacts/${contactA.body.id}/archive`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);
    const archived = await request(server)
      .get(`/api/v1/organizations/${organizationId}/contacts/${contactA.body.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);
    expect(archived.body.status).toBe('archived');

    // Step 4: cross-Organization isolation.
    const secondOwner = await registerAndLogin('contacts-quickstart-owner-2@example.com');
    const secondOrg = await request(server)
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${secondOwner.body.accessToken}`)
      .send({ name: 'Contacts Quickstart Org 2', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);
    await request(server)
      .get(`/api/v1/organizations/${secondOrg.body.id}/contacts/${contactA.body.id}`)
      .set('Authorization', `Bearer ${secondOwner.body.accessToken}`)
      .set('X-Organization-Id', secondOrg.body.id)
      .expect(404);

    // Step 5: primary Contact designation.
    const contactB = await request(server)
      .post(`/api/v1/organizations/${organizationId}/customers/${customer.body.id}/contacts`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ firstName: 'Second', lastName: 'Contact' })
      .expect(201);
    await request(server)
      .post(`/api/v1/organizations/${organizationId}/contacts/${contactB.body.id}/set-primary`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);

    // Step 6: every mutation above is in the Audit Log.
    const auditLog = await request(server)
      .get(`/api/v1/organizations/${organizationId}/audit-log`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);
    const actions = auditLog.body.map((entry: { action: string }) => entry.action);
    expect(actions).toEqual(
      expect.arrayContaining(['ContactCreated', 'ContactUpdated', 'ContactArchived', 'ContactPrimaryChanged']),
    );
  });
});
