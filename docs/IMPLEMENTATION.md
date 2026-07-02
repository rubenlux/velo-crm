# IMPLEMENTATION.md

# VELO Business OS

Versión: 1.0

---

# Objetivo

Este documento define las reglas obligatorias para implementar VELO.

Ningún agente podrá ignorar estas reglas.

---

# Filosofía

VELO es un Business Operating System modular.

NO es únicamente un CRM.

El CRM es el primer módulo.

Toda implementación deberá respetar la arquitectura modular.

---

# Fuente de Verdad

El orden de prioridad es:

1. Constitution
2. Specs
3. Tasks
4. Código

Nunca el código modifica una SPEC.

Las SPEC son la fuente de verdad.

---

# Arquitectura

Arquitectura Modular.

Cada módulo es independiente.

Ejemplo

Auth

Organizations

CRM

Sales

Inventory

Purchases

Documents

Notifications

Automation

Analytics

Cada módulo posee:

- Dominio
- Casos de uso
- Infraestructura
- API

---

# Principios

Todo desarrollo deberá cumplir:

- SOLID
- Clean Architecture
- Domain Driven Design
- API First
- Multi Tenant
- Security First
- Test First

---

# Multi Tenancy

Toda entidad deberá pertenecer a una Organización.

No puede existir acceso cruzado entre organizaciones.

Todo acceso deberá validar OrganizationId.

---

# Seguridad

Toda petición deberá validar:

- autenticación
- autorización
- organización
- permisos

Nunca confiar en el frontend.

---

# Base de Datos

Toda modificación deberá realizarse mediante migraciones.

Nunca modificar producción manualmente.

Toda entidad deberá incluir:

- id
- organizationId
- createdAt
- updatedAt

Cuando corresponda:

- deletedAt

---

# Soft Delete

Nunca eliminar registros importantes.

Utilizar:

deletedAt

Los datos históricos deben conservarse.

---

# Auditoría

Toda acción importante deberá generar un Audit Log.

Ejemplos

Crear

Editar

Eliminar

Restaurar

Login

Logout

Cambio de permisos

Cambio de estado

---

# API

REST API

Versionada

/api/v1

Convenciones

GET

POST

PUT

PATCH

DELETE

---

# Validaciones

Toda validación ocurre en backend.

Nunca depender del frontend.

---

# Testing

Todo desarrollo deberá incluir:

Unit Test

Integration Test

E2E Test

No se acepta código sin pruebas.

---

# Calidad

Antes de finalizar una implementación:

✓ Compila

✓ Tests pasan

✓ Linter pasa

✓ No warnings

✓ No TODO

✓ No código muerto

✓ No console.log

---

# Performance

Evitar

N+1 Queries

Loops innecesarios

Consultas duplicadas

Objetivo

<300ms operaciones normales.

---

# Observabilidad

Todo módulo deberá registrar:

Logs

Errores

Warnings

Eventos importantes

Health Checks

---

# Dependencias

Un módulo nunca accederá directamente al dominio de otro.

Toda comunicación deberá realizarse mediante interfaces.

---

# Convenciones

Nombres claros.

Código pequeño.

Métodos cortos.

Una responsabilidad por clase.

---

# Documentación

Toda implementación deberá actualizar:

Spec

Tasks

README

Changelog

Cuando corresponda.

---

# Regla Fundamental

Si una implementación contradice una SPEC:

La implementación está equivocada.

Nunca modificar una SPEC para justificar código existente.

Primero se modifica la SPEC.

Luego se implementa.

---

# Criterio de Finalización

Una funcionalidad se considera terminada únicamente cuando:

- La SPEC está completamente implementada.
- Todos los criterios de aceptación se cumplen.
- Todos los tests pasan.
- La documentación está actualizada.
- El código fue revisado.
- No existen errores conocidos relacionados con la funcionalidad.
