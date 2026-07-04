import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createTestApp, resetDatabase } from '../test-app';

describe('Transfer a Contact to another Customer (US5, Acceptance Scenario 1, research.md #5)', () => {
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

  it('preserves history and forces isPrimary to false on transfer', async () => {
    const owner = await registerAndLogin('contacts-transfer-owner@example.com');
    const org = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .send({ name: 'Transfer Org', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);
    const organizationId = org.body.id as string;
    const token = owner.body.accessToken as string;

    const customerA = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/customers`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ name: 'Mu Origin' })
      .expect(201);
    const customerB = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/customers`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ name: 'Nu Destination' })
      .expect(201);
    const contact = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/customers/${customerA.body.id}/contacts`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ firstName: 'Transfer', lastName: 'Me' })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/contacts/${contact.body.id}/set-primary`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);

    const transferred = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/contacts/${contact.body.id}/transfer`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ toCustomerId: customerB.body.id })
      .expect(201);

    expect(transferred.body.customerId).toBe(customerB.body.id);
    expect(transferred.body.company).toBe('Nu Destination');
    expect(transferred.body.isPrimary).toBe(false);

    const timeline = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}/contacts/${contact.body.id}/timeline`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);
    expect(timeline.body.some((entry: { detail: { action?: string } }) => entry.detail.action === 'ContactCustomerChanged')).toBe(
      true,
    );
  });
});
