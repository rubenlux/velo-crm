import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createTestApp, resetDatabase } from '../test-app';

describe('Una Activity asociada a Contact + Opportunity aparece al buscar por cualquiera de los dos (US4, Acceptance Scenario 2)', () => {
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

  it('la misma Activity aparece tanto en la búsqueda por contactId como por opportunityId', async () => {
    const owner = await registerAndLogin('activities-multi-relation-owner@example.com');
    const token = owner.body.accessToken as string;
    const org = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Activities Multi Relation Org', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);
    const organizationId = org.body.id as string;

    const customer = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/customers`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ name: 'Multi Relation Corp' })
      .expect(201);

    const contact = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/customers/${customer.body.id}/contacts`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ firstName: 'Multi', lastName: 'Relation' })
      .expect(201);

    const opportunity = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/opportunities`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({ customerId: customer.body.id, name: 'Multi Relation Deal' })
      .expect(201);

    const types = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}/activity-types`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);
    const reunion = types.body.find((t: { name: string }) => t.name === 'Reunión');

    const activity = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/activities`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({
        contactId: contact.body.id,
        opportunityId: opportunity.body.id,
        activityTypeId: reunion.id,
        title: 'Reunión con Contact y Opportunity',
        scheduledAt: new Date().toISOString(),
      })
      .expect(201);

    const byContact = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}/activities`)
      .query({ contactId: contact.body.id })
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);
    expect(byContact.body.items.map((a: { id: string }) => a.id)).toContain(activity.body.id);

    const byOpportunity = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}/activities`)
      .query({ opportunityId: opportunity.body.id })
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);
    expect(byOpportunity.body.items.map((a: { id: string }) => a.id)).toContain(activity.body.id);
  });
});
