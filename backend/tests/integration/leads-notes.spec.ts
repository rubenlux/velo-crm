import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createTestApp, resetDatabase } from '../test-app';

describe('Add notes to a Lead (US2, Acceptance Scenario 2)', () => {
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

  it('associates unlimited notes with a Lead', async () => {
    const owner = await registerAndLogin('leads-notes-owner@example.com');
    const token = owner.body.accessToken as string;
    const org = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Leads Notes Org', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);
    const organizationId = org.body.id as string;

    const lead = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/leads`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ name: 'Nota Test' })
      .expect(201);

    for (let i = 0; i < 3; i += 1) {
      await request(app.getHttpServer())
        .post(`/api/v1/organizations/${organizationId}/leads/${lead.body.id}/notes`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Organization-Id', organizationId)
        .send({ note: `Note number ${i}` })
        .expect(201);
    }

    const notes = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}/leads/${lead.body.id}/notes`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);
    expect(notes.body).toHaveLength(3);
  });
});
