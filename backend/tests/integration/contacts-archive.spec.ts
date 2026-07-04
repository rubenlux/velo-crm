import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createTestApp, resetDatabase } from '../test-app';

describe('Archive a Contact (US1, Acceptance Scenario 3)', () => {
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

  it('moves the Contact to archived without physical deletion', async () => {
    const owner = await registerAndLogin('contacts-archive-owner@example.com');
    const org = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .send({ name: 'Contacts Archive Org', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);
    const organizationId = org.body.id as string;
    const token = owner.body.accessToken as string;

    const customer = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/customers`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ name: 'Gamma Inc' })
      .expect(201);
    const created = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/customers/${customer.body.id}/contacts`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ firstName: 'Archive', lastName: 'Me' })
      .expect(201);

    const archived = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/contacts/${created.body.id}/archive`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);

    expect(archived.body.status).toBe('archived');

    const stillThere = await prisma.contact.findUnique({ where: { id: created.body.id } });
    expect(stillThere).not.toBeNull();
  });
});
