# SPEC-003 — Domain Model: Bounded Contexts

## Objetivo

Definir el lenguaje ubicuo de VELO CRM y el modelo de dominio que servirá como base para
todos los módulos de la plataforma.

Este documento describe las entidades de negocio, sus responsabilidades, relaciones e
invariantes. No define el modelo físico de base de datos.

Complementa a [SPEC-002 — Domain Model](domain-model.md): SPEC-002 detalla las
responsabilidades y ejemplos de cada entidad; este documento organiza esas entidades (y
otras aún no descritas en detalle) en Bounded Contexts, agrega los eventos de dominio y
sirve como mapa de referencia para la evolución modular de la plataforma.

---

## Principios

- El dominio representa el negocio, no la persistencia.
- Cada entidad tiene una responsabilidad única.
- Todo dato pertenece a una Organización.
- El dominio no depende del frontend ni de la infraestructura.
- Las reglas de negocio viven en el dominio.

---

## Bounded Contexts

### Identity

- User
- Role
- Permission
- Membership

### Organization

- Organization
- Workspace
- Settings

### CRM

- Customer
- Contact
- Lead
- Opportunity
- Activity

### Sales

- Quote
- Invoice
- Payment

### Inventory

- Product
- Category
- Inventory
- Supplier
- Purchase

### Collaboration

- Task
- CalendarEvent
- Document
- Notification

### Automation

- Workflow
- Trigger
- Action

### AI

- Agent
- Prompt
- Conversation

### Audit

- AuditLog

---

## Entidades principales

- Organization
- User
- Membership
- Role
- Permission
- Customer
- Contact
- Lead
- Opportunity
- Activity
- Task
- CalendarEvent
- Document
- Product
- Category
- Inventory
- Supplier
- Purchase
- Quote
- Invoice
- Payment
- Workflow
- Notification
- AuditLog
- Agent

---

## Reglas del dominio

- Ninguna entidad existe fuera de una Organization.
- Todo cambio importante genera un AuditLog.
- Los permisos siempre se validan antes de ejecutar una acción.
- Los Workflows reaccionan a eventos del dominio.
- Los documentos pueden asociarse a cualquier entidad.
- Las entidades nunca acceden directamente a otras bases de datos o módulos.

---

## Eventos del dominio

Ejemplos:

- CustomerCreated
- LeadQualified
- OpportunityWon
- InvoiceIssued
- PaymentReceived
- InventoryUpdated
- TaskCompleted
- WorkflowExecuted

---

## Objetivo final

Construir un modelo de dominio consistente que permita agregar nuevos módulos sin romper
los existentes.
