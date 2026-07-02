<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan:
specs/004-authentication-identity/plan.md (see also docs/implementation-plan.md
for the overall project roadmap and tech stack).
<!-- SPECKIT END -->

## Project: Velo CRM (Business OS)

Multi-tenant Business OS SaaS platform. NOT the same project as "Velo" the Python web
framework (that lives elsewhere) — same brand name, unrelated codebase.

**Repo**: https://github.com/rubenlux/velo-crm.git — this project has its **own**
dedicated git repo nested inside this folder. Do not assume the git root is the user's
home directory; run `git rev-parse --show-toplevel` if unsure.

**Workflow**: GitHub Spec Kit (`.specify/`). Constitution → `/speckit-specify` →
`/speckit-clarify` → `/speckit-plan` → `/speckit-tasks` → `/speckit-implement`.
Constitution: `.specify/memory/constitution.md` (v1.0.0, 10 principles — notably
Multi-Tenant by Default, Security by Default, AI Assists Never Governs).

**Specs**: `specs/004` through `specs/026` are active feature specs, one per bounded
entity/module (Auth, Organizations, Users, Roles, Customers, Contacts, Leads,
Opportunities, Activities, Tasks, Calendar, Quotes, Invoicing, Payments, Products,
Categories, Inventory, Suppliers, Purchases, Documents, Notifications, Workflows,
Reporting). `specs/001` is fully **superseded** (historical only — the original
monolithic "CRM Fase 1" spec before it got decomposed).

**Reference docs**: `docs/product-vision.md`, `docs/domain-model.md`,
`docs/bounded-contexts.md`, `docs/implementation-plan.md` (roadmap + tech stack),
`docs/IMPLEMENTATION.md` (mandatory engineering rules — multi-tenancy, soft delete,
audit log, no-TODO/no-console.log quality gates).

**Code status**: Spec 004 (Authentication & Identity) is fully implemented — all 5 user
stories (register/verify/login/logout, password reset/change, Google/Microsoft OAuth,
session/device management, TOTP MFA) in `backend/` (NestJS + Prisma) and `frontend/`
(React + Vite), 35 tests passing. Deferred: FR-018 invitation-acceptance endpoint (needs
spec 005 Organization/Membership, not built yet). Everything else (specs 005-026) is
spec-only, no implementation yet.

**Local dev DB**: Backend tests run against an isolated Docker container
(`velo-test-db`, postgres:15-alpine, port 5433, user/pass `velo`/`velo`) — separate
from any other local Postgres instance. Start it with `docker start velo-test-db` if
stopped. `backend/.env` and `backend/.env.test` point to it. `backend/jest.config.js`
sets `maxWorkers: 1` — tests share this one real DB and call `resetDatabase()` between
cases, so parallel workers would race and truncate tables mid-test.
