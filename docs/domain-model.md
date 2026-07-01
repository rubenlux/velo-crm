# SPEC-002 — Domain Model

## Objetivo

Definir el modelo de dominio principal de VELO.

Este documento establece el lenguaje ubicuo del sistema y las entidades fundamentales
sobre las cuales se construirá toda la plataforma.

Ver también [SPEC-003 — Bounded Contexts](bounded-contexts.md), que organiza estas
entidades (y otras que se irán detallando) en contextos delimitados y describe los
eventos de dominio.

---

## Principios

- El dominio representa el negocio, no la base de datos.
- Las entidades existen independientemente de la interfaz de usuario.
- Cada entidad posee responsabilidades claras.
- Las relaciones deben minimizar el acoplamiento.
- Todo dato pertenece a una Organización.

---

## Entidad Raíz

### Organization

Representa una empresa que utiliza VELO.

Es el límite principal de aislamiento de datos (Tenant).

**Responsabilidades**

- Configuración
- Suscripción
- Facturación
- Usuarios
- Módulos habilitados
- Seguridad
- Auditoría

---

### User

Persona que accede a VELO.

Puede pertenecer a una o varias organizaciones.

**Responsabilidades**

- Autenticación
- Perfil
- Preferencias
- Roles
- Permisos

---

### Membership

Relaciona usuarios con organizaciones.

Permite:

- múltiples organizaciones
- múltiples roles
- permisos independientes

---

### Role

Agrupa permisos.

Ejemplos:

- Administrador
- Gerente
- Ventas
- Soporte
- Contabilidad

---

### Permission

Representa una acción autorizada.

Ejemplos:

- client.read
- client.write
- invoice.create
- inventory.update

---

### Customer

Empresa o persona que compra productos o servicios.

Puede contener:

- contactos
- direcciones
- oportunidades
- facturas
- documentos

---

### Contact

Persona perteneciente a un cliente.

Ejemplos:

- dueño
- gerente
- compras
- administración

---

### Lead

Prospecto aún no convertido en cliente.

Puede evolucionar hacia Customer.

---

### Opportunity

Posible negocio.

Estados:

- Nuevo
- Calificado
- Propuesta
- Negociación
- Ganado
- Perdido

---

### Activity

Registro cronológico de acciones.

Ejemplos:

- llamada
- email
- reunión
- tarea
- nota

---

### Task

Trabajo pendiente.

Puede asignarse a uno o varios usuarios.

---

### Project

Agrupa tareas relacionadas.

---

### Calendar Event

Eventos programados.

---

### Document

Archivos asociados a cualquier entidad.

Ejemplos:

- PDF
- imágenes
- contratos
- presupuestos

---

### Product

Artículo o servicio comercializable.

---

### Category

Agrupa productos.

---

### Inventory

Existencia física de productos.

---

### Supplier

Proveedor de productos o servicios.

---

### Purchase

Compra realizada a un proveedor.

---

### Quote

Presupuesto enviado a un cliente.

---

### Invoice

Factura emitida.

---

### Payment

Pago recibido o realizado.

---

### Expense

Gasto registrado.

---

### Workflow

Automatización empresarial.

Se ejecuta mediante eventos.

---

### Notification

Comunicación enviada al usuario.

---

### Audit Log

Registro inmutable de acciones críticas.

---

### AI Agent

Agente inteligente especializado.

Ejemplos:

- Ventas
- Atención
- Finanzas
- Inventario
- RRHH

---

## Relaciones principales

```
Organization
├── Users
├── Customers
├── Leads
├── Products
├── Suppliers
├── Projects
├── Documents
├── Workflows
├── AI Agents
└── Audit Logs

Customer
├── Contacts
├── Opportunities
├── Quotes
├── Invoices
├── Activities
└── Documents

Opportunity
├── Activities
├── Tasks
└── Documents

Invoice
├── Payments
└── Documents

Product
└── Inventory
```

---

## Reglas de dominio

- Ninguna entidad existe fuera de una Organization.
- Todo cambio importante genera un Audit Log.
- Los permisos se validan en el dominio.
- Los documentos son entidades reutilizables.
- Las automatizaciones reaccionan a eventos del dominio.
- Los módulos se comunican mediante eventos, nunca mediante acceso directo a datos
  internos.

---

## Resultado esperado

Este modelo constituye el lenguaje ubicuo de VELO y servirá como base para todas las
especificaciones funcionales futuras.
