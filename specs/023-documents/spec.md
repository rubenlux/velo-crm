# Feature Specification: Gestión de Documentos

**Feature Branch**: `023-documents`
**Created**: 2026-07-01
**Status**: Draft
**Input**: User description: "SPEC-023 — Gestión de Documentos. Almacenar, organizar, versionar y relacionar documentos con cualquier entidad del sistema: carga en múltiples formatos, organización en carpetas libres por Organization, etiquetas, versionado completo (nunca se pierde el historial), vista previa sin descarga, descarga, asociación con múltiples entidades (Customer, Contact, Lead, Opportunity, Activity, Task, Product, Supplier, Purchase, Quote, Invoice, Payment), archivado/eliminación lógica, búsqueda, permisos heredados de las entidades relacionadas, con auditoría completa y aislamiento entre organizaciones. No incluye firma electrónica, OCR, edición colaborativa, digitalización automática ni IA para clasificación."

**Nota de terminología**: Esta especificación posee la entidad `Document` del bounded
context **Collaboration** (ver [SPEC-003 — Bounded Contexts](../../docs/bounded-contexts.md),
que ya la anticipaba junto a `Task`, `CalendarEvent` y `Notification`). Es el
repositorio central al que ya referenciaban de forma genérica ("adjuntar documentos")
las specs 008, 009, 012, 013, 014, 015, 016, 017, 018, 021 y 022: esta feature define
cómo se almacena, versiona y organiza un Document; esas specs solo lo asocian a su
propia entidad, sin redefinirlo. No redefine `Role`/`Permission` (spec 007): los
permisos de acceso a un Document se heredan de las entidades a las que está asociado.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Subir documentos y organizarlos en carpetas (Priority: P1) 🎯

Como Usuario de una Organization, quiero subir un documento en cualquier formato
soportado y organizarlo en una carpeta, para tener mis archivos centralizados y
ordenados.

**Why this priority**: Es el valor central del módulo: sin poder subir y organizar
documentos no hay nada que versionar, relacionar ni compartir en las historias
siguientes.

**Independent Test**: Puede probarse subiendo un documento (por ejemplo, un PDF) a una
carpeta de la Organization, verificando que queda accesible y correctamente ubicado, sin
depender de otras historias.

**Acceptance Scenarios**:

1. **Given** una Organization, **When** un Usuario sube un documento en un formato
   soportado (PDF, imagen, Word, Excel, presentación, audio, video, comprimido, texto,
   otro), **Then** el documento queda creado en estado `Activo` con su nombre,
   descripción, tipo y tamaño.
2. **Given** una Organization, **When** un Administrador crea una estructura de
   carpetas (por ejemplo, Clientes, Facturas, Contratos), **Then** los Usuarios pueden
   subir documentos directamente a esas carpetas.
3. **Given** un documento existente, **When** se le asignan etiquetas, **Then** quedan
   disponibles para búsqueda y filtrado.
4. **Given** un documento, **When** se mueve a otra carpeta, **Then** el cambio de
   carpeta queda registrado en el Audit Log.

---

### User Story 2 - Relacionar un documento con múltiples entidades (Priority: P2)

Como Usuario, quiero asociar un documento a un Customer, Opportunity, Purchase u otra
entidad del sistema, para que quede accesible desde la ficha de esa entidad sin
duplicar el archivo.

**Why this priority**: Es el diferenciador clave del módulo frente a un almacenamiento
de archivos genérico: convierte a Document en el repositorio integrado de toda la
plataforma. Depende de que ya exista el documento (US1).

**Independent Test**: Con un documento ya subido, puede probarse asociándolo a un
Customer (spec 008) y a una Opportunity (spec 011) al mismo tiempo, verificando que
aparece en la ficha de ambas entidades sin duplicarse.

**Acceptance Scenarios**:

1. **Given** un documento, **When** se asocia a un Customer, Contact, Lead,
   Opportunity, Activity, Task, Product, Supplier, Purchase, Quote, Invoice o Payment,
   **Then** el documento aparece disponible desde la ficha de esa entidad (RN-002: un
   documento puede asociarse a múltiples entidades a la vez).
2. **Given** un documento asociado a varias entidades, **When** se elimina una de esas
   asociaciones, **Then** el documento permanece intacto y sigue asociado al resto.
3. **Given** un documento, **When** un Usuario intenta acceder a él desde la ficha de
   una entidad sobre la que no tiene permisos, **Then** el sistema deniega el acceso
   (RN-006: los permisos se heredan de las entidades relacionadas).

---

### User Story 3 - Versionar documentos (Priority: P3)

Como Usuario, quiero subir una nueva versión de un documento existente sin perder las
versiones anteriores, para llevar control de cambios sin generar archivos duplicados
sueltos.

**Why this priority**: Aporta valor de control de cambios sobre documentos ya
existentes (US1/US2); un documento único ya es útil sin versionado.

**Independent Test**: Con un documento ya subido, puede probarse subiendo una nueva
versión con un comentario de cambio, y verificando que la versión anterior sigue
disponible íntegra.

**Acceptance Scenarios**:

1. **Given** un documento existente, **When** un Usuario sube una nueva versión con un
   comentario de cambio, **Then** se registra como una nueva versión numerada,
   conservando la anterior sin modificarla (RN-003).
2. **Given** un documento con varias versiones, **When** se consulta su historial,
   **Then** cada versión muestra su número, usuario, fecha y comentario del cambio.
3. **Given** una versión anterior de un documento, **When** un Usuario la descarga,
   **Then** obtiene exactamente el archivo de esa versión, no el de la versión actual.

---

### User Story 4 - Vista previa, descarga y compartir (Priority: P4)

Como Usuario, quiero previsualizar un documento sin descargarlo, descargarlo cuando lo
necesite, y compartirlo con otros Usuarios de mi Organization, para consultar y
distribuir información rápidamente.

**Why this priority**: Mejora la experiencia de consulta sobre documentos ya existentes
(US1-US3); no bloquea la gestión básica de subir/versionar.

**Independent Test**: Con un documento en un formato compatible (por ejemplo, PDF o
imagen), puede probarse previsualizándolo sin descarga; por separado, descargándolo y
compartiéndolo con otro Usuario.

**Acceptance Scenarios**:

1. **Given** un documento en un formato compatible, **When** un Usuario lo abre,
   **Then** puede visualizarlo sin necesidad de descargarlo.
2. **Given** un documento, **When** un Usuario lo descarga, **Then** obtiene el archivo
   de la versión actual, y la descarga queda registrada en el Audit Log.
3. **Given** un documento, **When** un Usuario lo comparte con otro Usuario de su
   Organization, **Then** ese Usuario puede acceder a él según sus permisos.

---

### User Story 5 - Archivado, búsqueda e indicadores (Priority: P5)

Como Administrador, quiero archivar o eliminar lógicamente documentos que ya no se
usan, buscarlos por distintos atributos, y ver indicadores del repositorio (total,
espacio utilizado, por tipo, por entidad), para mantener el repositorio ordenado y con
visibilidad agregada.

**Why this priority**: Aporta mantenimiento y reporting sobre documentos ya existentes
(US1-US4); no bloquea el uso diario del repositorio.

**Independent Test**: Puede probarse archivando un documento, eliminándolo lógicamente,
restaurándolo, buscando por distintos atributos, y consultando los indicadores del
repositorio.

**Acceptance Scenarios**:

1. **Given** un documento activo, **When** un Administrador lo archiva, **Then** pasa a
   estado `Archivado` sin eliminarse físicamente.
2. **Given** un documento, **When** un Administrador lo elimina lógicamente, **Then**
   pasa a estado `Eliminado` (baja lógica, RN-004), y puede restaurarse posteriormente.
3. **Given** varios documentos cargados, **When** se busca por nombre, tipo, etiqueta,
   Customer, Product, Invoice, usuario, fecha o tamaño, **Then** el sistema devuelve
   los que coinciden.
4. **Given** el repositorio de una Organization, **When** se consultan los
   indicadores, **Then** el sistema muestra correctamente el total de documentos,
   espacio utilizado, documentos por tipo, por entidad, recientes, archivados y
   versiones creadas.

---

### Edge Cases

- ¿Qué pasa si se intenta eliminar físicamente un documento? El sistema MUST impedirlo
  (RN-004); solo existen `Archivado`/`Eliminado` como baja lógica, conservando siempre
  el historial de versiones (RN-003).
- ¿Qué ocurre si se elimina o archiva una de las entidades asociadas a un documento
  (por ejemplo, un Customer archivado, spec 008)? El sistema MUST conservar el
  documento accesible desde el resto de sus asociaciones, sin eliminarlo.
- ¿Qué pasa si un documento no está asociado a ninguna entidad? El sistema MUST
  permitirlo: un documento puede existir de forma independiente (por ejemplo, en la
  carpeta "General"), sin relación obligatoria.
- ¿Qué sucede si dos usuarios suben una nueva versión del mismo documento al mismo
  tiempo? El sistema MUST crear ambas versiones de forma consistente y numerada en el
  orden en que se confirmaron, sin perder ninguna.
- ¿Qué pasa si un Usuario tiene permisos sobre una de las entidades asociadas a un
  documento pero no sobre otra? El sistema MUST concederle acceso al documento en
  virtud de la entidad sobre la que sí tiene permisos (RN-006), sin exigir permisos
  sobre todas las asociaciones a la vez.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST permitir cargar documentos en múltiples formatos (PDF,
  imagen, Word, Excel, presentación, audio, video, archivo comprimido, texto, otro).
- **FR-002**: El sistema MUST permitir organizar documentos en una estructura de
  carpetas libre y propia de cada Organization.
- **FR-003**: El sistema MUST permitir asignar etiquetas a un documento.
- **FR-004**: El sistema MUST permitir asociar un documento a una o varias entidades
  del sistema (Customer, Contact, Lead, Opportunity, Activity, Task, Product, Supplier,
  Purchase, Quote, Invoice, Payment) simultáneamente.
- **FR-005**: El sistema MUST mantener un historial de versiones de cada documento,
  con número, usuario, fecha y comentario de cambio, sin perder nunca las versiones
  anteriores.
- **FR-006**: El sistema MUST permitir descargar cualquier versión de un documento.
- **FR-007**: El sistema MUST permitir previsualizar documentos en formatos
  compatibles sin necesidad de descargarlos.
- **FR-008**: El sistema MUST permitir compartir un documento con otros Users de la
  misma Organization.
- **FR-009**: El sistema MUST permitir archivar un documento y eliminarlo lógicamente,
  ambos reversibles, sin eliminación física.
- **FR-010**: El sistema MUST heredar los permisos de acceso a un documento de las
  entidades a las que está asociado, sin definir un sistema de permisos propio.
- **FR-011**: El sistema MUST permitir buscar documentos por nombre, tipo, etiqueta,
  entidad asociada, usuario, fecha o tamaño.
- **FR-012**: El sistema MUST calcular indicadores: total de documentos, espacio
  utilizado, documentos por tipo, por entidad, recientes, archivados y versiones
  creadas.
- **FR-013**: El sistema MUST registrar en el Audit Log la carga, descarga,
  modificación, creación de versión, cambio de carpeta, archivado, restauración y
  eliminación lógica de documentos.
- **FR-014**: El sistema MUST garantizar que los documentos de una Organization nunca
  sean visibles ni modificables desde otra Organization.

### Key Entities

- **Document**: Archivo digital almacenado por la Organization, asociable a una o
  varias entidades del sistema (ver [Domain Model](../../docs/domain-model.md) y
  [Bounded Contexts](../../docs/bounded-contexts.md)); repositorio central que
  reemplaza los conceptos de "Attachment" mencionados de forma genérica en otras specs
  (008, 009, 012, 013, 014, 015, 016, 017, 018, 021, 022). Atributos: información
  general (nombre, descripción, tipo, tamaño, estado), organización (carpeta,
  etiquetas, categoría) e información técnica (usuario creador, fecha de creación,
  última modificación, versión actual).
- **DocumentVersion**: Versión histórica e inmutable de un Document, con número,
  usuario, fecha y comentario del cambio.
- **DocumentStatus**: Estado del Document: `Activo`, `Archivado`, `Eliminado` (baja
  lógica).
- **Folder**: Carpeta de una estructura jerárquica libre, propia de cada Organization,
  usada para organizar Documents.
- **DocumentAssociation**: Relación muchos-a-muchos entre un Document y cualquier otra
  entidad del sistema (Customer, Opportunity, Invoice, etc.).
- **Audit Log**: Registro inmutable de carga/descarga/modificación/creación de
  versión/cambio de carpeta/archivado/restauración/eliminación lógica de documentos.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un Usuario puede subir un documento y asociarlo a una entidad en menos de
  1 minuto.
- **SC-002**: El 100% de las versiones anteriores de un documento permanecen
  disponibles e íntegras después de subir una nueva versión.
- **SC-003**: El 100% de los documentos asociados a una entidad son accesibles desde su
  ficha sin pasos adicionales.
- **SC-004**: El 100% de las acciones de carga, descarga, versión, archivado y
  eliminación lógica quedan registradas en el Audit Log.
- **SC-005**: El 0% de los documentos puede eliminarse físicamente.
- **SC-006**: Las búsquedas de documentos devuelven resultados en menos de 300 ms en el
  95% de los casos.
- **SC-007**: El sistema soporta al menos 1 millón de documentos por Organization sin
  degradar el tiempo de búsqueda definido en SC-006.

## Assumptions

- Esta spec es la implementación concreta de "adjuntar documentos"/"Attachment" que
  otras specs (008, 009, 012, 013, 014, 015, 016, 017, 018, 021, 022) ya mencionaban de
  forma genérica; no se actualiza cada una individualmente porque la relación es
  genérica (`DocumentAssociation`) y no redefine nada de esas specs — cualquier
  implementación de "adjuntar archivo" en el resto del sistema debe apoyarse en esta
  entidad.
- Los permisos de un Document se heredan siempre de al menos una de sus entidades
  asociadas (FR-010); un Document sin ninguna asociación (por ejemplo, en la carpeta
  "General") usa permisos generales de la Organization definidos en spec 007, sin un
  mecanismo de permisos propio adicional.
- El límite de espacio de almacenamiento por Organization (si existiera) es una
  decisión de plan/infraestructura que se define en la fase de planificación técnica,
  no en esta especificación funcional.
- Firma electrónica, OCR, edición colaborativa en tiempo real, escaneo automático,
  clasificación mediante IA e integración con Google Drive/OneDrive/Dropbox quedan
  explícitamente fuera de alcance de esta fase, según el input.
