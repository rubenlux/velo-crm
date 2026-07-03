<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan:
specs/006-users/plan.md (see also docs/implementation-plan.md
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

**Code status**: Specs 004 (Authentication & Identity), 005 (Organizations,
Multi-Tenant) and 006 (Users) are fully implemented — 82 backend tests passing. Spec
004: register/verify/login/logout, password reset/change, Google/Microsoft OAuth,
session/device management, TOTP MFA. Spec 005: create/configure Organization with
automatic Propietario Membership, branding/tax/modules by plan, invitations (closes
spec 004's FR-018), plan changes, suspend/reactivate — tenant isolation enforced by
`TenantContextGuard` (`X-Organization-Id` header + Membership check, global
deny-by-default via `AppModule`'s `APP_GUARD`). Spec 006: profile/preferences,
list/switch Organizations, admin lifecycle (deactivate/reactivate/soft-delete Users
with a "never without an administrator" invariant), access history — extends the same
`User` table owned by `identity` rather than duplicating it (see
`specs/006-users/research.md`). Everything else (specs 007-026) is spec-only, no
implementation yet.

**Local dev DB**: Backend tests run against an isolated Docker container
(`velo-test-db`, postgres:15-alpine, port 5433, user/pass `velo`/`velo`) — separate
from any other local Postgres instance. Start it with `docker start velo-test-db` if
stopped. `backend/.env` and `backend/.env.test` point to it. `backend/jest.config.js`
sets `maxWorkers: 1` — tests share this one real DB and call `resetDatabase()` between
cases, so parallel workers would race and truncate tables mid-test.
