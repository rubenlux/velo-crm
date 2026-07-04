# Research: Gestión de Contactos (Contacts)

Decisiones técnicas para spec 009. Sigue el lenguaje de [spec.md](spec.md) y reutiliza
varios patrones ya validados en [specs/008-customers/research.md](../008-customers/research.md)
(referenciados en vez de re-derivados).

## 1. Nueva tabla `Contact`, dependiente de `Customer` (spec 008) vía FK obligatoria

**Decisión**: módulo NestJS nuevo `backend/src/modules/contacts/`, con tabla `Contact`
que referencia `Customer.id` mediante `customerId: String` **no nullable** (RN-001,
FR-002: todo Contact pertenece a exactamente un Customer, sin excepción). Importa
`customers` (spec 008) además de `identity`/`organizations`/`roles`, igual que
`customers` importa de sus dependencias — mismo patrón modular de capas (research.md
#1 de spec 008).

**Rationale**: es la primera spec de la Fase 2 con una dependencia dura hacia otra
spec de la misma fase (008), no solo hacia el core de plataforma (004-007) —
consistente con `docs/bounded-contexts.md`, que ya define `Contact` como subordinado de
`Customer` dentro del contexto CRM.

**Alternatives considered**: `customerId` nullable con validación solo a nivel de
aplicación — rechazado; RN-001 es una regla de integridad de datos, no solo de UI, y
debe estar en el constraint de base (`NOT NULL` + `onDelete: Restrict` — un Customer no
puede ser eliminado físicamente de todas formas, spec 008 RN-004, así que no hay riesgo
de FK huérfana).

## 2. Permission keys: reutilizar `contact.*`, ya declarado por spec 007

**Decisión**: igual que spec 008 research.md #2, sin permission keys nuevas.

| Acción | Permission |
|---|---|
| Crear (US1) | `contact.create` |
| Editar / marcar principal / transferir (US1, US2, US5) | `contact.update` |
| Buscar / ver / timeline (US3, US4) | `contact.read` |
| Archivar / restaurar (US1) | `contact.update` |
| Fusionar (US5) | `contact.delete` (mismo criterio que la fusión de Customers en spec 008: la operación más sensible del módulo, reservada a Administrador/Gerente — únicos roles por defecto con `contact.delete` en `DEFAULT_ROLE_PERMISSIONS`) |

**Rationale**: `Ventas`/`Soporte` ya fueron calibrados en spec 007 con
`contact.read/create/update` (Ventas) o solo `contact.read` (Soporte) — ningún
Acceptance Scenario de esta spec pide granularidad adicional.

## 3. Múltiples emails/teléfonos: principal + array de secundarios, no una tabla hija

**Decisión**: `primaryEmail: String?`, `secondaryEmails: String[]`, `primaryPhone:
String?`, `secondaryPhones: String[]` en la propia fila de `Contact` (más `whatsapp`,
`linkedin`, `website` como columnas simples). Búsqueda por "cualquier email/teléfono"
(Acceptance Scenario 2, US3) consulta `primaryEmail`/`primaryPhone` (índice trigram) OR
`secondaryEmails`/`secondaryPhones` (índice GIN sobre el array), unificado en la misma
query de `SearchContactsUseCase`.

**Rationale**: Simplicity Wins — una tabla `ContactEmail`/`ContactPhone` normalizada
sería más "correcta" relacionalmente, pero ningún requisito pide más metadata por medio
de contacto (etiqueta "casa"/"trabajo", verificación, etc.) más allá de distinguir
principal de secundario; columnas + arrays alcanzan y evitan un join extra en cada
búsqueda (relevante para SC-001, <300ms).

**Alternatives considered**: tabla `ContactChannel` (tipo: email/teléfono/whatsapp,
valor, esPrincipal) — rechazada por complejidad no pedida; se deja como refactor futuro
si una spec posterior necesita metadata por canal (ej. WhatsApp Business, fuera de
alcance explícito de esta spec).

## 4. Contacto principal único por Customer: transacción a nivel de aplicación + índice parcial de defensa en profundidad

**Decisión**: `isPrimary: Boolean @default(false)` en `Contact`. `SetPrimaryContactUseCase`
ejecuta, dentro de una única transacción Prisma: (1) `updateMany({ where: { customerId,
isPrimary: true }, data: { isPrimary: false } })`, (2) `update` del Contact objetivo a
`isPrimary: true`. Además, la migración agrega un índice único parcial vía SQL crudo
(Prisma no expresa `WHERE` en `@@unique` del schema):
`CREATE UNIQUE INDEX contacts_customer_primary_unique ON contacts (customer_id) WHERE is_primary = true;`

**Rationale**: FR-004/SC-004 exigen "como máximo un contacto principal por Customer en
todo momento" — la transacción de aplicación cubre el caso normal (Acceptance Scenario
2, US2), pero el índice parcial es la misma defensa en profundidad ya aplicada en
`OrganizationInvitationRepository` (spec 005) y documentada como patrón general del
proyecto: nunca confiar solo en la capa de aplicación para un invariante de datos
crítico cuando la base lo puede garantizar.

**Alternatives considered**: solo transacción de aplicación, sin índice — rechazado por
el patrón de defensa en profundidad ya establecido en el proyecto; columna booleana sin
transacción (dejar que dos updates concurrentes potencialmente dejen 0 o 2 principales)
— rechazado, viola SC-004 directamente.

## 5. Transferencia de Contact a otro Customer (US5, FR-010): reasignar `customerId`, perder `isPrimary` incondicionalmente

**Decisión**: `TransferContactUseCase` actualiza `customerId` al destino y fuerza
`isPrimary = false`, sin excepción — incluso si el Contact transferido era el principal
del Customer de origen. El Customer de origen queda sin principal hasta que se designe
uno nuevo manualmente (edge case explícito de spec.md).

**Rationale**: literal del edge case ("no se transfiere automáticamente el carácter de
principal"); forzar `isPrimary = false` en el propio Contact transferido (no solo
"liberar" al de origen) evita el caso ambiguo de que el Contact aterrice como principal
implícito de un Customer destino que ya podría tener uno (violaría FR-004 si no se
fuerza explícitamente a `false` primero).

## 6. Fusión de duplicados (US5, FR-013): mismo patrón `mergedIntoContactId` de spec 008, restringido al mismo Customer

**Decisión**: campo `mergedIntoContactId: String?` (auto-relación), igual mecanismo que
`Customer.mergedIntoCustomerId` (spec 008 research.md #6): sin nuevo valor de
`ContactStatus`, sin eliminación física, `ContactHistory` del descartado se re-parenta
al sobreviviente. Antes de fusionar, `MergeContactsUseCase` valida
`a.customerId === b.customerId`; si difieren, rechaza con un error dedicado indicando
que deben transferirse al mismo Customer primero (edge case explícito de spec.md).

**Rationale**: mismo razonamiento que spec 008 #6 (no inventar un estado fuera del
catálogo documentado por spec.md: `Activo`/`Inactivo`/`Archivado`). La restricción de
"mismo Customer" es un requisito nuevo de esta spec (no existía en 008, que fusiona
dentro de la misma Organization sin restricción adicional) — se valida en el use case,
no en un constraint de base (comparar dos filas antes de escribir no es expresable como
constraint declarativo simple).

## 7. Historial y línea de tiempo: mismo patrón de spec 008, sin tabla `TimelineEntry`

**Decisión**: tabla `ContactHistory` (misma forma que `CustomerHistory`, spec 008
research.md #4) + `GetContactTimelineUseCase` combinando `ContactHistory` + `AuditLog`
filtrado por `contactId` (spec 008 research.md #5), extensible por specs futuras
(Activities, Opportunities, Documentos) de la misma manera.

**Rationale**: consistencia de arquitectura entre `customers` y `contacts` — ambos son
el mismo tipo de entidad de dominio (registro CRM con historial propio + timeline
agregada), no se justifica una solución distinta para el segundo módulo cuando la
primera ya fue validada como la más simple posible (Simplicity Wins).

## 8. Concurrencia optimista y búsqueda a escala: mismos mecanismos de spec 008

**Decisión**: `version: Int` + rechazo 409 en edición concurrente (spec 008 research.md
#8); índices `pg_trgm`/GIN para `primaryEmail`, `firstName`+`lastName`, `company`
(denormalizado desde `Customer.name` al momento de creación para evitar un JOIN en cada
búsqueda por "empresa", ver Key Entities de spec.md) y `secondaryEmails`/`secondaryPhones`/
`tags` (spec 008 research.md #9).

**Rationale**: mismo requisito de rendimiento (SC-001/SC-002, idénticos a spec 008),
misma solución. La denormalización de `company` (nombre del Customer al momento de la
búsqueda, no un JOIN en vivo) es una concesión explícita a rendimiento — se resincroniza
solo si el Customer cambia de nombre (evento raro); documentar como asunción, no
requisito de consistencia fuerte pedido por ningún FR.

**Alternatives considered**: JOIN a `Customer` en cada búsqueda por nombre de empresa —
rechazado por costo en el caso de 1M+ filas (SC-002) cuando el dato casi nunca cambia.
