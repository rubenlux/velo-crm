import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createTestApp, resetDatabase } from '../test-app';

describe('Editar/eliminar un comentario propio vs ajeno (Clarifications, research.md #9)', () => {
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

  it('el autor puede editar/eliminar; el Propietario (sin ser autor) recibe 403', async () => {
    const owner = await registerAndLogin('activities-comments-ownership-owner@example.com');
    const ownerToken = owner.body.accessToken as string;
    const org = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Activities Comments Ownership Org', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);
    const organizationId = org.body.id as string;

    const sales = await registerAndLogin('activities-comments-ownership-sales@example.com');
    const invitation = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/invitations`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ email: 'activities-comments-ownership-sales@example.com', role: 'Ventas' })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/auth/invitations/${invitation.body.invitationToken}/accept`)
      .set('Authorization', `Bearer ${sales.body.accessToken}`)
      .expect(200);
    const salesToken = sales.body.accessToken as string;

    const customer = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/customers`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ name: 'Comments Ownership Corp' })
      .expect(201);

    const types = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}/activity-types`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);
    const nota = types.body.find((t: { name: string }) => t.name === 'Nota');

    const activity = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/activities`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ customerId: customer.body.id, activityTypeId: nota.id, title: 'Nota con comentario propio', scheduledAt: new Date().toISOString() })
      .expect(201);

    const comment = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/activities/${activity.body.id}/comments`)
      .set('Authorization', `Bearer ${salesToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ body: 'Comentario de Ventas' })
      .expect(201);

    // El Propietario (no autor) no puede editar/eliminar el comentario de Ventas —
    // sin excepción para Propietario (research.md #9).
    await request(app.getHttpServer())
      .patch(`/api/v1/organizations/${organizationId}/activities/${activity.body.id}/comments/${comment.body.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ body: 'Intento de edición ajena' })
      .expect(403);
    await request(app.getHttpServer())
      .delete(`/api/v1/organizations/${organizationId}/activities/${activity.body.id}/comments/${comment.body.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .expect(403);

    // El autor (Ventas) sí puede.
    const edited = await request(app.getHttpServer())
      .patch(`/api/v1/organizations/${organizationId}/activities/${activity.body.id}/comments/${comment.body.id}`)
      .set('Authorization', `Bearer ${salesToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ body: 'Comentario editado por su autor' })
      .expect(200);
    expect(edited.body.body).toBe('Comentario editado por su autor');

    await request(app.getHttpServer())
      .delete(`/api/v1/organizations/${organizationId}/activities/${activity.body.id}/comments/${comment.body.id}`)
      .set('Authorization', `Bearer ${salesToken}`)
      .set('X-Organization-Id', organizationId)
      .expect(204);
  });
});
