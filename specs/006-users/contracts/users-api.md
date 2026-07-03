# API Contract: Users

API REST expuesta por el módulo `users` (NestJS). El frontend React consume exactamente
estos mismos endpoints (Constitución, Principio VI). Todas las rutas exigen
`Authorization: Bearer <access-token>` (spec 004, `AuthGuard` global — ver spec
004/005 hardening); las rutas bajo `/organizations/:organizationId/...` exigen además el
header `X-Organization-Id` validado por `TenantContextGuard` (spec 005, extendido en
research.md #5 de esta spec para chequear también `User.status`).

## Perfil propio (US1 → FR-002, FR-003)

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/users/me` | Perfil completo del User autenticado (incluye `status`). |
| PATCH | `/users/me/profile` | Actualiza nombre/apellido/avatar/idioma/zona horaria. |
| PATCH | `/users/me/preferences` | Actualiza preferencias (JSON libre). |

## Organizaciones propias (US2 → FR-009, FR-010)

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/users/me/organizations` | Lista las Organizations donde el User tiene Membership activa, con su Role en cada una. "Cambiar" de Organization activa no muta estado en el servidor — el cliente simplemente usa un `X-Organization-Id` distinto en la siguiente request (research.md #2). |

## Historial de accesos (US4 → FR-011)

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/users/me/access-history` | Lista los accesos recientes del propio User (proyección de solo lectura sobre `Session`, research.md #3). Nunca expone accesos de otro User. |

## Administración de ciclo de vida dentro de una Organization (US3 → FR-005, FR-006, FR-007, FR-008)

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/organizations/:organizationId/members/:userId/deactivate` | `Active → Inactive`. Solo Propietario/Administrador. Rechaza si `userId` es el único administrador activo (FR-008). |
| POST | `/organizations/:organizationId/members/:userId/reactivate` | `Inactive → Active`. Rechaza si el User está `Deleted` (FR-007, terminal). |
| DELETE | `/organizations/:organizationId/members/:userId` | Soft delete (`→ Deleted`). Rechaza si `userId` es el único administrador activo (FR-008). |

La creación de Users (FR-001) reutiliza el flujo de invitación ya implementado en
[specs/005-organizations-multi-tenant/contracts/organizations-api.md](../../005-organizations-multi-tenant/contracts/organizations-api.md)
(`POST /organizations/:id/invitations` + `POST /auth/invitations/:token/accept`); esta
spec no agrega un endpoint de creación separado.
