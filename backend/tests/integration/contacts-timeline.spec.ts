import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createTestApp, resetDatabase } from '../test-app';

describe('Contact timeline shows events in chronological order (US4, Acceptance Scenario 1)', () => {
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

  it('includes creation, an edit and archive in order', async () => {
    const owner = await registerAndLogin('contacts-timeline-owner@example.com');
    const org = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .send({ name: 'Contacts Timeline Org', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);
    const organizationId = org.body.id as string;
    const token = owner.body.accessToken as string;

    const customer = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/customers`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ name: 'Kappa SA' })
      .expect(201);
    const created = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/customers/${customer.body.id}/contacts`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ firstName: 'Timeline', lastName: 'Contact', city: 'Salta' })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/v1/organizations/${organizationId}/contacts/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ version: created.body.version, city: 'Jujuy' })
      .expect(200);

    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/contacts/${created.body.id}/archive`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);

    const timeline = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}/contacts/${created.body.id}/timeline`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);

    expect(timeline.body).toHaveLength(4);
    const types = timeline.body.map((entry: { detail: { action?: string } }) => entry.detail.action ?? 'edit');
    expect(types).toEqual(['ContactCreated', 'edit', 'ContactUpdated', 'ContactArchived']);
  });
});
