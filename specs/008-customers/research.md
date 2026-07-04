# Research: Gestión de Customers (Clientes)

Decisiones técnicas para spec 008, primer módulo real de la Fase 2 (CRM). Sigue el
lenguaje de [spec.md](spec.md).

## 1. Nueva tabla `Customer` en el módulo `customers`, no extensión de ninguna tabla existente

**Decisión**: módulo NestJS nuevo `backend/src/modules/customers/`, con su propia tabla
`Customer` en `schema.prisma`. No reutiliza ni extiende `Organization`, `Membership` ni
ningún modelo de specs 004-007.

**Rationale**: `Customer` es una entidad de dominio nueva (bounded context CRM, ver
`docs/bounded-contexts.md`), sin relación de herencia con Identity/Organizations/Users/
Roles. Sigue el mismo patrón modular que specs 005-007 (research.md #1 de spec 007):
un módulo nuevo importa lo que necesita de los módulos base (`AuthGuard` de identity,
`TenantContextGuard`/`MembershipRepository`/`AuditLogPublisher` de organizations,
`PermissionsGuard`/`@RequirePermission` de roles) sin que ningún módulo existente tenga
que conocer `customers`.

**Alternatives considered**: ninguna — no hay tabla previa simplificada que extender
(a diferencia de spec 006 extendiendo `User`); spec 001 (superseded) nunca llegó a
implementarse en código.

## 2. Permission keys: reutilizar el catálogo ya declarado por spec 007, sin agregar claves nuevas

**Decisión**: `customer.read` / `customer.create` / `customer.update` / `customer.delete`
ya existen en `backend/src/modules/roles/infrastructure/permission-catalog.ts` (declarados
por adelantado en spec 007, research.md #5). Esta spec no agrega permission keys nuevas;
las acciones adicionales (archivar/restaurar, fusionar, exportar/importar) se mapean a
las 4 existentes:

| Acción | Permission |
|---|---|
| Crear (US1) | `customer.create` |
| Editar (US1) | `customer.update` |
| Buscar/filtrar/ver (US2, US4) | `customer.read` |
| Archivar / restaurar (US3) | `customer.update` |
| Fusionar (US5) | `customer.delete` (destruye/oculta un registro, la operación más sensible del módulo) |
| Exportar (US5) | `customer.read` |
| Importar (US5) | `customer.create` |

**Rationale**: Simplicity Wins — introducir `customer.archive`/`customer.merge`/etc.
multiplicaría permission keys sin que ningún Acceptance Scenario de spec.md pida ese
nivel de granularidad; los roles por defecto (`Ventas`, `Gerente`, etc.) ya fueron
calibrados en spec 007 asumiendo el mapeo CRUD estándar. Revisar
`DEFAULT_ROLE_PERMISSIONS` en el mismo archivo: `Ventas` ya tiene `customer.read/create/
update` pero no `customer.delete` — correcto, fusionar es una operación de
Administrador según US5 ("Como Administrador... quiero fusionar").

**Alternatives considered**: permission keys dedicadas por acción (`customer.archive`,
`customer.merge`, `customer.export`, `customer.import`) — rechazado por no tener
requisito que lo pida y por requerir tocar `DEFAULT_ROLE_PERMISSIONS` de spec 007 ya
testeado.

## 3. Unicidad de CUIT/NIF: constraint compuesto `(organizationId, taxId)`, NULL no cuenta

**Decisión**: `@@unique([organizationId, taxId])` en Postgres. `taxId` es nullable
(no todo Customer tiene CUIT/NIF cargado al momento de creación rápida). Postgres trata
cada NULL como distinto en un unique constraint, así que múltiples Customers sin
`taxId` en la misma Organization no chocan entre sí — la unicidad solo se activa cuando
`taxId` tiene un valor concreto (RN-002/RN-003, Acceptance Scenarios 3-4 de US1).

**Rationale**: mismo mecanismo de nulls-no-son-iguales que ya se documentó como gotcha
en spec 007 research.md #... (`Role.organizationId` null); acá se usa a favor en vez de
en contra, sin necesitar un índice parcial explícito.

**Alternatives considered**: índice parcial `WHERE tax_id IS NOT NULL` — funcionalmente
equivalente pero Prisma no expresa índices parciales de forma nativa en el schema;
el comportamiento default de Postgres ya resuelve el caso sin SQL manual.

## 4. Historial de cambios: tabla `CustomerHistory` dedicada, separada del `AuditLog` de plataforma

**Decisión**: nueva tabla `CustomerHistory` (una fila por operación de edición, no por
campo) con `changes: Json` (`{ campo: { before, after } }`). El `AuditLog` de spec 005
sigue recibiendo una entrada por acción (creación/edición/archivado/restauración/fusión/
import/export — FR-015) pero **sin** el detalle campo-por-campo; ese detalle vive solo
en `CustomerHistory`.

**Rationale**: son dos audiencias distintas. `AuditLog` es la traza de plataforma
("¿quién hizo qué, cuándo, en qué Organization?"), consistente con cómo specs 005-007
ya lo usan (metadata liviana). `CustomerHistory` es el detalle de dominio que FR-004/
FR-005 piden explícitamente ("conserva el valor anterior") y que alimenta la línea de
tiempo de US4. Mezclarlos forzaría a `AuditLog.metadata` a cargar diffs completos de
campo para un módulo (`customers`) y no para los demás, rompiendo la consistencia del
log de plataforma.

**Alternatives considered**: guardar el diff dentro de `AuditLog.metadata` — rechazado
por la razón anterior; una tabla EAV field-por-field — rechazado por complejidad
innecesaria (Simplicity Wins) cuando un `Json` por operación alcanza para reconstruir
"qué cambió" sin necesitar queries por campo individual.

## 5. Línea de tiempo (US4): vista calculada, no una tabla `TimelineEntry` persistida

**Decisión**: `GetCustomerTimelineUseCase` arma la línea de tiempo combinando
`CustomerHistory` (ediciones) + `AuditLog` filtrado por `customerId` en `metadata`
(creación, archivado, restauración, fusión) en memoria, ordenado por fecha. No existe
una tabla `TimelineEntry` — el "Key Entity" de spec.md se implementa como tipo de
lectura (`CustomerTimelineEntry`), no como modelo persistido.

**Rationale**: Simplicity Wins + Decision History lesson #1 de memoria de proyecto
("no multiplicar abstracciones sin 2+ reusos") — a esta fecha no existen todavía specs
009-017 (Contacts, Opportunities, Activities, Documentos, Cotizaciones, Facturas) que
aporten los demás tipos de evento mencionados por FR-012. Construir ya un mecanismo de
"plugin de fuentes de timeline" genérico sería diseñar para un requisito futuro sin
consumidor real hoy.

**Cómo extienden esto las specs futuras**: cuando spec 009+ implemente Activities/
Opportunities/Documentos/Cotizaciones/Facturas, cada una agrega su propia consulta
dentro de `GetCustomerTimelineUseCase` (o un método `contributeTimelineEntries` en su
propio repositorio que este use case invoca) — decisión a tomar en el research.md de
esa spec, no en esta. Por ahora, `GetCustomerTimelineUseCase` solo sabe combinar
`CustomerHistory` + `AuditLog`, y el Acceptance Scenario 2 de US4 ("Customer sin eventos
más allá de su creación") ya queda cubierto: sin otras specs implementadas, el único
evento disponible además de ediciones es la creación.

## 6. Fusión de duplicados (US5): `mergedIntoCustomerId`, no un nuevo valor de `CustomerStatus`

**Decisión**: campo `mergedIntoCustomerId: String?` (auto-relación) en `Customer`. Al
fusionar, el Customer descartado conserva su `status` original (no se inventa un
`Merged` fuera del catálogo de spec.md: `Activo`/`Inactivo`/`Suspendido`/`Archivado`) y
se le setea `mergedIntoCustomerId` apuntando al sobreviviente. Cualquier lectura directa
del descartado (`GET /customers/:id`) responde con un error dedicado
(`CustomerMergedError`, 409) que incluye el id del sobreviviente, en vez de 404 — así el
frontend puede redirigir automáticamente (Acceptance Scenario 1 de US5: "deja de ser
accesible", no "deja de existir"). Las filas de `CustomerHistory` del descartado se
re-parentan (`customerId` reasignado al sobreviviente) más una entrada sintética que
documenta la fusión, cumpliendo "historial combinado de ambos".

**Rationale**: `CustomerStatus` es un Key Entity explícito de spec.md con 4 valores
documentados; agregar un 5º valor no pedido por ningún FR rompería esa lista sin
necesidad — "fusionado" es ortogonal al estado comercial (un Customer fusionado pudo
haber estado Activo o Archivado, y esa información se pierde si el status se pisa).

**Alternatives considered**: status `Merged` — rechazado por la razón anterior; eliminar
físicamente el descartado — prohibido explícitamente por RN-004/FR-011 (sin eliminación
física en ninguna fase de esta spec).

**Nota para specs futuras**: cuando 009+ (Contacts, Opportunities, etc.) implementen
FKs hacia `Customer`, sus repositorios deben resolver `mergedIntoCustomerId` antes de
operar (seguir la cadena hasta el sobreviviente) — mismo patrón que esta spec documenta,
a decidir en el research.md de cada spec consumidora.

## 7. Exportar/Importar (US5): CSV síncrono, mismo `CreateCustomerUseCase` fila por fila

**Decisión**: formato CSV (columnas = campos estándar de Customer). Import procesa el
archivo fila por fila reutilizando `CreateCustomerUseCase` (misma validación y
unicidad que el alta manual, FR-014), acumulando éxitos/errores por fila sin abortar el
batch completo ante un error puntual (Edge Case: CUIT duplicado en import "sin
interrumpir el resto de la importación"). Procesamiento síncrono dentro del request
HTTP para esta fase.

**Rationale**: reutilizar el use case de creación evita divergencia de reglas entre
alta manual y alta masiva (literal FR-014). CSV es el formato más simple que cumple
"exportar/importar Customers en lote" sin comprometerse a un binario (Excel) que
requiere una librería adicional. Procesamiento síncrono es la opción más simple
(Simplicity Wins) mientras el volumen real de imports de esta fase no esté acotado por
un requisito de spec.md — SC-002 (1M Customers/Organization) es sobre el volumen total
soportado por búsqueda, no sobre el tamaño de un import individual.

**Alternatives considered**: job asíncrono en cola (Bull/BullMQ) con progreso
consultable — más robusto para archivos grandes, pero ninguna infraestructura de colas
existe todavía en el proyecto (sería la primera); se deja como mejora futura si el
volumen real de imports lo exige, no bloqueante para esta fase.

## 8. Concurrencia optimista en edición (Edge Case: dos usuarios editando el mismo Customer)

**Decisión**: columna `version: Int @default(1)` en `Customer`, incrementada en cada
`UPDATE`. El endpoint de edición exige que el cliente envíe la `version` que tenía al
cargar el formulario; si no coincide con la actual en base, la operación se rechaza con
409 (`CustomerStaleUpdateError`) en vez de sobrescribir en silencio.

**Rationale**: es el mecanismo estándar más simple para "conservar el último cambio
guardado sin corromper el registro, informando al segundo usuario" sin necesitar locks
pesimistas (que exigirían mantener estado de sesión de edición) ni un sistema de
resolución de conflictos campo-por-campo (fuera de alcance, no pedido).

**Alternatives considered**: last-write-wins silencioso — rechazado porque el edge case
exige explícitamente "informando al segundo usuario"; locking pesimista — rechazado por
complejidad y porque el uso concurrente real (dos usuarios editando el mismo Customer al
mismo segundo) es infrecuente, no justifica el costo.

## 9. Búsqueda <300ms a escala de 1M filas (SC-001, SC-002): índices `pg_trgm` + btree

**Decisión**: extensión Postgres `pg_trgm` habilitada vía migración Prisma
(`CREATE EXTENSION IF NOT EXISTS pg_trgm`), con índices GIN trigram sobre `name`,
`legalName`, `email` para soportar `ILIKE '%term%'` a escala; índice btree compuesto
`(organizationId, status)` para filtros de listado; índice GIN sobre `tags` (array) para
filtro por etiqueta; índice único ya cubre `(organizationId, taxId)` para búsqueda
exacta por CUIT.

**Rationale**: SC-001/SC-002 son requisitos de rendimiento explícitos y medibles
(<300ms con hasta 1M filas por Organization) — un `ILIKE` sin índice trigram degrada a
sequential scan a ese volumen. `pg_trgm` es la extensión estándar de Postgres para este
caso, ya disponible en la imagen `postgres:15-alpine` usada por `velo-test-db`.

**Alternatives considered**: motor de búsqueda externo (Elasticsearch/Meilisearch) —
rechazado por Simplicity Wins (nueva pieza de infraestructura no justificada todavía
por el volumen real de ninguna Organization existente); `full text search` nativo de
Postgres (`tsvector`) — más apto para búsqueda por palabras completas que para
substring/prefix matching sobre CUIT o fragmentos de nombre, que es el caso de uso
principal aquí (research.md deja esto documentado por si SC-001 no se cumple en
producción y hay que migrar).

## 10. Gating por módulo (`enabledModules` de Organization): sin guard nuevo, gap heredado de spec 007

**Decisión**: esta spec no introduce un `ModuleEnabledGuard`. `customers` queda
protegido igual que cualquier otro recurso: `TenantContextGuard` (clase) +
`@RequirePermission('customer.*')` (método) por endpoint, mismo patrón que
`OrganizationMembersController` (spec 006/007).

**Rationale/gap conocido**: spec 007 solo usa `Organization.enabledModules` para
filtrar qué permisos se **ofrecen para asignar** (`permissionsByModule`,
`ListAvailablePermissionsUseCase`), no para bloquear en tiempo real el acceso a un
endpoint si el módulo `crm` está deshabilitado en el plan de la Organization. Esta spec
hereda ese gap sin resolverlo — no está pedido por ningún FR de spec.md ni de spec 005,
y agregar el guard ahora tocaría infraestructura compartida (`TenantContextGuard`) fuera
del alcance declarado de esta feature. Queda anotado acá para que quien lo necesite
(o audite el sistema) lo encuentre documentado en vez de asumido.
