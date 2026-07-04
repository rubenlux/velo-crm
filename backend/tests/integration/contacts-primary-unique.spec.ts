import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createTestApp, resetDatabase } from '../test-app';

describe('At most one primary Contact per Customer at a time (US2, Acceptance Scenario 2, SC-004)', () => {
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

  it('unmarks the previous primary automatically when a new one is set', async () => {
    const owner = await registerAndLogin('contacts-primary-unique-owner@example.com');
    const org = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .send({ name: 'Primary Unique Org', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);
    const organizationId = org.body.id as string;
    const token = owner.body.accessToken as string;

    const customer = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/customers`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ name: 'Zeta Corp' })
      .expect(201);
    const contactA = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/customers/${customer.body.id}/contacts`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ firstName: 'Contact', lastName: 'A' })
      .expect(201);
    const contactB = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/customers/${customer.body.id}/contacts`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ firstName: 'Contact', lastName: 'B' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/contacts/${contactA.body.id}/set-primary`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);
    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/contacts/${contactB.body.id}/set-primary`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);

    const refreshedA = await prisma.contact.findUniqueOrThrow({ where: { id: contactA.body.id } });
    const refreshedB = await prisma.contact.findUniqueOrThrow({ where: { id: contactB.body.id } });
    expect(refreshedA.isPrimary).toBe(false);
    expect(refreshedB.isPrimary).toBe(true);

    const primaryCount = await prisma.contact.count({ where: { customerId: customer.body.id, isPrimary: true } });
    expect(primaryCount).toBe(1);
  });
});
