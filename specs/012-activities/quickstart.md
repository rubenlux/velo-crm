# Quickstart: Gestión de Actividades

Guía manual para validar US1 (registro/gestión), US2 (resultado/próxima actividad) y
US3 (adjuntos/comentarios) una vez implementado el módulo `activities`, sin depender
de la fusión de línea de tiempo en otras entidades (US4) ni de la búsqueda avanzada
(US5).

## Prerrequisitos

- Backend NestJS corriendo localmente con PostgreSQL disponible (`velo_dev` para uso
  manual, no `velo_test`), migraciones de Prisma aplicadas, incluida la tabla
  `ActivityType` con el catálogo de 12 tipos por defecto ya seedeado por
  `DefaultActivityTypesSeeder`.
- Una Organization con Propietario, y al menos un Customer ya creado (spec 008).

## Escenario: alta y gestión de una Activity (US1)

1. `GET /organizations/:id/activity-types` sin haber creado ninguno custom.
   - **Verificar**: 200, aparecen los 12 tipos por defecto (Llamada, Reunión, Correo
     electrónico, Videollamada, Nota, Visita, Mensaje, Seguimiento, Presentación,
     Demostración, Capacitación, Otro).
2. `POST /organizations/:id/activities` con `customerId`, `activityTypeId` (Llamada),
   `title`, `scheduledAt`.
   - **Verificar**: 201, `status = Pendiente`, `authorUserId` = el usuario actual
     (Acceptance Scenario 1).
3. `POST /organizations/:id/activities` con `customerId` y `contactId` de un Contact
   de **otro** Customer a la vez.
   - **Verificar**: 400 — rechaza por inconsistencia entre las entidades
     relacionadas (research.md #2).
4. `PATCH /organizations/:id/activities/:activityId` con `{ version, status:
   'EnProceso' }`, luego con `{ version, status: 'Finalizada' }`.
   - **Verificar**: 200 en ambos; tras el segundo, `finishedAt` queda poblado
     (Acceptance Scenario 3).
5. Con una segunda Activity `Pendiente`, `POST .../cancel`.
   - **Verificar**: 200, `status = Cancelada` (Acceptance Scenario 4).
6. `POST .../reactivate` sobre esa misma Activity.
   - **Verificar**: 200, `status = Pendiente` (Clarifications).
7. Como Administrador, `POST /organizations/:id/activity-types` con un tipo custom
   (`"Café con cliente"`).
   - **Verificar**: 201 (requiere `activity.manage_types`); repetir como un usuario
     sin ese permiso debe dar 403.

## Escenario: resultado y próxima actividad (US2)

8. Sobre la Activity `Finalizada` del paso 4, `PATCH` con `{ version, result:
   'Cliente interesado, pidió cotización' }`.
   - **Verificar**: 200; intentar lo mismo sobre una Activity `Pendiente` da 409
     (Acceptance Scenario 1, research.md #12).
9. `POST /organizations/:id/activities/:activityId/schedule-follow-up` sobre esa
   misma Activity, con `{ activityTypeId: <Reunión>, title: 'Enviar cotización',
   scheduledAt: ... }`.
   - **Verificar**: 201; la nueva Activity queda `Pendiente`, con el mismo
     `customerId` que la origen y `originActivityId` apuntando a ella (Acceptance
     Scenario 2).

## Escenario: adjuntos y comentarios (US3)

10. `POST .../activities/:activityId/attachments` con `{ fileName, fileUrl }`.
    - **Verificar**: 201; `GET .../attachments` lo incluye (Acceptance Scenario 1).
11. `POST .../activities/:activityId/comments` con `{ body: 'Revisar antes del
    viernes' }` como Usuario A.
    - **Verificar**: 201; como Usuario B, `PATCH`/`DELETE` sobre ese comentario da
      403 (research.md #9); como Usuario A, ambos dan 200 (Acceptance Scenario 2 +
      Clarifications).
12. `POST .../activities/:activityId/cancel` sobre la Activity con el adjunto del
    paso 10.
    - **Verificar**: el adjunto sigue disponible en `GET .../attachments` (edge
      case de spec.md, RN-007).

## Validación del Audit Log (FR-012)

13. `GET /organizations/:id/audit-log` tras los pasos 2, 4, 5, 6, 8, 9, 10 y 11.
    - **Verificar**: aparecen `ActivityCreated`, `ActivityStatusChanged`,
      `ActivityCancelled`, `ActivityReactivated`, `ActivityResultRecorded`,
      `ActivityFollowUpScheduled`, `ActivityAttachmentAdded` y
      `ActivityCommentAdded` con actor y timestamp correctos.

Este flujo cubre US1, US2 y US3 (P1-P3). US4 (las Activities de este Customer
aparecen automáticamente en su línea de tiempo, research.md #13 — merge en el
frontend) y US5 (búsqueda <300ms) se validan por separado una vez esas historias
estén implementadas: para US4, basta con abrir `CustomerTimeline.tsx` en el
navegador y confirmar que las Activities creadas arriba aparecen intercaladas
cronológicamente junto al resto del historial del Customer, sin ningún paso manual
de vinculación.
