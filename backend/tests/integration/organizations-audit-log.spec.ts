import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createTestApp, resetDatabase } from '../test-app';

describe('Organizations Audit Log (FR-013, SC-004)', () => {
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

  it('records OrganizationCreated and OrganizationUpdated, queryable via the audit-log endpoint', async () => {
    const email = 'audit-owner@example.com';
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password: 'Sup3rSecret!' })
      .expect(201);

    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: 'Sup3rSecret!' })
      .expect(200);

    const org = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send({ name: 'Auditable Org', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/v1/organizations/${org.body.id}`)
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .set('X-Organization-Id', org.body.id)
      .send({ name: 'Renamed Org' })
      .expect(200);

    const auditLog = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${org.body.id}/audit-log`)
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .set('X-Organization-Id', org.body.id)
      .expect(200);

    const actions = auditLog.body.map((entry: { action: string }) => entry.action);
    expect(actions).toEqual(expect.arrayContaining(['OrganizationCreated', 'OrganizationUpdated']));
    expect(auditLog.body.every((entry: { organizationId: string }) => entry.organizationId === org.body.id)).toBe(
      true,
    );
  });
});
