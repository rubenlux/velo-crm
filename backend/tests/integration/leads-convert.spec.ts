import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createTestApp, resetDatabase } from '../test-app';

describe('Convert a qualified Lead (US3, Acceptance Scenario 1)', () => {
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

  it('creates a Customer, a primary Contact and an Opportunity in one operation', async () => {
    const owner = await registerAndLogin('leads-convert-owner@example.com');
    const token = owner.body.accessToken as string;
    const org = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Leads Convert Org', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);
    const organizationId = org.body.id as string;

    const lead = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/leads`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ name: 'Ana Torres', company: 'Torres SA', email: 'ana@torres.com', phone: '555-1000' })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/v1/organizations/${organizationId}/leads/${lead.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ version: lead.body.version, status: 'Calificado' })
      .expect(200);

    const converted = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/leads/${lead.body.id}/convert`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({})
      .expect(201);

    expect(converted.body.customer).toMatchObject({ name: 'Torres SA', email: 'ana@torres.com' });
    expect(converted.body.contact).toMatchObject({ firstName: 'Ana', lastName: 'Torres', isPrimary: true, customerId: converted.body.customer.id });
    expect(converted.body.opportunity).toMatchObject({
      customerId: converted.body.customer.id,
      contactId: converted.body.contact.id,
      leadId: lead.body.id,
      state: 'Abierta',
    });
    expect(converted.body.opportunity.stage.name).toBe('Nueva');

    const fetchedCustomer = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}/customers/${converted.body.customer.id}`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);
    expect(fetchedCustomer.body.id).toBe(converted.body.customer.id);

    const fetchedContact = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}/contacts/${converted.body.contact.id}`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);
    expect(fetchedContact.body.id).toBe(converted.body.contact.id);
  });
});
