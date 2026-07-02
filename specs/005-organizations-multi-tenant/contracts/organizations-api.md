# API Contract: Organizations (Multi-Tenant)

API REST expuesta por el módulo `organizations` (NestJS). El frontend React consume
exactamente estos mismos endpoints (Constitución, Principio VI). Todas las respuestas de
error siguen el formato estándar de la plataforma (`{ "error": { "code", "message" } }`).
Salvo `POST /organizations` (requiere solo un User autenticado, todavía sin Organization
activa), todas las rutas exigen `Authorization: Bearer <access-token>` (spec 004) **y**
el header `X-Organization-Id`, validado por `TenantContextGuard` contra las Memberships
del User (research.md #1, #5).

## Creación y configuración (US1 → FR-001, FR-002, FR-011)

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/organizations` | Crea una Organization con nombre/timezone/moneda/idioma; asigna Membership Propietario al creador. |
| GET | `/organizations/:id` | Consulta la configuración de la Organization activa (requiere Membership). |
| PATCH | `/organizations/:id` | Actualiza nombre/timezone/moneda/idioma (solo Propietario). |

## Branding, impuestos y módulos (US2 → FR-004, FR-005, FR-006, FR-007)

| Método | Ruta | Descripción |
|---|---|---|
| PATCH | `/organizations/:id/branding` | Actualiza `logoUrl` y `customDomain` (rechaza dominios duplicados, FR-014). |
| PATCH | `/organizations/:id/tax-settings` | Actualiza `taxSettings`. |
| PATCH | `/organizations/:id/modules` | Habilita/deshabilita módulos según el plan vigente. |

## Invitaciones (US3 → FR-003)

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/organizations/:id/invitations` | Invita un email con un rol; rechaza si excede el límite de usuarios del plan (SC-006). |
| DELETE | `/organizations/:id/invitations/:invitationId` | Cancela una invitación pendiente. |
| GET | `/organizations/:id/invitations` | Lista invitaciones pendientes de la Organization. |
| POST | `/auth/invitations/:token/accept` | **Vive en el módulo `identity`** (spec 004, T064); invoca el caso de uso `AcceptInvitationUseCase` de este módulo para crear la Membership (research.md #3). |

## Cambio de plan (US4 → FR-010)

| Método | Ruta | Descripción |
|---|---|---|
| PATCH | `/organizations/:id/plan` | Cambia el plan; valida límites vigentes antes de aplicar (bloquea downgrade si excede límites del plan destino). |

## Suspensión y reactivación (US5 → FR-008, FR-009)

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/organizations/:id/suspend` | Acción administrativa de plataforma (no disponible al Propietario sobre su propia Organization, ver Assumptions de spec.md). |
| POST | `/organizations/:id/reactivate` | Restaura el acceso normal. |

## Audit Log (FR-013, SC-004)

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/organizations/:id/audit-log` | Lista eventos de auditoría de la Organization, filtrable por rango de fechas y tipo de acción. |
