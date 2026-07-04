import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createTestApp, resetDatabase } from '../test-app';

describe('Merge duplicate Customers (US5, Acceptance Scenario 1, research.md #6)', () => {
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

  it('keeps a single Customer with combined history; the discarded one is inaccessible', async () => {
    const owner = await registerAndLogin('customers-merge-owner@example.com');
    const org = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .send({ name: 'Merge Org', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);
    const organizationId = org.body.id as string;
    const token = owner.body.accessToken as string;

    const survivor = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/customers`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ name: 'Survivor Inc' })
      .expect(201);
    const discarded = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/customers`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ name: 'Duplicate Inc' })
      .expect(201);

    // Give the discarded Customer its own history entry to prove it survives the merge.
    await request(app.getHttpServer())
      .patch(`/api/v1/organizations/${organizationId}/customers/${discarded.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ version: discarded.body.version, city: 'Salta' })
      .expect(200);

    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/customers/merge`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ survivorCustomerId: survivor.body.id, discardedCustomerId: discarded.body.id })
      .expect(201);

    const timeline = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}/customers/${survivor.body.id}/timeline`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);
    const editEntries = timeline.body.filter((entry: { type: string }) => entry.type === 'edit');
    expect(editEntries.some((entry: { detail: { changes: unknown } }) => JSON.stringify(entry.detail.changes).includes('Salta'))).toBe(
      true,
    );

    const discardedFetch = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}/customers/${discarded.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .expect(409);
    expect(discardedFetch.body.survivorCustomerId).toBe(survivor.body.id);
  });
});
