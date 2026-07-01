# Feature Specification: CRM Fase 1 — Customers, Pipeline y Equipo

**Feature Branch**: `001-crm-fase1-clientes-pipeline`
**Created**: 2026-07-01
**Status**: Draft
**Input**: User description: "Fase 1 del roadmap de Velo CRM (docs/product-vision.md): un CRM completo multi-tenant para PyMEs de servicios, comercios, agencias, software, estudios profesionales y constructoras. Incluye gestión de Empresas (tenants), Usuarios, Roles, Permisos, Clientes, Prospectos, Contactos, Pipeline de ventas, Actividades y Dashboard. Cada empresa opera de forma aislada (multi-tenant), con auditoría y permisos por rol. El objetivo es que una PyME pueda gestionar su relación con clientes y su pipeline comercial completo sin salir de Velo CRM, sentando las bases (usuarios, permisos, auditoría) que compartirán las fases futuras (Agenda, Facturación, Inventario, RRHH, Automatizaciones, Marketplace)."

**Nota de terminología**: Esta especificación usa el lenguaje ubicuo definido en
[SPEC-002 — Domain Model](../../docs/domain-model.md) (`Organization`, `User`,
`Membership`, `Role`, `Permission`, `Customer`, `Lead`, `Contact`, `Opportunity`,
`Activity`, `Audit Log`). El texto de negocio en español ("empresa", "cliente",
"prospecto") se usa como sinónimo conversacional de estas entidades canónicas.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Gestión de Customers, Leads y Contacts (Priority: P1)

Como usuario comercial de una PyME, quiero registrar y consultar mis Customers, Leads
y sus Contacts en un único lugar, para dejar de depender de planillas y chats sueltos
y tener siempre a mano la información de con quién estoy hablando.

**Why this priority**: Es el valor central de un CRM. Sin esto no hay producto: es lo
mínimo que ya reemplaza el Excel/WhatsApp que usa hoy la PyME.

**Independent Test**: Puede probarse creando una Organization, dando de alta un Customer
y un Lead con sus Contacts, y verificando que se pueden buscar, editar y consultar sin
ninguna otra funcionalidad implementada.

**Acceptance Scenarios**:

1. **Given** una Organization activa en el sistema, **When** un usuario comercial crea un
   nuevo Lead con nombre, datos de contacto y origen, **Then** el Lead queda visible en
   el listado de esa Organization con su información completa.
2. **Given** un Customer existente, **When** el usuario agrega un nuevo Contact asociado
   (persona de la organización cliente), **Then** ese Contact aparece vinculado al
   Customer y es consultable desde su ficha.
3. **Given** un Lead calificado, **When** el usuario lo convierte en Customer,
   **Then** se conserva su historial y pasa a listarse como Customer.
4. **Given** dos Organizations distintas usando el sistema, **When** un usuario de la
   Organization A busca Customers, **Then** solo ve los registros de la Organization A,
   nunca los de la Organization B.

---

### User Story 2 - Pipeline de ventas (Opportunities) (Priority: P2)

Como usuario comercial, quiero mover mis Opportunities de negocio a través de las etapas
de mi proceso de venta, para saber en qué estado está cada negociación y priorizar mi
trabajo del día.

**Why this priority**: Es el segundo pilar del CRM: convierte el listado de contactos en
una herramienta de gestión activa del negocio, no solo una libreta de direcciones.

**Independent Test**: Con Customers/Leads ya creados (US1), puede probarse creando una
Opportunity, moviéndola entre etapas y verificando que el pipeline refleja su estado
actual, sin necesidad de Activities ni dashboard.

**Acceptance Scenarios**:

1. **Given** un Lead existente, **When** el usuario crea una Opportunity asociada,
   **Then** la Opportunity aparece en la primera etapa (Nuevo) del pipeline de su
   Organization.
2. **Given** una Opportunity en una etapa del pipeline, **When** el usuario la mueve a la
   siguiente etapa, **Then** el sistema registra el cambio de etapa con fecha y usuario
   responsable.
3. **Given** una Opportunity, **When** el usuario la marca como "Ganado" o "Perdido",
   **Then** la Opportunity se cierra y deja de aparecer entre las abiertas, pero
   permanece consultable en el historial.

---

### User Story 3 - Activities y seguimiento comercial (Priority: P3)

Como usuario comercial, quiero registrar llamadas, reuniones y tareas asociadas a un
Customer, Lead u Opportunity, para no perder el seguimiento de lo que ya hice y lo que
falta hacer.

**Why this priority**: Refuerza la trazabilidad del proceso comercial una vez que ya
existen Customers y pipeline, evitando que el seguimiento vuelva a dispersarse en agendas
externas.

**Independent Test**: Con un Customer u Opportunity ya creados, puede probarse
registrando una Activity, marcándola como completada y verificando que queda en el
historial asociado, de forma independiente del dashboard.

**Acceptance Scenarios**:

1. **Given** un Customer o una Opportunity, **When** el usuario registra una Activity
   (llamada, reunión o tarea) con fecha, **Then** la Activity queda listada en el
   historial de ese Customer/Opportunity.
2. **Given** una Activity pendiente, **When** el usuario la marca como completada,
   **Then** se registra la fecha de finalización y deja de contar como pendiente.
3. **Given** una Activity con fecha futura, **When** llega esa fecha sin haberse
   completado, **Then** el sistema la muestra como vencida en el listado del usuario
   responsable.

---

### User Story 4 - Administración de Users, Roles y Permissions (Priority: P4)

Como administrador de la Organization, quiero invitar Users a mi cuenta y asignarles un
Role con Permissions específicos, para controlar quién puede ver y modificar la
información comercial de mi empresa.

**Why this priority**: Es la base de seguridad y multi-tenencia (Membership) que las
fases futuras (Agenda, Facturación, RRHH, etc.) reutilizarán, pero el CRM ya es usable
con un único User administrador mientras se implementa el resto.

**Independent Test**: Puede probarse invitando un segundo User a una Organization,
asignándole un Role con Permissions limitados y verificando que no puede acceder a las
acciones restringidas, independientemente de Customers/pipeline/Activities.

**Acceptance Scenarios**:

1. **Given** una Organization registrada, **When** el administrador invita a un nuevo
   User por correo electrónico, **Then** el User recibe una Membership a esa Organization
   una vez acepta la invitación.
2. **Given** un User con Role "Ventas", **When** intenta eliminar un Customer (Permission
   `customer.delete`, reservada al Role "Administrador"), **Then** el sistema deniega la
   acción y la registra en el Audit Log.
3. **Given** una acción relevante (crear, editar, eliminar un Customer/Opportunity),
   **When** ocurre, **Then** queda registrada en el Audit Log de la Organization con
   User, fecha y acción realizada.

---

### User Story 5 - Dashboard comercial (Priority: P5)

Como usuario comercial o administrador, quiero ver un panel con los indicadores clave de
mi actividad comercial (Customers, Opportunities abiertas, Activities pendientes), para
entender de un vistazo cómo va el negocio sin tener que recorrer cada módulo.

**Why this priority**: Aporta valor una vez que ya existen datos de Customers, pipeline y
Activities; sin esos módulos no hay nada que mostrar.

**Independent Test**: Con datos ya cargados de Customers, Opportunities y Activities,
puede probarse accediendo al dashboard y verificando que los indicadores coinciden con
los datos reales de esa Organization.

**Acceptance Scenarios**:

1. **Given** una Organization con Customers y Opportunities cargadas, **When** el usuario
   entra al dashboard, **Then** ve el total de Customers, Leads y Opportunities abiertas
   por etapa.
2. **Given** Activities pendientes y vencidas, **When** el usuario entra al dashboard,
   **Then** ve un resumen de sus Activities pendientes y vencidas del día.
3. **Given** dos Organizations distintas, **When** cada una consulta su dashboard,
   **Then** cada una ve únicamente sus propios indicadores.

---

### Edge Cases

- ¿Qué sucede si se intenta crear un Customer/Lead con datos de Contact duplicados
  (mismo email o teléfono) dentro de la misma Organization? El sistema debe advertir
  sobre el posible duplicado antes de confirmar la creación.
- ¿Cómo maneja el sistema el intento de un User de acceder a datos de una Organization a
  la que no pertenece (por ejemplo, manipulando una URL o ID)? Debe denegarse el acceso y
  registrarse el intento en el Audit Log.
- ¿Qué ocurre si se elimina la única Membership con Role administrador de una
  Organization? El sistema debe impedir esa acción para evitar que la Organization quede
  sin administrador.
- ¿Cómo se comporta el pipeline si se elimina una etapa que tiene Opportunities activas
  en curso? Las Opportunities deben reasignarse a una etapa válida antes de permitir
  eliminar la etapa.
- ¿Qué pasa si dos Users editan el mismo Customer u Opportunity al mismo tiempo? Debe
  conservarse el último cambio guardado sin corromper el registro, informando al segundo
  User que los datos se actualizaron.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST permitir crear una Organization como contenedor aislado
  (tenant) de todos sus datos comerciales.
- **FR-002**: El sistema MUST garantizar que ningún User pueda ver o modificar datos de
  una Organization con la que no tiene Membership.
- **FR-003**: El sistema MUST permitir invitar Users a una Organization mediante una
  Membership y asignarles un Role (por ejemplo: Administrador, Gerente, Ventas).
- **FR-004**: El sistema MUST restringir las acciones disponibles a cada User según los
  Permissions de su Role (convención `recurso.acción`, ej. `customer.read`,
  `customer.write`, `opportunity.write`).
- **FR-005**: El sistema MUST impedir que una Organization quede sin al menos una
  Membership con Role Administrador.
- **FR-006**: El sistema MUST permitir crear, editar, consultar y eliminar Customers y
  Leads, incluyendo sus datos de Contact principales.
- **FR-007**: El sistema MUST permitir asociar uno o más Contacts a un Customer o Lead.
- **FR-008**: El sistema MUST permitir convertir un Lead en Customer conservando su
  historial de Activities y Opportunities.
- **FR-009**: El sistema MUST permitir crear Opportunities asociadas a un Customer o
  Lead.
- **FR-010**: El sistema MUST organizar las Opportunities en etapas de un pipeline
  configurable por Organization, con un conjunto de etapas por defecto (Nuevo,
  Calificado, Propuesta, Negociación, Ganado, Perdido).
- **FR-011**: El sistema MUST registrar quién y cuándo movió una Opportunity de etapa.
- **FR-012**: El sistema MUST permitir cerrar una Opportunity como "Ganado" o "Perdido"
  sin eliminar su historial.
- **FR-013**: El sistema MUST permitir registrar Activities (llamada, reunión, tarea)
  asociadas a un Customer, Lead u Opportunity, con fecha y responsable.
- **FR-014**: El sistema MUST permitir marcar una Activity como completada y distinguir
  las Activities pendientes de las vencidas.
- **FR-015**: El sistema MUST registrar en el Audit Log las acciones relevantes
  (creación, edición, eliminación) sobre Customers, Leads, Opportunities y
  Users/Memberships, incluyendo quién y cuándo las realizó.
- **FR-016**: El sistema MUST advertir sobre posibles duplicados (mismo email o teléfono)
  al crear un Customer o Lead dentro de la misma Organization.
- **FR-017**: El sistema MUST proveer un dashboard por Organization con el total de
  Customers, Leads, Opportunities abiertas por etapa y Activities pendientes/vencidas.
- **FR-018**: El sistema MUST permitir buscar Customers, Leads y Contacts por nombre,
  Organization asociada o datos de contacto.

### Key Entities

Entidades tomadas directamente del lenguaje ubicuo definido en
[SPEC-002 — Domain Model](../../docs/domain-model.md):

- **Organization**: Empresa que usa Velo CRM; contenedor aislado (tenant) de todos los
  datos comerciales; tiene una o más Memberships y al menos un Administrador.
- **User**: Persona con acceso a una o más Organizations a través de una Membership.
- **Membership**: Relación entre un User y una Organization; define el Role (y por
  extensión los Permissions) de ese User dentro de esa Organization.
- **Role**: Agrupa Permissions dentro de una Organization. Esta fase usa Administrador,
  Gerente y Ventas; Soporte y Contabilidad quedan reservados para fases futuras.
- **Permission**: Acción autorizada sobre un recurso (`recurso.acción`, ej.
  `customer.write`, `opportunity.write`, `activity.write`).
- **Customer**: Organización o persona con la que la empresa ya tiene una relación
  comercial activa; agrupa Contacts, Opportunities y Activities.
- **Lead**: Organización o persona en evaluación comercial, aún sin relación activa;
  puede evolucionar hacia Customer.
- **Contact**: Persona individual asociada a un Customer o Lead (nombre, cargo, email,
  teléfono).
- **Opportunity**: Negociación de venta asociada a un Customer o Lead; avanza por etapas
  del pipeline hasta cerrarse como Ganado o Perdido.
- **Activity**: Llamada, reunión, tarea o nota asociada a un Customer, Lead u
  Opportunity, con fecha, responsable y estado (pendiente, completada, vencida).
- **Audit Log**: Registro inmutable de acciones críticas (quién, cuándo, qué acción,
  sobre qué entidad) dentro de una Organization.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un usuario nuevo puede crear su primer Customer o Lead en menos de
  2 minutos desde que ingresa al sistema.
- **SC-002**: El sistema soporta al menos 50 Organizations activas de forma simultánea
  sin que los datos de una sean visibles para otra.
- **SC-003**: El 90% de las búsquedas de Customers/Leads/Contacts devuelven resultados en
  menos de 2 segundos.
- **SC-004**: Un usuario comercial puede mover una Opportunity entre etapas del pipeline
  en menos de 10 segundos, sin recargar la página completa.
- **SC-005**: El 100% de las acciones de creación, edición y eliminación sobre Customers,
  Leads, Opportunities y Users/Memberships quedan registradas en el Audit Log,
  verificable mediante consulta del log.
- **SC-006**: Una PyME con hasta 5 Users puede gestionar todo su ciclo comercial (alta de
  Lead → Opportunity → cierre) sin salir de Velo CRM durante la prueba de aceptación.
- **SC-007**: El dashboard de una Organization refleja cambios en Customers, Opportunities
  o Activities en menos de 5 segundos después de realizados.

## Assumptions

- Un User puede tener Membership en una o más Organizations, pero cada sesión opera en
  el contexto de una única Organization a la vez (selección de Organization activa).
- Los Roles por defecto de esta fase son Administrador, Gerente y Ventas; Soporte y
  Contabilidad (mencionados en el Domain Model) se incorporan en fases futuras junto con
  Facturación e Inventario.
- Las etapas del pipeline de Opportunity vienen con un set por defecto (Nuevo,
  Calificado, Propuesta, Negociación, Ganado, Perdido, alineado con el Domain Model) y
  son editables por el Administrador de cada Organization.
- La invitación de Users se realiza por correo electrónico; no se incluyen en esta fase
  inicios de sesión federados (SSO) ni integración con directorios corporativos.
- El dashboard de esta fase muestra métricas agregadas propias del CRM (Customers,
  pipeline, Activities); no incluye reportes financieros, que corresponden a fases
  futuras (Facturación).
- La detección de duplicados se basa en coincidencia exacta de email o teléfono dentro
  de la misma Organization; no se incluyen algoritmos de coincidencia difusa en esta
  fase.
