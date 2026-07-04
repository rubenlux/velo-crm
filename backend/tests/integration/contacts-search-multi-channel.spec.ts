import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createTestApp, resetDatabase } from '../test-app';

describe('A Contact with multiple emails/phones is found by any of them (US3, Acceptance Scenario 2)', () => {
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

  it('appears in results when searching by a secondary email or phone', async () => {
    const owner = await registerAndLogin('contacts-multi-channel-owner@example.com');
    const org = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .send({ name: 'Multi Channel Org', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);
    const organizationId = org.body.id as string;
    const token = owner.body.accessToken as string;

    const customer = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/customers`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ name: 'Iota Inc' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/customers/${customer.body.id}/contacts`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({
        firstName: 'Multi',
        lastName: 'Channel',
        primaryEmail: 'primary@iota.com',
        secondaryEmails: ['secondary@iota.com'],
        primaryPhone: '111-0000',
        secondaryPhones: ['222-0000'],
      })
      .expect(201);

    const bySecondaryEmail = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}/contacts?q=secondary@iota.com`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);
    expect(bySecondaryEmail.body.items).toHaveLength(1);

    const bySecondaryPhone = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}/contacts?q=222-0000`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);
    expect(bySecondaryPhone.body.items).toHaveLength(1);
  });
});
