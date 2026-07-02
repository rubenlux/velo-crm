# Implementation Plan: Authentication & Identity

**Branch**: `004-authentication-identity` | **Date**: 2026-07-01 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/004-authentication-identity/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Implementar el módulo de Identity (`User`, `Session`, `Device`, tokens de verificación
y de restablecimiento) que permite registro/login por email y por OAuth (Google,
Microsoft), recuperación y cambio de contraseña, gestión de sesiones/dispositivos, MFA
opcional (TOTP) y auditoría de todos los eventos de autenticación — todo con el mismo
nivel de aislamiento por Organization que rige al resto de la plataforma (ver
[Constitución](../../.specify/memory/constitution.md), Principios IV y V). Enfoque
técnico: módulo NestJS independiente (`identity`), tokens JWT de acceso de corta
duración + refresh tokens rotables persistidos en PostgreSQL vía Prisma, hashing de
contraseñas con Argon2id, OAuth vía Passport strategies, y MFA basado en TOTP
(RFC 6238).

## Technical Context

**Language/Version**: TypeScript 5.x (Node.js 20 LTS) tanto en backend como frontend
**Primary Dependencies**: NestJS (backend), Passport.js (`passport-jwt`,
`passport-google-oauth20`, `passport-microsoft`) para autenticación, Prisma ORM, React +
Vite (frontend)
**Storage**: PostgreSQL (vía Prisma) para User, Membership, Session, Device,
PasswordResetToken, EmailVerificationToken, AuditLog
**Testing**: Jest (unit + integration backend), Vitest/Testing Library (frontend),
Playwright o similar (E2E) — ver [docs/implementation-plan.md](../../docs/implementation-plan.md)
**Target Platform**: Servicio web backend (Linux container) + SPA frontend, cloud native
**Project Type**: Web application (backend NestJS + frontend React, monorepo)
**Performance Goals**: 95% de logins en <3s (SC-002); revocación de sesión/refresh token
efectiva en <5s (SC-004); confirmación de revocación remota visible en <10s (SC-007)
**Constraints**: Bloqueo temporal tras 5 intentos fallidos de login en 10 min por
cuenta/origen (SC-005); enlaces de un solo uso para reset/verificación de email;
revocación de tokens sin demora perceptible (FR-015)
**Scale/Scope**: Escala inicial acorde al MVP multi-tenant (decenas a ~100
Organizations concurrentes, ver spec 005 SC-002); módulo reutilizado por todas las
fases futuras del roadmap como capa de acceso

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Evaluación |
|---|---|
| I. Specification First | ✅ Deriva de [spec.md](spec.md), ya validado por checklist de calidad. |
| II. Modular by Design | ✅ Se implementa como módulo `identity` independiente (dominio, aplicación, infraestructura, API propios); otros módulos consumen Users/Sessions solo vía API/eventos, nunca acceso directo a sus tablas. |
| III. Business Domain First | ✅ El modelo (User, Session, Device, tokens) sigue el lenguaje ubicuo de [Domain Model](../../docs/domain-model.md)/[Bounded Contexts](../../docs/bounded-contexts.md); no hay términos técnicos filtrados a la spec. |
| IV. Multi-Tenant by Default | ✅ El acceso a una Organization exige Membership activa (FR-017); Sessions/Devices son propiedad de un User, nunca de una Organization directamente. |
| V. Security by Default | ✅ Es el foco central de la feature: hashing, tokens firmados, CSRF, rate limiting, revocación inmediata, auditoría completa (FR-011 a FR-016). |
| VI. API First | ✅ Todos los flujos (login, OAuth, reset, sesiones, MFA) se exponen como endpoints documentados; el frontend React consume las mismas APIs. |
| VII. Quality Before Features | ✅ Se exige test unitario+integración+E2E por historia de usuario (ver Tasks, fase posterior). |
| VIII. Simplicity Wins | ✅ Se reutilizan librerías probadas (Passport, Prisma, TOTP estándar) en vez de construir criptografía o gestión de tokens propia. |
| IX. AI Assists — Never Governs | N/A — esta feature no involucra IA. |
| X. Observability by Design | ✅ Login/logout/cambios de password/MFA/revocaciones quedan en Audit Log (FR-016); métricas de intentos fallidos y rate limiting alimentan observabilidad operativa. |

Ninguna violación detectada. No se requiere completar Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/004-authentication-identity/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── modules/
│   │   └── identity/
│   │       ├── domain/            # User, Session, Device, tokens (entidades e invariantes)
│   │       ├── application/       # casos de uso: register, login, refresh, reset, mfa, sessions
│   │       ├── infrastructure/    # repos Prisma, Passport strategies, hashing, mailer
│   │       └── api/               # controllers NestJS + DTOs de la API pública
│   └── shared/
│       ├── audit/                 # publicación de eventos hacia Audit Log
│       └── events/                # bus de eventos de dominio entre módulos
└── tests/
    ├── unit/identity/
    ├── integration/identity/
    └── e2e/identity/

frontend/
├── src/
│   ├── features/
│   │   └── auth/                  # login, registro, reset password, sesiones, MFA (páginas + componentes)
│   └── services/
│       └── auth-api.ts            # cliente de la API de Identity
└── tests/
    └── auth/
```

**Structure Decision**: Web application (backend NestJS + frontend React) en monorepo,
como define [docs/implementation-plan.md](../../docs/implementation-plan.md). El módulo
`identity` sigue Clean Architecture (domain/application/infrastructure/api) por
Principio de Ingeniería "Code" de la Constitución, y se mantiene aislado de otros
módulos (Organizations, CRM) para que estos lo consuman solo a través de su API/eventos.

## Complexity Tracking

> No aplica: el Constitution Check no registró violaciones.
