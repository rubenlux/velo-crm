# API Contract: Authentication & Identity

API REST expuesta por el módulo `identity` (NestJS). El frontend React consume
exactamente estos mismos endpoints (Constitución, Principio VI). Todas las respuestas de
error siguen el formato estándar de la plataforma (`{ "error": { "code", "message" } }`).

## Registro y login por email (US1 → FR-001, FR-004, FR-014)

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/auth/register` | Crea un `User` con email/password; dispara envío de `EmailVerificationToken`. |
| POST | `/auth/login` | Login con email/password; devuelve access token (JWT) + refresh token; aplica rate limiting (FR-014). |
| POST | `/auth/logout` | Revoca la `Session` actual (FR-005). |
| POST | `/auth/verify-email` | Confirma un `EmailVerificationToken` y marca `emailVerifiedAt`. |
| POST | `/auth/verify-email/resend` | Reenvía verificación (invalida el token pendiente anterior). |
| POST | `/auth/refresh` | Intercambia un refresh token vigente por un nuevo par access/refresh (rotación, ver research.md). |

## Recuperación y cambio de contraseña (US2 → FR-003)

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/auth/password/reset-request` | Emite un `PasswordResetToken` para el email indicado (no revela si el email existe). |
| POST | `/auth/password/reset-confirm` | Consume el token y define una nueva contraseña; revoca todas las Sessions previas. |
| POST | `/auth/password/change` | Cambia la contraseña de un User autenticado, exigiendo la contraseña actual. |

## Login con proveedores OAuth (US3 → FR-002)

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/auth/oauth/google` | Redirige al consentimiento de Google. |
| GET | `/auth/oauth/google/callback` | Callback: crea o vincula `User`/`OAuthAccount`, emite Session. |
| GET | `/auth/oauth/microsoft` | Redirige al consentimiento de Microsoft. |
| GET | `/auth/oauth/microsoft/callback` | Callback equivalente para Microsoft. |

## Gestión de sesiones y dispositivos (US4 → FR-006, FR-007)

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/auth/sessions` | Lista las Sessions activas del User autenticado (con Device asociado). |
| DELETE | `/auth/sessions/:sessionId` | Revoca una Session específica (FR-007). |
| DELETE | `/auth/sessions` | Revoca todas las Sessions del User, incluida la actual (FR-006). |

## MFA (US5 → FR-009)

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/auth/mfa/enroll` | Genera secreto TOTP + códigos de recuperación (no activa MFA aún). |
| POST | `/auth/mfa/enable` | Confirma el primer código TOTP y activa `mfaEnabled`. |
| POST | `/auth/mfa/verify` | Verifica un código TOTP durante el login cuando MFA está activo. |
| POST | `/auth/mfa/disable` | Desactiva MFA; exige reautenticación (contraseña o TOTP vigente). |

## Invitaciones (soporte a FR-018, ejecutado por Organizations)

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/auth/invitations/:token/accept` | Acepta una invitación emitida por el módulo Organizations, creando o vinculando el `User` correspondiente. |

Todas las rutas autenticadas requieren un `Authorization: Bearer <access-token>` válido;
las rutas de login/registro/reset son públicas pero sujetas a rate limiting (FR-014).
