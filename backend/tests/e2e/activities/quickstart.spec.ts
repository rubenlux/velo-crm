import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../../src/shared/prisma/prisma.service';
import { createTestApp, resetDatabase } from '../../test-app';

/**
 * End-to-end walk of specs/012-activities/quickstart.md: tipos por defecto, alta,
 * rechazo por entidades relacionadas incoherentes, transición de estado, cancelar/
 * reactivar, tipo custom (gated por activity.manage_types), resultado, próxima
 * actividad, adjuntos, comentarios (con chequeo de autoría) y Audit Log.
 */
describe('E2E: Activities quickstart (US1, US2, US3)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  afterAll(async () => {
    await resetDatabase(prisma);
    await app.close();
  });

  async function registerAndLogin(email: string) {
    await request(app.getHttpServer()).post('/api/v1/auth/register').send({ email, password: 'Sup3rSecret!' }).expect(201);
    return request(app.getHttpServer()).post('/api/v1/auth/login').send({ email, password: 'Sup3rSecret!' }).expect(200);
  }

  it('walks default types -> create -> relations mismatch rejected -> status transitions -> cancel/reactivate -> custom type -> result -> follow-up -> attachments -> comments -> audit log', async () => {
    const server = app.getHttpServer();

    const owner = await registerAndLogin('activities-quickstart-owner@example.com');
    const ownerToken = owner.body.accessToken as string;
    const org = await request(server)
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Activities Quickstart Org', timezone: 'UTC', currency: 'USD', language: 'en' })
      .expect(201);
    const organizationId = org.body.id as string;

    const sales = await registerAndLogin('activities-quickstart-sales@example.com');
    const invitation = await request(server)
      .post(`/api/v1/organizations/${organizationId}/invitations`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ email: 'activities-quickstart-sales@example.com', role: 'Ventas' })
      .expect(201);
    await request(server)
      .post(`/api/v1/auth/invitations/${invitation.body.invitationToken}/accept`)
      .set('Authorization', `Bearer ${sales.body.accessToken}`)
      .expect(200);
    const salesToken = sales.body.accessToken as string;

    const customerA = await request(server)
      .post(`/api/v1/organizations/${organizationId}/customers`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ name: 'Quickstart Corp A' })
      .expect(201);
    const customerB = await request(server)
      .post(`/api/v1/organizations/${organizationId}/customers`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ name: 'Quickstart Corp B' })
      .expect(201);
    const contactB = await request(server)
      .post(`/api/v1/organizations/${organizationId}/customers/${customerB.body.id}/contacts`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ firstName: 'Beto', lastName: 'B' })
      .expect(201);

    // Step 1: tipos por defecto (US1).
    const types = await request(server)
      .get(`/api/v1/organizations/${organizationId}/activity-types`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);
    expect(types.body).toHaveLength(12);
    const llamada = types.body.find((t: { name: string }) => t.name === 'Llamada');
    const reunion = types.body.find((t: { name: string }) => t.name === 'Reunión');

    // Step 2: alta (US1, Acceptance Scenario 1).
    const activity = await request(server)
      .post(`/api/v1/organizations/${organizationId}/activities`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ customerId: customerA.body.id, activityTypeId: llamada.id, title: 'Llamada quickstart', scheduledAt: new Date().toISOString() })
      .expect(201);
    expect(activity.body).toMatchObject({ status: 'Pendiente', authorUserId: owner.body.user.id });

    // Step 3: entidades relacionadas incoherentes rechazadas (research.md #2).
    await request(server)
      .post(`/api/v1/organizations/${organizationId}/activities`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ customerId: customerA.body.id, contactId: contactB.body.id, activityTypeId: llamada.id, title: 'Incoherente', scheduledAt: new Date().toISOString() })
      .expect(400);

    // Step 4: transición de estado (US1, Acceptance Scenario 3).
    const inProgress = await request(server)
      .patch(`/api/v1/organizations/${organizationId}/activities/${activity.body.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ version: activity.body.version, status: 'EnProceso' })
      .expect(200);
    const finished = await request(server)
      .patch(`/api/v1/organizations/${organizationId}/activities/${activity.body.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ version: inProgress.body.version, status: 'Finalizada' })
      .expect(200);
    expect(finished.body.finishedAt).not.toBeNull();

    // Step 5-6: cancelar/reactivar sobre una segunda Activity (US1, Acceptance Scenario 4, Clarifications).
    const second = await request(server)
      .post(`/api/v1/organizations/${organizationId}/activities`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ customerId: customerA.body.id, activityTypeId: llamada.id, title: 'Segunda Activity', scheduledAt: new Date().toISOString() })
      .expect(201);
    await request(server)
      .post(`/api/v1/organizations/${organizationId}/activities/${second.body.id}/cancel`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);
    await request(server)
      .post(`/api/v1/organizations/${organizationId}/activities/${second.body.id}/reactivate`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);

    // Step 7: tipo custom gated por activity.manage_types.
    await request(server)
      .post(`/api/v1/organizations/${organizationId}/activity-types`)
      .set('Authorization', `Bearer ${salesToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ name: 'Café con cliente' })
      .expect(403);
    await request(server)
      .post(`/api/v1/organizations/${organizationId}/activity-types`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ name: 'Café con cliente' })
      .expect(201);

    // Step 8: resultado sobre la Activity Finalizada (US2, Acceptance Scenario 1);
    // intentarlo sobre `second` (Pendiente, reactivada en el paso 6) da 409.
    const secondFetched = await request(server)
      .get(`/api/v1/organizations/${organizationId}/activities/${second.body.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);
    await request(server)
      .patch(`/api/v1/organizations/${organizationId}/activities/${second.body.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ version: secondFetched.body.version, result: 'No debería aplicar' })
      .expect(409);
    const withResult = await request(server)
      .patch(`/api/v1/organizations/${organizationId}/activities/${activity.body.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ version: finished.body.version, result: 'Cliente interesado, pidió cotización' })
      .expect(200);

    // Step 9: próxima actividad programada (US2, Acceptance Scenario 2).
    const followUp = await request(server)
      .post(`/api/v1/organizations/${organizationId}/activities/${activity.body.id}/schedule-follow-up`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ activityTypeId: reunion.id, title: 'Enviar cotización', scheduledAt: new Date(Date.now() + 86400000).toISOString() })
      .expect(201);
    expect(followUp.body).toMatchObject({ status: 'Pendiente', customerId: customerA.body.id, originActivityId: activity.body.id });

    // Step 10: adjuntos (US3, Acceptance Scenario 1).
    await request(server)
      .post(`/api/v1/organizations/${organizationId}/activities/${activity.body.id}/attachments`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ fileName: 'cotizacion.pdf', fileUrl: 'https://files.example.com/cotizacion.pdf' })
      .expect(201);

    // Step 11: comentarios con chequeo de autoría (US3, Acceptance Scenario 2, research.md #9).
    const comment = await request(server)
      .post(`/api/v1/organizations/${organizationId}/activities/${activity.body.id}/comments`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ body: 'Revisar antes del viernes' })
      .expect(201);
    await request(server)
      .patch(`/api/v1/organizations/${organizationId}/activities/${activity.body.id}/comments/${comment.body.id}`)
      .set('Authorization', `Bearer ${salesToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ body: 'Intento ajeno' })
      .expect(403);
    await request(server)
      .patch(`/api/v1/organizations/${organizationId}/activities/${activity.body.id}/comments/${comment.body.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .send({ body: 'Editado por su autor' })
      .expect(200);

    // Step 12: el adjunto sobrevive a la cancelación (edge case, RN-007).
    await request(server)
      .post(`/api/v1/organizations/${organizationId}/activities/${activity.body.id}/cancel`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);
    const attachmentsAfterCancel = await request(server)
      .get(`/api/v1/organizations/${organizationId}/activities/${activity.body.id}/attachments`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);
    expect(attachmentsAfterCancel.body).toHaveLength(1);

    // Step 13: Audit Log (FR-012).
    const auditLog = await request(server)
      .get(`/api/v1/organizations/${organizationId}/audit-log`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);
    const actions = auditLog.body.map((entry: { action: string }) => entry.action);
    expect(actions).toEqual(
      expect.arrayContaining([
        'ActivityCreated',
        'ActivityStatusChanged',
        'ActivityCancelled',
        'ActivityReactivated',
        'ActivityResultRecorded',
        'ActivityFollowUpScheduled',
        'ActivityAttachmentAdded',
        'ActivityCommentAdded',
      ]),
    );

    expect(withResult.body.result).toBe('Cliente interesado, pidió cotización');
  });
});
