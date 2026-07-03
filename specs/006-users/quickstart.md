# Quickstart: Users

Guía manual para validar la User Story 1 (editar perfil y preferencias) una vez
implementado el módulo `users`, sin depender de cambio de Organization, administración
de ciclo de vida ni historial de accesos (US2-US4).

## Prerrequisitos

- Backend NestJS corriendo localmente con PostgreSQL disponible y migraciones de Prisma
  aplicadas (mismo entorno que specs 004/005).
- Un User ya registrado y logueado (spec 004) con un access token válido.

## Escenario: editar perfil y preferencias (US1)

1. `GET /users/me` con el access token.
   - **Verificar**: devuelve el perfil con los valores por defecto
     (`language: "es"`, `timezone: "UTC"`, `status: "Active"`).
2. `PATCH /users/me/profile` con `{ firstName, lastName, avatarUrl, language, timezone }`.
   - **Verificar**: `GET /users/me` inmediato posterior refleja los cambios
     (Acceptance Scenario 1-2, SC-001: <3s).
3. `PATCH /users/me/preferences` con `{ notifications: { email: false } }`.
   - **Verificar**: `GET /users/me` refleja las preferencias guardadas (Acceptance
     Scenario 3).
4. `GET /organizations/:id/audit-log` (de una Organization donde el User sea
   Propietario/Administrador) tras los pasos 2 y 3.
   - **Verificar**: aparecen entradas de auditoría del cambio de perfil (Acceptance
     Scenario 4, FR-013, SC-003).

## Validación del invariante de administrador (FR-008, relacionado con US3)

5. Con el único Propietario/Administrador activo de una Organization, intentar
   `POST /organizations/:id/members/:userId/deactivate` sobre sí mismo (o sobre el único
   otro administrador).
   - **Verificar**: el sistema rechaza la operación (SC-004: 100% de las veces).

## Validación del bloqueo por estado (FR-012, relacionado con US3)

6. Desactivar a un User de una Organization (`POST .../deactivate`) y luego, con el
   token de ese User, intentar `GET /organizations/:id` de esa misma Organization.
   - **Verificar**: acceso denegado (SC-005), aunque el login de ese User siga
     funcionando con sus credenciales.

Este flujo cubre el criterio de éxito SC-001 (perfil editable en <3s) y sirve de base
para los tests de integración/E2E que se detallarán en `tasks.md` (`/speckit-tasks`).
