import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createTestApp, resetDatabase } from '../test-app';

describe('Edit a Contact (US1, Acceptance Scenario 2)', () => {
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

  it('saves the change and preserves the previous value in history', async () => {
    const owner = await registerAndLogin('contacts-update-owner@example.com');
    const org = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .send({ name: 'Contacts Update Org', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);
    const organizationId = org.body.id as string;
    const token = owner.body.accessToken as string;

    const customer = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/customers`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ name: 'Beta Corp' })
      .expect(201);
    const created = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/customers/${customer.body.id}/contacts`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ firstName: 'John', lastName: 'Smith', jobTitle: 'Buyer' })
      .expect(201);

    const updated = await request(app.getHttpServer())
      .patch(`/api/v1/organizations/${organizationId}/contacts/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ version: created.body.version, jobTitle: 'Purchasing Manager' })
      .expect(200);

    expect(updated.body.jobTitle).toBe('Purchasing Manager');
    expect(updated.body.version).toBe(2);

    const history = await prisma.contactHistory.findMany({ where: { contactId: created.body.id } });
    expect(history).toHaveLength(1);
    expect(history[0].changes).toMatchObject({ jobTitle: { before: 'Buyer', after: 'Purchasing Manager' } });
  });
});
