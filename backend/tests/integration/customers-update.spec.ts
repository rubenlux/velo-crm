import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createTestApp, resetDatabase } from '../test-app';

describe('Edit a Customer (US1, Acceptance Scenario 2)', () => {
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
    const owner = await registerAndLogin('customers-update-owner@example.com');
    const org = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .send({ name: 'Customers Update Org', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);
    const organizationId = org.body.id as string;
    const ownerToken = owner.body.accessToken as string;

    const created = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/customers`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ name: 'Beta Corp', phone: '111-1111' })
      .expect(201);

    const updated = await request(app.getHttpServer())
      .patch(`/api/v1/organizations/${organizationId}/customers/${created.body.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ version: created.body.version, phone: '222-2222' })
      .expect(200);

    expect(updated.body.phone).toBe('222-2222');
    expect(updated.body.version).toBe(2);

    const history = await prisma.customerHistory.findMany({ where: { customerId: created.body.id } });
    expect(history).toHaveLength(1);
    expect(history[0].changes).toMatchObject({ phone: { before: '111-1111', after: '222-2222' } });
  });
});
