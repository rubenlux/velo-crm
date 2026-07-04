import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createTestApp, resetDatabase } from '../test-app';

describe('Merge duplicate Contacts of the same Customer (US5, Acceptance Scenario 2)', () => {
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

  it('keeps a single Contact with combined history', async () => {
    const owner = await registerAndLogin('contacts-merge-owner@example.com');
    const org = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .send({ name: 'Contacts Merge Org', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);
    const organizationId = org.body.id as string;
    const token = owner.body.accessToken as string;

    const customer = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/customers`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ name: 'Xi Corp' })
      .expect(201);
    const survivor = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/customers/${customer.body.id}/contacts`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ firstName: 'Survivor', lastName: 'Contact' })
      .expect(201);
    const discarded = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/customers/${customer.body.id}/contacts`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ firstName: 'Duplicate', lastName: 'Contact' })
      .expect(201);
    await request(app.getHttpServer())
      .patch(`/api/v1/organizations/${organizationId}/contacts/${discarded.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ version: discarded.body.version, jobTitle: 'Old Title' })
      .expect(200);

    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/contacts/merge`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ survivorContactId: survivor.body.id, discardedContactId: discarded.body.id })
      .expect(201);

    const timeline = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}/contacts/${survivor.body.id}/timeline`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);
    const editEntries = timeline.body.filter((entry: { type: string }) => entry.type === 'edit');
    expect(
      editEntries.some((entry: { detail: { changes: unknown } }) => JSON.stringify(entry.detail.changes).includes('Old Title')),
    ).toBe(true);

    await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}/contacts/${discarded.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .expect(409);
  });
});
