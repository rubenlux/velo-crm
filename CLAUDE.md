<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan:
specs/007-roles-permissions/plan.md (see also docs/implementation-plan.md
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
Multi-Tenant), 006 (Users) and 007 (Roles & Permissions) are fully implemented — 99
backend tests passing (0 frontend tests yet). Spec 004: register/verify/login/logout,
password reset/change, Google/Microsoft OAuth, session/device management, TOTP MFA.
Spec 005: create/configure Organization with automatic Propietario Membership,
branding/tax/modules by plan, invitations (closes spec 004's FR-018), plan changes,
suspend/reactivate. Spec 006: profile/preferences, list/switch Organizations, admin
lifecycle (deactivate/reactivate/soft-delete Users with a "never without an
administrator" invariant), access history — extends the same `User` table owned by
`identity` rather than duplicating it (see `specs/006-users/research.md`). Spec 007:
full RBAC — assign/revoke additional Roles and direct Permissions on a Membership
(union with the base `Membership.role`, never replacing it), view effective
permissions, create/edit/delete custom Roles (with optional inheritance from a
default Role), and a Permission catalog filtered by an Organization's enabled modules
— see `specs/007-roles-permissions/research.md`. Everything else (specs 008-026) is
spec-only, no implementation yet. Next up: **spec 008 Customers** (first CRM module).

**Authorization architecture (deny-by-default, hardened after a security review)**:
`AuthGuard` (identity) is registered globally as `APP_GUARD` in `AppModule` — every
route requires a valid Bearer token unless explicitly marked `@Public()`.
`TenantContextGuard` (organizations) is applied at the **controller class level** on
`OrganizationsController` (`@UseGuards(TenantContextGuard)` above the class, not per
method) — every method requires `X-Organization-Id` + an active Membership unless
marked `@SkipTenantContext()`. Any new controller that operates on Organization-scoped
data should follow the same class-level pattern, not per-method `@UseGuards()`.
Repositories that take both an `organizationId` and an entity id filter by both in the
Prisma query itself (not just a post-fetch check in the use case) — see
`OrganizationInvitationRepository` for the pattern.

**RBAC layer (spec 007)**: `PermissionsGuard` + `@RequirePermission('resource.action')`
(`backend/src/modules/roles/api/`) is a second, opt-in gate layered *on top of*
`TenantContextGuard`, not a replacement — it must run after it, since it reads
`request.organizationId`. Unlike `TenantContextGuard`, it's applied **per-method**, not
class-wide, because some endpoints (effective-permissions) have a conditional rule a
class-wide gate can't express (a User can always read their own; reading someone
else's needs `role.manage`). `EffectivePermissionsService` computes a Membership's
permissions as base role ∪ `RoleAssignment`s ∪ `MembershipPermission` direct grants;
`Membership.role === 'Propietario'` is a total bypass in code, never a `Role` row. The
8 non-Propietario default Roles are shared rows (`Role.organizationId = null`), seeded
idempotently on boot by `DefaultRolesSeeder` — `resetDatabase()` in tests must only
delete custom Roles (`organizationId IS NOT NULL`), never the defaults. When checking
whether a `Role` belongs to "this Organization or is a default", the correct guard is
`role.organizationId !== null && role.organizationId !== organizationId` — a plain
`!==` check alone incorrectly 404s on every default Role (bug found and fixed during
spec 007; see `specs/007-roles-permissions/tasks.md` T037-T038 note).

**Local dev DB**: Backend tests and the dev server both run against an isolated Docker
container (`velo-test-db`, postgres:15-alpine, port 5433, user/pass `velo`/`velo`) —
separate from any other local Postgres instance. Start it with `docker start
velo-test-db` if stopped. `backend/.env` and `backend/.env.test` point to it.
`backend/jest.config.js` sets `maxWorkers: 1` — tests share this one real DB and call
`resetDatabase()` between cases, so parallel workers would race and truncate tables
mid-test.

**Prisma + Windows gotcha**: `npx prisma migrate dev` / `npx prisma generate` fails
with `EPERM: operation not permitted, rename ...query_engine-windows.dll.node...` if
the `nest start --watch` dev server is still running — it holds a lock on the engine
DLL. Kill the process on port 3000 first (`Get-NetTCPConnection -State Listen |
Where-Object {$_.LocalPort -eq 3000}` then `Stop-Process -Id <pid> -Force`), then
regenerate, then restart the dev server.
