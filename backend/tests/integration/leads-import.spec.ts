import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createTestApp, resetDatabase } from '../test-app';

describe('Import Leads in batch (US5, Acceptance Scenario 2, FR-002)', () => {
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

  it('creates Leads in status Nuevo respecting manual-creation validations', async () => {
    const owner = await registerAndLogin('leads-import-owner@example.com');
    const token = owner.body.accessToken as string;
    const org = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Leads Import Org', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);
    const organizationId = org.body.id as string;

    const csv = ['"name","company","email"', '"Pedro Sanchez","Sanchez SA","pedro@sanchez.com"', '"","Sin Nombre SA",""'].join('\n');

    const result = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/leads/import`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ csv })
      .expect(201);

    expect(result.body.created).toBe(1);
    expect(result.body.rejected).toHaveLength(1);
    expect(result.body.rejected[0].reason).toBe('missing_name');

    const list = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}/leads`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);
    expect(list.body.items).toHaveLength(1);
    expect(list.body.items[0]).toMatchObject({ name: 'Pedro Sanchez', status: 'Nuevo' });
  });
});
