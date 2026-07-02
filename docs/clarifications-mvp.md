# Clarifications — Product & Architecture FAQ

Preguntas y respuestas de referencia que reafirman la visión de producto y la
constitución del proyecto, y fijan explícitamente el alcance del MVP.

## Product

**Q: What is VELO?**
A: VELO is a modular Business Operating System (Business OS) designed for small and
medium-sized businesses. Ver [docs/product-vision.md](product-vision.md).

**Q: Is VELO only a CRM?**
A: No. The MVP focuses on CRM, but the long-term vision is a complete Business OS.

**Q: What is the first release?**
A: CRM only (ver [specs/001-crm-fase1-clientes-pipeline/spec.md](../specs/001-crm-fase1-clientes-pipeline/spec.md)).

**Q: Who is the target audience?**
A: Small and medium-sized businesses.

## Architecture

**Q: Is the system multi-tenant?**
A: Yes. Multi-tenancy is mandatory from day one (ver Constitución, Principio IV, y
[specs/005-organizations-multi-tenant/spec.md](../specs/005-organizations-multi-tenant/spec.md)).

**Q: What is the tenant boundary?**
A: Organization.

**Q: Can a user belong to multiple organizations?**
A: Yes.

**Q: Can users have different roles in different organizations?**
A: Yes (vía Membership por Organization; ver Domain Model).

**Q: Is the system modular?**
A: Yes. Every business capability is implemented as an independent module
(Constitución, Principio II).

**Q: Can modules directly access each other's data?**
A: No. Communication occurs through defined interfaces and domain events.

## Security

**Q: Is authentication mandatory?**
A: Yes (ver [specs/004-authentication-identity/spec.md](../specs/004-authentication-identity/spec.md)).

**Q: Is authorization role-based?**
A: Yes.

**Q: Will every important action be audited?**
A: Yes.

## AI

**Q: Is AI responsible for business rules?**
A: No. AI assists users but deterministic business rules always take precedence
(Constitución, Principio IX).

## API

**Q: Is the platform API-first?**
A: Yes. The frontend consumes the same APIs exposed publicly (Constitución, Principio VI).

## Data

**Q: Does every entity belong to an Organization?**
A: Yes.

**Q: Can data be shared between organizations?**
A: No.

## Deployment

**Q: Is VELO Cloud-native?**
A: Yes.

**Q: Will self-hosting be supported?**
A: Not in the MVP.

## Out of Scope (MVP)

- Accounting
- Payroll
- Manufacturing
- Marketplace
- Public API
- AI Agents
