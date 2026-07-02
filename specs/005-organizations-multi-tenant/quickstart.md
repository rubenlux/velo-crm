# Quickstart: Organizations (Multi-Tenant)

Guía manual para validar la User Story 1 (crear y configurar una Organization) una vez
implementado el módulo `organizations`, sin depender de branding/impuestos/módulos,
invitaciones, cambio de plan ni suspensión (US2-US5).

## Prerrequisitos

- Backend NestJS corriendo localmente con PostgreSQL disponible y migraciones de Prisma
  aplicadas (mismo entorno que spec 004, ver `docs/implementation-plan.md`).
- Un User ya registrado y logueado (spec 004) con un access token válido — Organizations
  no redefine cómo autenticarse.

## Escenario: crear, configurar y aislar (US1)

1. Con el access token del User, `POST /organizations` con nombre, timezone, moneda e
   idioma.
   - **Verificar**: se crea la Organization; el User creador queda con una Membership
     `Propietario` en ella (Acceptance Scenario 1).
2. `GET /organizations/:id` usando ese mismo `id` como header `X-Organization-Id`.
   - **Verificar**: devuelve los valores por defecto configurados en el paso 1
     (Acceptance Scenario 2).
3. `PATCH /organizations/:id` cambiando el nombre.
   - **Verificar**: el cambio se refleja en un `GET` inmediato posterior (Acceptance
     Scenario 3, SC-003: <5s).
4. Crear una segunda Organization con un segundo User, y repetir el `GET` del paso 2
   usando el `id` de la primera Organization pero el token/Membership del segundo User.
   - **Verificar**: acceso denegado — `TenantContextGuard` rechaza la request por no
     existir Membership del segundo User en la primera Organization (Acceptance Scenario
     4, FR-011).

## Validación del invariante de Propietario (FR-012)

5. Con la única Membership Propietario de una Organization, intentar removerla (fuera de
   los endpoints expuestos en esta fase, se valida a nivel de dominio).
   - **Verificar**: el sistema rechaza la operación con un error explícito en vez de
     dejar la Organization sin Propietario.

## Validación del Audit Log (FR-013, SC-004)

6. `GET /organizations/:id/audit-log` tras los pasos 1 y 3.
   - **Verificar**: aparecen las entradas `OrganizationCreated` y `OrganizationUpdated`
     con el `actorUserId` y timestamp correctos.

Este flujo cubre el criterio de éxito SC-001 (crear y operar una Organization en <2
minutos) y SC-002/SC-003 (aislamiento y propagación de configuración), y sirve de base
para los tests de integración/E2E que se detallarán en `tasks.md` (`/speckit-tasks`).
