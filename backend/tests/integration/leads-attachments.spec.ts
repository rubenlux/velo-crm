import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createTestApp, resetDatabase } from '../test-app';

describe('Attach a document to a Lead (US2, Acceptance Scenario 4)', () => {
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

  it('associates an attachment and leaves it accessible from the Lead', async () => {
    const owner = await registerAndLogin('leads-attachments-owner@example.com');
    const token = owner.body.accessToken as string;
    const org = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Leads Attachments Org', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);
    const organizationId = org.body.id as string;

    const lead = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/leads`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ name: 'Adjunto Test' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/leads/${lead.body.id}/attachments`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ fileName: 'propuesta.pdf', fileUrl: 'https://files.example.com/propuesta.pdf' })
      .expect(201);

    const attachments = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}/leads/${lead.body.id}/attachments`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);
    expect(attachments.body).toHaveLength(1);
    expect(attachments.body[0]).toMatchObject({ fileName: 'propuesta.pdf', fileUrl: 'https://files.example.com/propuesta.pdf' });
  });
});
