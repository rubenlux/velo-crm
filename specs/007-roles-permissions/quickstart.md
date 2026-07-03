# Quickstart: Roles & Permissions (RBAC)

Guía manual para validar la User Story 1 (asignar roles y ver el efecto inmediato) una
vez implementado el módulo `roles`, sin depender de roles personalizados ni de
disponibilidad por módulo (US3-US4).

## Prerrequisitos

- Backend NestJS corriendo localmente con PostgreSQL disponible y migraciones de
  Prisma aplicadas (mismo entorno que specs 004-006).
- Una Organization ya creada (spec 005) con su Propietario, y un segundo User con
  Membership en ella (vía invitación, spec 005) con rol base `Ventas`.

## Escenario: asignar/revocar un rol adicional y ver el efecto inmediato (US1)

1. Como Propietario, `GET /organizations/:id/members/:userId/effective-permissions`
   sobre el User `Ventas`.
   - **Verificar**: la lista incluye los permisos de `Ventas` (por ejemplo
     `lead.create`, `opportunity.update`) y no incluye `user.manage`.
2. `POST /organizations/:id/members/:userId/roles` asignando el rol por defecto
   `Contabilidad`.
   - **Verificar**: `GET .../effective-permissions` inmediato posterior incluye ahora
     también los permisos de `Contabilidad` (Acceptance Scenario 2, SC-001: <3s).
3. `DELETE /organizations/:id/members/:userId/roles/:roleId` (el de `Contabilidad`).
   - **Verificar**: los permisos de `Contabilidad` desaparecen de inmediato
     (Acceptance Scenario 3).
4. Con el token del User `Ventas` (sin `user.manage`), intentar
   `POST /organizations/:id/members/:otroUserId/deactivate` (spec 006, ahora protegido
   por `@RequirePermission('user.manage')` — research.md #6).
   - **Verificar**: rechazado (403) y queda una entrada `PermissionDenied` en el
     Audit Log (Acceptance Scenario 4, SC-002).

## Validación de escalamiento de privilegios (FR-013, SC-003)

5. Con el token de un Administrador cuyo rol base **no** incluye `role.manage`
   (si se configuró así), intentar asignar a otro User un rol personalizado que
   otorgue un permiso que ese Administrador no posee.
   - **Verificar**: rechazado con un error de escalamiento de privilegios.

## Validación del Audit Log (FR-014, SC-005)

6. `GET /organizations/:id/audit-log` tras los pasos 2, 3 y 4.
   - **Verificar**: aparecen entradas de asignación, revocación y `PermissionDenied`
     con el actor y el timestamp correctos.

Este flujo cubre el criterio de éxito SC-001 (cambio de permisos reflejado en <3s) y
sirve de base para los tests de integración/E2E que se detallarán en `tasks.md`
(`/speckit-tasks`).
