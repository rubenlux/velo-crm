import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createTestApp, resetDatabase } from '../test-app';

describe('Merging Contacts of different Customers is rejected (Edge Case, research.md #6)', () => {
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

  it('rejects merging two Contacts that belong to different Customers', async () => {
    const owner = await registerAndLogin('contacts-merge-mismatch-owner@example.com');
    const org = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .send({ name: 'Merge Mismatch Org', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);
    const organizationId = org.body.id as string;
    const token = owner.body.accessToken as string;

    const customerA = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/customers`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ name: 'Omicron A' })
      .expect(201);
    const customerB = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/customers`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ name: 'Omicron B' })
      .expect(201);
    const contactA = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/customers/${customerA.body.id}/contacts`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ firstName: 'From', lastName: 'A' })
      .expect(201);
    const contactB = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/customers/${customerB.body.id}/contacts`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ firstName: 'From', lastName: 'B' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/contacts/merge`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ survivorContactId: contactA.body.id, discardedContactId: contactB.body.id })
      .expect(400);
  });
});
