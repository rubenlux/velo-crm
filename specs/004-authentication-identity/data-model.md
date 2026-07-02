# Data Model: Authentication & Identity

Entidades derivadas de [spec.md](spec.md) Key Entities, siguiendo el lenguaje ubicuo de
[Domain Model](../../docs/domain-model.md) y [Bounded Contexts](../../docs/bounded-contexts.md)
(bounded context **Identity**).

## User

Persona con acceso a VELO (entidad ya definida en el Domain Model; acá se detallan sus
atributos de autenticación).

| Campo | Tipo | Notas |
|---|---|---|
| id | UUID | PK |
| email | string | único a nivel plataforma (no por Organization) |
| emailVerifiedAt | datetime \| null | null = no verificado (FR-004) |
| passwordHash | string \| null | null si el User solo usa OAuth |
| mfaEnabled | boolean | default false |
| mfaSecret | string (cifrado) \| null | solo presente si mfaEnabled |
| createdAt / updatedAt | datetime | auditoría estándar |

**Reglas**:
- `email` es único; un login OAuth con el mismo email vincula al `User` existente
  (FR-002) en vez de crear uno nuevo.
- Un `User` puede no tener `passwordHash` (cuenta 100% OAuth); en ese caso el flujo de
  reset de contraseña no aplica (Edge Case de spec.md).

## OAuthAccount

Vínculo entre un `User` y un proveedor OAuth externo (uno o más por User).

| Campo | Tipo | Notas |
|---|---|---|
| id | UUID | PK |
| userId | UUID | FK → User |
| provider | enum(`google`, `microsoft`) | |
| providerAccountId | string | id del usuario en el proveedor |
| createdAt | datetime | |

**Reglas**: par (`provider`, `providerAccountId`) único; un `User` puede tener como
máximo un `OAuthAccount` por proveedor.

## Session

Acceso activo de un User desde un dispositivo/navegador concreto.

| Campo | Tipo | Notas |
|---|---|---|
| id | UUID | PK |
| userId | UUID | FK → User |
| deviceId | UUID | FK → Device |
| refreshTokenHash | string | hash del refresh token vigente |
| refreshTokenFamilyId | UUID | agrupa rotaciones sucesivas del mismo login |
| status | enum(`active`, `revoked`) | |
| rememberMe | boolean | afecta expiración (FR-008) |
| expiresAt | datetime | configurable por Organization (FR-010) |
| lastActivityAt | datetime | |
| createdAt / revokedAt | datetime | |

**Transiciones de estado**: `active → revoked` (logout individual FR-005, logout total
FR-006, revocación remota FR-007, o detección de reutilización de refresh token). No
existe transición inversa.

## Device

Dispositivo/navegador desde el que un User inició sesión.

| Campo | Tipo | Notas |
|---|---|---|
| id | UUID | PK |
| userId | UUID | FK → User |
| userAgent | string | |
| approxLocation | string \| null | derivado de IP, solo informativo |
| firstSeenAt / lastSeenAt | datetime | |

**Reglas**: un `Device` puede tener múltiples `Session` a lo largo del tiempo (una por
login); no se elimina al revocar sesiones, solo se conserva como historial.

## PasswordResetToken

| Campo | Tipo | Notas |
|---|---|---|
| id | UUID | PK |
| userId | UUID | FK → User |
| tokenHash | string | hash del token enviado por email |
| status | enum(`pending`, `used`, `expired`) | |
| expiresAt | datetime | corta duración (ver research.md) |
| createdAt / usedAt | datetime | |

**Reglas**: al emitir un nuevo `PasswordResetToken` para un `User`, cualquier token
`pending` previo pasa a `expired` (edge case de spec.md: "solo el enlace más reciente es
válido").

## EmailVerificationToken

| Campo | Tipo | Notas |
|---|---|---|
| id | UUID | PK |
| userId | UUID | FK → User |
| tokenHash | string | |
| status | enum(`pending`, `used`, `expired`) | |
| expiresAt | datetime | |

## Referencias a otros bounded contexts

- **Membership** (context Identity, definida en [specs/005-organizations-multi-tenant](../005-organizations-multi-tenant/data-model.md)
  cuando exista): determina a qué Organizations puede acceder un `User` autenticado
  (FR-017); esta feature no redefine su modelo, solo lo consume para el chequeo de
  acceso.
- **Audit Log**: cada evento (`UserRegistered`, `UserLoggedIn`, `UserLoggedOut`,
  `PasswordChanged`, `MfaEnabled`, `MfaDisabled`, `SessionRevoked`) se publica como
  evento de dominio y se persiste como entrada de Audit Log (ver Domain Model), sin que
  el módulo `identity` acceda directamente a la tabla de auditoría de otro módulo.

## Diagrama de relaciones

```text
User (1) ── (0..N) OAuthAccount
User (1) ── (0..N) Session ── (N..1) Device
User (1) ── (0..N) PasswordResetToken
User (1) ── (0..N) EmailVerificationToken
User (1) ── (0..N) Membership            [definida en el contexto Organization/Identity]
```
