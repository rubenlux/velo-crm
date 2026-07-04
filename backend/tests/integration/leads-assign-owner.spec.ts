import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createTestApp, resetDatabase } from '../test-app';

describe('Assign a responsable to an unowned Lead (US1, Acceptance Scenario 4)', () => {
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

  it('makes an unowned Lead appear in that responsable work list once assigned', async () => {
    const admin = await registerAndLogin('leads-assign-admin@example.com');
    const token = admin.body.accessToken as string;
    const org = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Leads Assign Org', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);
    const organizationId = org.body.id as string;

    const lead = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/leads`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ name: 'Sin Responsable' })
      .expect(201);
    expect(lead.body.ownerUserId).toBeNull();

    await request(app.getHttpServer())
      .patch(`/api/v1/organizations/${organizationId}/leads/${lead.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ version: lead.body.version, ownerUserId: admin.body.user.id })
      .expect(200);

    const list = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}/leads`)
      .query({ ownerUserId: admin.body.user.id })
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);
    expect(list.body.items.some((item: { id: string }) => item.id === lead.body.id)).toBe(true);
  });
});
