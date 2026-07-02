---

description: "Task list for Authentication & Identity"
---

# Tasks: Authentication & Identity

**Input**: Design documents from `specs/004-authentication-identity/`
**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md),
[data-model.md](data-model.md), [contracts/auth-api.md](contracts/auth-api.md),
[quickstart.md](quickstart.md)

**Tests**: Incluidos en todas las historias. La Constitución del proyecto (Principio VII
"Quality Before Features" y Estándar de Ingeniería "Testing") exige Unit + Integration
(+ E2E cuando aplica) para toda feature de negocio; no son opcionales en este proyecto.

**Organization**: Tareas agrupadas por historia de usuario (spec.md) para permitir
implementación y prueba independientes de cada una.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede ejecutarse en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: Historia de usuario a la que pertenece (US1..US5)
- Cada tarea incluye la ruta de archivo exacta

## Path Conventions

Web app (monorepo): `backend/src/`, `backend/tests/`, `frontend/src/`, `frontend/tests/`
— ver [plan.md](plan.md) § Project Structure.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Inicialización del monorepo backend/frontend

- [ ] T001 Crear estructura de carpetas `backend/` y `frontend/` per [plan.md](plan.md) § Project Structure
- [ ] T002 Inicializar proyecto NestJS + TypeScript + Prisma en `backend/` (package.json, tsconfig.json, prisma/schema.prisma base)
- [ ] T003 [P] Inicializar proyecto React + Vite + TypeScript en `frontend/`
- [ ] T004 [P] Configurar ESLint + Prettier compartidos para `backend/` y `frontend/`
- [ ] T005 Configurar conexión a PostgreSQL y variables de entorno base en `backend/prisma/schema.prisma` y `backend/.env.example`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Infraestructura del módulo `identity` que todas las historias necesitan

**⚠️ CRITICAL**: Ninguna historia de usuario puede empezar hasta completar esta fase

- [ ] T006 Definir modelos Prisma `User`, `OAuthAccount`, `Session`, `Device`, `PasswordResetToken`, `EmailVerificationToken` en `backend/prisma/schema.prisma` (ver [data-model.md](data-model.md))
- [ ] T007 Generar y aplicar la migración inicial de Prisma para el módulo identity
- [ ] T008 [P] Crear el esqueleto del módulo NestJS `identity` (carpetas `domain/`, `application/`, `infrastructure/`, `api/`) en `backend/src/modules/identity/`
- [ ] T009 [P] Implementar hashing de contraseñas con Argon2id en `backend/src/modules/identity/infrastructure/password-hasher.ts` (research.md #1)
- [ ] T010 [P] Implementar emisión/verificación de access tokens JWT (RS256) en `backend/src/modules/identity/infrastructure/jwt.service.ts` (research.md #2)
- [ ] T011 Implementar rotación de refresh tokens + detección de reutilización en `backend/src/modules/identity/infrastructure/refresh-token.service.ts` (research.md #2, FR-015)
- [ ] T012 [P] Configurar `@nestjs/throttler` para endpoints de auth en `backend/src/modules/identity/api/auth-throttler.guard.ts` (research.md #5, FR-014)
- [ ] T013 [P] Implementar publicador de eventos hacia Audit Log para eventos de identity en `backend/src/shared/audit/identity-audit.publisher.ts` (FR-016)
- [ ] T014 Implementar `AuthGuard` (JWT) con verificación de Membership/Organization en `backend/src/modules/identity/api/auth.guard.ts` (FR-017)

**Checkpoint**: Foundation lista — las historias de usuario pueden empezar

---

## Phase 3: User Story 1 - Registro e inicio de sesión con email y contraseña (Priority: P1) 🎯 MVP

**Goal**: Un User puede registrarse, verificar su email, iniciar y cerrar sesión con
email/contraseña.

**Independent Test**: Ver [quickstart.md](quickstart.md) — registrar, verificar email,
login, logout, y bloqueo tras 5 intentos fallidos.

### Tests for User Story 1

- [ ] T015 [P] [US1] Contract test `POST /auth/register` en `backend/tests/contract/auth-register.spec.ts`
- [ ] T016 [P] [US1] Contract test `POST /auth/login` en `backend/tests/contract/auth-login.spec.ts`
- [ ] T017 [P] [US1] Integration test flujo registro → verificar email → login → logout en `backend/tests/integration/auth-register-login.spec.ts`
- [ ] T018 [P] [US1] Integration test bloqueo tras 5 intentos fallidos en 10 min (SC-005) en `backend/tests/integration/auth-brute-force.spec.ts`

### Implementation for User Story 1

- [ ] T019 [P] [US1] Crear `UserRepository` (Prisma) en `backend/src/modules/identity/infrastructure/user.repository.ts`
- [ ] T020 [P] [US1] Crear `EmailVerificationTokenRepository` en `backend/src/modules/identity/infrastructure/email-verification-token.repository.ts`
- [ ] T021 [US1] Implementar `RegisterUseCase` en `backend/src/modules/identity/application/register.use-case.ts` (depende de T019, T020, T009)
- [ ] T022 [US1] Implementar `LoginUseCase` en `backend/src/modules/identity/application/login.use-case.ts` (depende de T019, T009, T010, T011)
- [ ] T023 [US1] Implementar `LogoutUseCase` en `backend/src/modules/identity/application/logout.use-case.ts` (depende de T011)
- [ ] T024 [US1] Implementar `VerifyEmailUseCase` y `ResendVerificationUseCase` en `backend/src/modules/identity/application/verify-email.use-case.ts`
- [ ] T025 [US1] Implementar `AuthController` (register/login/logout/verify-email/verify-email-resend/refresh) en `backend/src/modules/identity/api/auth.controller.ts`
- [ ] T026 [US1] Aplicar el guard de rate limiting a login/register (depende de T012, T025)
- [ ] T027 [US1] Emitir eventos de Audit Log para UserRegistered/UserLoggedIn/UserLoggedOut (depende de T013, T025)
- [ ] T028 [P] [US1] Construir página de registro en `frontend/src/features/auth/Register.tsx`
- [ ] T029 [P] [US1] Construir página de login en `frontend/src/features/auth/Login.tsx`
- [ ] T030 [US1] Implementar cliente `auth-api.ts` (register/login/logout/verify-email) en `frontend/src/services/auth-api.ts`

**Checkpoint**: User Story 1 funcional y testeable de forma independiente

---

## Phase 4: User Story 2 - Recuperación y cambio de contraseña (Priority: P2)

**Goal**: Un User puede restablecer su contraseña por email y cambiarla desde su perfil.

**Independent Test**: Solicitar reset, usar el enlace, definir nueva contraseña, iniciar
sesión con ella; cambiar contraseña estando autenticado exigiendo la actual.

### Tests for User Story 2

- [ ] T031 [P] [US2] Contract test `POST /auth/password/reset-request` en `backend/tests/contract/auth-password-reset-request.spec.ts`
- [ ] T032 [P] [US2] Contract test `POST /auth/password/reset-confirm` en `backend/tests/contract/auth-password-reset-confirm.spec.ts`
- [ ] T033 [P] [US2] Integration test: el enlace de reset es de un solo uso y expira en `backend/tests/integration/auth-password-reset.spec.ts`

### Implementation for User Story 2

- [ ] T034 [P] [US2] Crear `PasswordResetTokenRepository` en `backend/src/modules/identity/infrastructure/password-reset-token.repository.ts`
- [ ] T035 [US2] Implementar `RequestPasswordResetUseCase` en `backend/src/modules/identity/application/request-password-reset.use-case.ts` (depende de T034)
- [ ] T036 [US2] Implementar `ConfirmPasswordResetUseCase` (invalida tokens previos + revoca sesiones) en `backend/src/modules/identity/application/confirm-password-reset.use-case.ts` (depende de T034, T011)
- [ ] T037 [US2] Implementar `ChangePasswordUseCase` (exige contraseña actual) en `backend/src/modules/identity/application/change-password.use-case.ts` (depende de T019, T009)
- [ ] T038 [US2] Agregar endpoints de reset/cambio de contraseña a `AuthController` (depende de T025, T035-T037)
- [ ] T039 [P] [US2] Construir páginas "Olvidé mi contraseña" y "Restablecer contraseña" en `frontend/src/features/auth/ForgotPassword.tsx` y `ResetPassword.tsx`
- [ ] T040 [US2] Construir formulario "Cambiar contraseña" en `frontend/src/features/auth/ChangePassword.tsx`

**Checkpoint**: User Stories 1 y 2 funcionan de forma independiente

---

## Phase 5: User Story 3 - Inicio de sesión con proveedores OAuth (Priority: P3)

**Goal**: Un User puede iniciar sesión con Google o Microsoft, vinculando cuentas por
email verificado.

**Independent Test**: Login OAuth para un email nuevo (crea User) y para un email ya
existente (vincula en vez de duplicar).

### Tests for User Story 3

- [ ] T041 [P] [US3] Integration test: login OAuth con email nuevo crea User + OAuthAccount en `backend/tests/integration/auth-oauth-google.spec.ts`
- [ ] T042 [P] [US3] Integration test: login OAuth con email existente vincula la cuenta en `backend/tests/integration/auth-oauth-link.spec.ts`

### Implementation for User Story 3

- [ ] T043 [P] [US3] Crear `OAuthAccountRepository` en `backend/src/modules/identity/infrastructure/oauth-account.repository.ts`
- [ ] T044 [P] [US3] Configurar estrategia Passport de Google en `backend/src/modules/identity/infrastructure/strategies/google.strategy.ts` (research.md #3)
- [ ] T045 [P] [US3] Configurar estrategia Passport de Microsoft en `backend/src/modules/identity/infrastructure/strategies/microsoft.strategy.ts`
- [ ] T046 [US3] Implementar `OAuthLoginUseCase` (crear o vincular User) en `backend/src/modules/identity/application/oauth-login.use-case.ts` (depende de T043, T019)
- [ ] T047 [US3] Agregar rutas OAuth (google/microsoft + callbacks) a `AuthController` (depende de T044-T046)
- [ ] T048 [P] [US3] Agregar botones "Continuar con Google/Microsoft" en `frontend/src/features/auth/Login.tsx` y `Register.tsx`

**Checkpoint**: User Stories 1-3 funcionan de forma independiente

---

## Phase 6: User Story 4 - Gestión de sesiones y dispositivos (Priority: P4)

**Goal**: Un User puede ver y revocar sus sesiones/dispositivos activos.

**Independent Test**: Login desde dos dispositivos, listar sesiones desde uno, revocar
la sesión del otro remotamente (SC-007).

### Tests for User Story 4

- [ ] T049 [P] [US4] Contract test `GET /auth/sessions` en `backend/tests/contract/auth-sessions-list.spec.ts`
- [ ] T050 [P] [US4] Integration test: revocar una sesión remota la invalida de inmediato (SC-007) en `backend/tests/integration/auth-session-revoke.spec.ts`

### Implementation for User Story 4

- [ ] T051 [P] [US4] Crear `DeviceRepository` en `backend/src/modules/identity/infrastructure/device.repository.ts`
- [ ] T052 [US4] Implementar `ListSessionsUseCase` en `backend/src/modules/identity/application/list-sessions.use-case.ts` (depende de T051)
- [ ] T053 [US4] Implementar `RevokeSessionUseCase` y `RevokeAllSessionsUseCase` en `backend/src/modules/identity/application/revoke-session.use-case.ts` (depende de T011)
- [ ] T054 [US4] Agregar endpoints de sesiones (GET/DELETE) a `AuthController` (depende de T052, T053)
- [ ] T055 [P] [US4] Construir página "Sesiones activas" (listar + revocar) en `frontend/src/features/auth/Sessions.tsx`

**Checkpoint**: User Stories 1-4 funcionan de forma independiente

---

## Phase 7: User Story 5 - Autenticación multifactor opcional (Priority: P5)

**Goal**: Un User puede activar/desactivar MFA (TOTP) y usarlo en el login.

**Independent Test**: Activar MFA, cerrar sesión, verificar que el próximo login exige
el código TOTP.

### Tests for User Story 5

- [ ] T056 [P] [US5] Integration test: activar MFA exige TOTP en el siguiente login en `backend/tests/integration/auth-mfa-enable.spec.ts`
- [ ] T057 [P] [US5] Integration test: desactivar MFA exige reautenticación en `backend/tests/integration/auth-mfa-disable.spec.ts`

### Implementation for User Story 5

- [ ] T058 [P] [US5] Implementar generación de secreto TOTP + códigos de recuperación en `backend/src/modules/identity/infrastructure/totp.service.ts` (research.md #4)
- [ ] T059 [US5] Implementar `EnrollMfaUseCase` y `EnableMfaUseCase` en `backend/src/modules/identity/application/mfa-enroll.use-case.ts` (depende de T058)
- [ ] T060 [US5] Implementar `VerifyMfaUseCase` (segundo paso del login) en `backend/src/modules/identity/application/mfa-verify.use-case.ts` (depende de T058, T022)
- [ ] T061 [US5] Implementar `DisableMfaUseCase` (exige reautenticación) en `backend/src/modules/identity/application/mfa-disable.use-case.ts`
- [ ] T062 [US5] Agregar endpoints de MFA a `AuthController` (depende de T059-T061)
- [ ] T063 [P] [US5] Construir páginas "Activar MFA" (QR + códigos de recuperación) y "Verificar MFA" en `frontend/src/features/auth/Mfa.tsx`

**Checkpoint**: Las 5 historias de usuario funcionan de forma independiente

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Mejoras transversales a todas las historias

- [ ] T064 [P] Agregar endpoint de aceptación de invitaciones (FR-018) `POST /auth/invitations/:token/accept` en `backend/src/modules/identity/api/auth.controller.ts`
- [ ] T065 [P] E2E test del flujo completo de quickstart.md en `tests/e2e/identity/quickstart.spec.ts`
- [ ] T066 Revisión de hardening de seguridad: protección CSRF y auditoría de secretos/env (FR-013)
- [ ] T067 [P] Actualizar estado de la Fase 1 (módulo Identity) en `docs/implementation-plan.md`
- [ ] T068 Ejecutar la validación manual de `quickstart.md` de punta a punta

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias — puede arrancar de inmediato
- **Foundational (Phase 2)**: depende de Setup — BLOQUEA todas las historias
- **User Stories (Phase 3-7)**: todas dependen de Foundational
  - Pueden avanzar en paralelo (si hay capacidad) o en orden de prioridad P1→P5
- **Polish (Phase 8)**: depende de las historias que se quieran completar

### User Story Dependencies

- **US1 (P1)**: sin dependencias de otras historias
- **US2 (P2)**: reutiliza `UserRepository`/hashing de US1 pero es independientemente testeable
- **US3 (P3)**: reutiliza `UserRepository` de US1; no depende de US2
- **US4 (P4)**: reutiliza `Session`/`refresh-token.service` de Foundational y US1
- **US5 (P5)**: reutiliza `LoginUseCase` de US1 (agrega el segundo factor)

### Within Each User Story

- Tests antes que implementación
- Repositories antes que Use Cases
- Use Cases antes que Controller
- Backend antes que integración de frontend

### Parallel Opportunities

- Todas las tareas [P] de Setup y Foundational en paralelo entre sí
- Una vez completado Foundational, US1-US5 pueden trabajarse en paralelo por distintos desarrolladores
- Dentro de cada historia, los tests marcados [P] en paralelo entre sí, y los repositories marcados [P] en paralelo entre sí

---

## Parallel Example: User Story 1

```bash
# Lanzar juntos los tests de la User Story 1:
Task: "Contract test POST /auth/register en backend/tests/contract/auth-register.spec.ts"
Task: "Contract test POST /auth/login en backend/tests/contract/auth-login.spec.ts"
Task: "Integration test flujo registro-login-logout en backend/tests/integration/auth-register-login.spec.ts"
Task: "Integration test bloqueo por fuerza bruta en backend/tests/integration/auth-brute-force.spec.ts"

# Lanzar juntos los repositories de la User Story 1:
Task: "Crear UserRepository en backend/src/modules/identity/infrastructure/user.repository.ts"
Task: "Crear EmailVerificationTokenRepository en backend/src/modules/identity/infrastructure/email-verification-token.repository.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 solamente)

1. Completar Phase 1: Setup
2. Completar Phase 2: Foundational (bloquea todo lo demás)
3. Completar Phase 3: User Story 1
4. **STOP y VALIDAR**: correr quickstart.md contra US1
5. Desplegar/demo si está listo

### Incremental Delivery

1. Setup + Foundational → base lista
2. US1 → validar independientemente → demo (login básico funcionando)
3. US2 → validar independientemente → demo (recuperación de contraseña)
4. US3 → validar independientemente → demo (login social)
5. US4 → validar independientemente → demo (gestión de sesiones)
6. US5 → validar independientemente → demo (MFA)

### Parallel Team Strategy

Con varios desarrolladores, tras completar Foundational: un dev por historia (US1-US5),
integrando al final sobre `AuthController` sin romper las demás.

---

## Notes

- [P] = archivos distintos, sin dependencias entre sí
- [Story] mapea cada tarea a su historia de usuario para trazabilidad
- Verificar que los tests fallen antes de implementar (Constitución, Principio VII)
- Cada Audit Log (FR-016) y el aislamiento por Organization (FR-017) se verifican en las
  historias que corresponda, no solo en Foundational
