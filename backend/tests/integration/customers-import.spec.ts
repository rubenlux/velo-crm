import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createTestApp, resetDatabase } from '../test-app';

describe('Import Customers from CSV (US5, Acceptance Scenario 3, Edge Case, FR-014)', () => {
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

  it('creates Customers respecting validation/uniqueness, rejecting a duplicate row without aborting the batch', async () => {
    const owner = await registerAndLogin('customers-import-owner@example.com');
    const org = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .send({ name: 'Import Org', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);
    const organizationId = org.body.id as string;
    const token = owner.body.accessToken as string;

    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/customers`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ name: 'Existing Customer', taxId: '20-88888888-3' })
      .expect(201);

    const header =
      'name,legalName,tradeName,type,taxId,taxCondition,email,phone,website,country,state,city,address,ownerUserId,source,category,tags,priority';
    const goodRow = '"New Customer One","","","company","","","","","","","","","","","","","",""';
    const duplicateRow = '"Duplicate Row","","","company","20-88888888-3","","","","","","","","","","","",""';
    const csv = [header, goodRow, duplicateRow].join('\n');

    const result = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/customers/import`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ csv })
      .expect(201);

    expect(result.body.created).toBe(1);
    expect(result.body.rejected).toHaveLength(1);
    expect(result.body.rejected[0]).toMatchObject({ row: 3, reason: 'CustomerDuplicateTaxIdError' });

    const listed = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}/customers?q=New Customer One`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);
    expect(listed.body.items).toHaveLength(1);
  });
});
