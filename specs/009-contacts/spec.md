# Feature Specification: Gestión de Contactos (Contacts)

**Feature Branch**: `009-contacts`
**Created**: 2026-07-01
**Status**: Draft
**Input**: User description: "SPEC-009 — Gestión de Contactos. Administrar todas las personas vinculadas a un Customer, centralizando su información de contacto, historial de interacción y participación en el proceso comercial: alta, edición, baja lógica, contacto principal por cliente, múltiples medios de contacto, historial/línea de tiempo, transferencia de contacto a otro cliente conservando historial, fusión de duplicados, búsqueda global, con auditoría completa y aislamiento entre organizaciones. No incluye envío de campañas, integración con WhatsApp/Email Marketing ni automatizaciones."

**Nota de terminología**: Esta especificación posee la entidad `Contact` del bounded
context **CRM** (ver [SPEC-003 — Bounded Contexts](../../docs/bounded-contexts.md)),
reemplazando el detalle simplificado que antes vivía en la User Story 1 de
[specs/001-crm-fase1-clientes-pipeline/spec.md](../001-crm-fase1-clientes-pipeline/spec.md)
(ver nota de deprecación en esa spec). Depende de `Customer`, ya definido en
[specs/008-customers/spec.md](../008-customers/spec.md): todo Contact pertenece a
exactamente un Customer y a una Organization. No redefine `Organization`, `User`,
`Role`/`Permission` — ver
[specs/005-organizations-multi-tenant](../005-organizations-multi-tenant/spec.md),
[specs/006-users](../006-users/spec.md) y
[specs/007-roles-permissions](../007-roles-permissions/spec.md).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Alta y edición de Contacts (Priority: P1)

Como usuario comercial, quiero crear y editar Contacts asociados a un Customer con sus
datos personales, laborales, de contacto y dirección, para saber exactamente con quién
hablar dentro de la organización de ese Customer.

**Why this priority**: Es el valor central del módulo: sin poder crear/editar Contacts
no existe forma de centralizar esta información.

**Independent Test**: Puede probarse creando un Contact para un Customer existente,
editando sus datos, y archivándolo (baja lógica), verificando en cada paso que la
información persiste correctamente.

**Acceptance Scenarios**:

1. **Given** un Customer existente (ver spec 008), **When** un usuario crea un Contact
   con nombre, apellido, cargo y un medio de contacto, **Then** el Contact queda creado
   y vinculado exclusivamente a ese Customer.
2. **Given** un Contact existente, **When** se edita cualquiera de sus datos, **Then**
   los cambios quedan guardados y el valor anterior se conserva en su historial.
3. **Given** un Contact, **When** un usuario lo da de baja (archivar), **Then** pasa a
   estado `Archivado` sin eliminarse físicamente ni perder su historial.
4. **Given** dos Organizations distintas, **When** cada una gestiona sus propios
   Contacts, **Then** ninguna puede ver ni modificar los Contacts de la otra.

---

### User Story 2 - Definir el contacto principal de un Customer (Priority: P2)

Como usuario comercial, quiero marcar a uno de los Contacts de un Customer como
"contacto principal", para saber de inmediato a quién dirigirme por defecto en esa
cuenta.

**Why this priority**: Es una regla de negocio explícita y de alto impacto en el flujo
diario de ventas, pero depende de que ya existan Contacts creados (US1).

**Independent Test**: Con al menos dos Contacts de un mismo Customer, puede probarse
marcar uno como principal y verificar que el sistema impide tener dos principales a la
vez para ese Customer.

**Acceptance Scenarios**:

1. **Given** un Customer con uno o más Contacts, **When** un usuario marca uno de ellos
   como contacto principal, **Then** ese Contact queda identificado como tal en la
   ficha del Customer.
2. **Given** un Customer que ya tiene un contacto principal, **When** un usuario marca a
   otro Contact como principal, **Then** el anterior deja de serlo automáticamente
   (solo puede existir uno a la vez, RF-004).
3. **Given** un Customer sin ningún Contact marcado como principal, **When** se consulta
   su ficha, **Then** el sistema lo indica claramente en vez de asumir uno por defecto.

---

### User Story 3 - Búsqueda y filtrado de Contacts (Priority: P3)

Como usuario comercial, quiero buscar Contacts por nombre, email, teléfono, cargo,
empresa, ciudad o etiquetas, para encontrar rápidamente a la persona correcta sin
recordar a qué Customer pertenece.

**Why this priority**: Sin búsqueda efectiva, un volumen mediano de Contacts (US1) se
vuelve difícil de aprovechar en la práctica diaria.

**Independent Test**: Con varios Contacts cargados en distintos Customers, puede
probarse buscando por distintos atributos y verificando que los resultados son
correctos, sin depender de otras historias.

**Acceptance Scenarios**:

1. **Given** varios Contacts cargados, **When** se busca por nombre, apellido, email,
   teléfono, WhatsApp, cargo, empresa, ciudad o etiquetas, **Then** el sistema devuelve
   los Contacts que coinciden.
2. **Given** un Contact con múltiples emails o teléfonos registrados, **When** se busca
   por cualquiera de ellos, **Then** el Contact aparece en los resultados.

---

### User Story 4 - Línea de tiempo unificada de un Contact (Priority: P4)

Como usuario comercial, quiero ver el historial unificado de interacciones de un
Contact (creación, modificaciones, llamadas, reuniones, emails, tareas, oportunidades,
documentos, comentarios), para entender de un vistazo la relación con esa persona.

**Why this priority**: Aporta valor una vez que ya existen Contacts y eventos asociados
(US1, y las specs que aportan Activities/Opportunities/Documentos); no bloquea la
gestión básica de Contacts.

**Independent Test**: Con un Contact que tuvo modificaciones y al menos un evento
asociado, puede probarse consultando su línea de tiempo y verificando el orden
cronológico correcto.

**Acceptance Scenarios**:

1. **Given** un Contact con historial de creación, modificaciones y eventos asociados,
   **When** se consulta su línea de tiempo, **Then** todos los eventos aparecen
   ordenados cronológicamente.
2. **Given** un Contact sin eventos más allá de su creación, **When** se consulta su
   línea de tiempo, **Then** se muestra únicamente el evento de creación.

---

### User Story 5 - Transferir contacto y fusionar duplicados (Priority: P5)

Como Administrador, quiero transferir un Contact a otro Customer y fusionar Contacts
duplicados, para corregir errores de carga y mantener los datos comerciales
consistentes.

**Why this priority**: Es una operación de mantenimiento de datos, útil pero no
bloqueante frente a las capacidades ya cubiertas por US1-US4.

**Independent Test**: Puede probarse transfiriendo un Contact de un Customer a otro y
verificando que conserva su historial; por separado, fusionando dos Contacts
duplicados y verificando que el resultado conserva el historial combinado de ambos.

**Acceptance Scenarios**:

1. **Given** un Contact asociado a un Customer, **When** un Administrador lo transfiere
   a otro Customer, **Then** el Contact queda vinculado exclusivamente al nuevo
   Customer, conservando todo su historial previo (RF-010).
2. **Given** dos Contacts identificados como duplicados, **When** un Administrador los
   fusiona, **Then** el sistema conserva un único Contact con el historial combinado de
   ambos.

---

### Edge Cases

- ¿Qué pasa si se intenta transferir el contacto principal de un Customer a otro
  Customer? El sistema MUST permitirlo, pero el Customer de origen queda sin contacto
  principal hasta que se designe uno nuevo (no se transfiere automáticamente el
  carácter de "principal").
- ¿Qué ocurre si se intenta crear un Contact sin asociarlo a ningún Customer? El
  sistema MUST impedirlo: todo Contact pertenece a exactamente un Customer (RN-001).
- ¿Qué pasa si un Customer se archiva (ver spec 008) mientras tiene Contacts activos?
  El sistema MUST conservar los Contacts intactos y accesibles en modo solo lectura,
  igual que el resto de los datos del Customer archivado.
- ¿Qué sucede si se fusionan dos Contacts que pertenecen a Customers distintos? El
  sistema MUST rechazarlo o exigir primero transferirlos al mismo Customer (US5),
  ya que un Contact fusionado debe seguir perteneciendo a un único Customer.
- ¿Qué pasa si dos usuarios editan el mismo Contact al mismo tiempo? El sistema MUST
  conservar el último cambio guardado sin corromper el registro, informando al segundo
  usuario que los datos se actualizaron.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST permitir crear múltiples Contacts por Customer.
- **FR-002**: El sistema MUST garantizar que cada Contact pertenezca a exactamente un
  Customer.
- **FR-003**: El sistema MUST permitir designar un Contact como contacto principal de
  su Customer.
- **FR-004**: El sistema MUST garantizar que exista como máximo un contacto principal
  por Customer a la vez.
- **FR-005**: El sistema MUST permitir registrar múltiples correos electrónicos por
  Contact.
- **FR-006**: El sistema MUST permitir registrar múltiples teléfonos por Contact.
- **FR-007**: El sistema MUST permitir registrar perfiles/redes (por ejemplo,
  LinkedIn) y WhatsApp de un Contact.
- **FR-008**: El sistema MUST permitir asociar etiquetas a un Contact.
- **FR-009**: El sistema MUST mantener un historial completo de cada Contact
  (creación, modificaciones y eventos asociados).
- **FR-010**: El sistema MUST permitir transferir un Contact de un Customer a otro,
  conservando su historial.
- **FR-011**: El sistema MUST soportar campos personalizados adicionales a los campos
  estándar de un Contact.
- **FR-012**: El sistema MUST permitir dar de baja lógica a un Contact (archivar) sin
  eliminarlo físicamente.
- **FR-013**: El sistema MUST permitir fusionar dos o más Contacts duplicados
  conservando el historial combinado, siempre que pertenezcan al mismo Customer.
- **FR-014**: El sistema MUST permitir buscar Contacts por nombre, apellido, email,
  teléfono, WhatsApp, cargo, empresa (Customer), ciudad o etiquetas.
- **FR-015**: El sistema MUST mostrar una línea de tiempo unificada por Contact con
  todos sus eventos relacionados.
- **FR-016**: El sistema MUST registrar en el Audit Log la creación, modificación,
  cambio de Customer, cambio de contacto principal, archivado, restauración y fusión
  de Contacts.
- **FR-017**: El sistema MUST garantizar que los Contacts de una Organization nunca
  sean visibles ni modificables desde otra Organization.

### Key Entities

- **Contact**: Persona física perteneciente a un Customer (ver
  [Domain Model](../../docs/domain-model.md) y
  [specs/008-customers/spec.md](../008-customers/spec.md)); punto de comunicación entre
  la Organization y el Customer. Atributos: información personal (nombre, apellido,
  fotografía, fecha de nacimiento y género opcionales), laboral (cargo, departamento,
  área, nivel de decisión), de contacto (email principal y secundarios, teléfonos,
  WhatsApp, LinkedIn, sitio web), dirección (país, provincia, ciudad, dirección) y
  comercial (responsable, estado, etiquetas, prioridad).
- **ContactStatus**: Estado del Contact: `Activo`, `Inactivo`, `Archivado` (baja
  lógica).
- **Tag**: Etiqueta libre asociable a uno o más Contacts (comparte el mismo concepto
  que en spec 008).
- **Timeline Entry**: Evento cronológico asociado a un Contact (creación,
  modificación, llamada, reunión, email, tarea, oportunidad, documento, comentario).
- **Audit Log**: Registro inmutable de creación/modificación/cambio de Customer/cambio
  de contacto principal/archivado/restauración/fusión de Contacts.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Las búsquedas de Contacts devuelven resultados en menos de 300 ms en el
  95% de los casos.
- **SC-002**: El sistema soporta al menos 1 millón de Contacts por Organization sin
  degradar el tiempo de búsqueda definido en SC-001.
- **SC-003**: El 100% de las acciones de creación, modificación, transferencia,
  cambio de contacto principal, archivado y fusión quedan registradas en el Audit Log.
- **SC-004**: El 100% de los Customers con más de un Contact tienen, como máximo, un
  único contacto principal en todo momento.
- **SC-005**: Un usuario puede crear un Contact nuevo con sus datos principales en
  menos de 2 minutos.
- **SC-006**: El 0% de los Contacts transferidos o fusionados pierde historial previo.

## Assumptions

- Un Customer puede no tener ningún Contact (RN-004 del input); esto no es un error,
  solo un estado transitorio o de bajo detalle de carga.
- La designación de contacto principal (US2) no se transfiere automáticamente al mover
  un Contact entre Customers (US5); debe volver a designarse en el Customer de destino
  si corresponde.
- La fusión de Contacts (US5, FR-013) solo aplica entre Contacts de un mismo Customer;
  fusionar Contacts de Customers distintos requiere primero transferirlos al mismo
  Customer.
- Las funcionalidades explícitamente fuera de alcance del input (campañas de Email
  Marketing, integración con WhatsApp Business, Email Marketing, automatizaciones,
  telefonía IP, videollamadas, sincronización con agendas externas, redes sociales) se
  definirán en especificaciones independientes futuras.
- El campo "Nivel de decisión" y los ejemplos de cargo (Dueño, Director, Compras,
  Marketing, Finanzas, Sistemas, Recursos Humanos) son valores de referencia
  configurables, no un catálogo cerrado.
