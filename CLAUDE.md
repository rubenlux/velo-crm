<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan:
specs/012-activities/plan.md (see also docs/implementation-plan.md
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
Multi-Tenant), 006 (Users), 007 (Roles & Permissions), 008 (Customers), 009
(Contacts), 010 (Leads), 011 (Opportunities) and 012 (Activities) are fully
implemented — 203 backend tests passing, plus real frontend pages for every spec
through 012 (Dashboard/Pipeline/Tasks/Calendar/Reports/design-system pages are
still the original mock, no backend yet).
Spec 004: register/verify/login/logout, password reset/change, Google/Microsoft
OAuth, session/device management, TOTP MFA. Spec 005: create/configure Organization
with automatic Propietario Membership, branding/tax/modules by plan, invitations
(closes spec 004's FR-018), plan changes, suspend/reactivate. Spec 006:
profile/preferences, list/switch Organizations, admin lifecycle
(deactivate/reactivate/soft-delete Users with a "never without an administrator"
invariant), access history — extends the same `User` table owned by `identity`
rather than duplicating it (see `specs/006-users/research.md`). Spec 007: full RBAC —
assign/revoke additional Roles and direct Permissions on a Membership (union with the
base `Membership.role`, never replacing it), view effective permissions, create/edit/
delete custom Roles (with optional inheritance from a default Role), and a Permission
catalog filtered by an Organization's enabled modules — see
`specs/007-roles-permissions/research.md`. Spec 008 (first CRM module): Customer
CRUD with CUIT/NIF duplicate prevention per Organization, search/filters
(`pg_trgm`/GIN indexes for <300ms at scale), archive/restore, a calculated timeline
(not a persisted table), and merge duplicates + CSV export/import — see
`specs/008-customers/research.md` and the "Customers module" note below. Spec 009
(first module depending on another Fase 2 module, not just the platform core):
Contact CRUD nested under a Customer (hard FK, `onDelete: Restrict`), a single
primary Contact per Customer enforced by both a transaction and a Postgres partial
unique index, search across primary/secondary emails and phones, a calculated
timeline (same pattern as spec 008), and transfer/merge — see
`specs/009-contacts/research.md` and the "Contacts module" note below. Spec 010 (first
module with two Fase 2 dependencies at once): Lead register/qualify/assign, notes +
next action + attachments (activity-type logging deferred to spec 012), a single
transactional conversion into a Customer + primary Contact + a **minimal** Opportunity
row (spec 011 isn't implemented yet — see the "Leads module" note below), lose/
reactivate (restoring the exact pre-loss status), and search/timeline/batch import —
see `specs/010-leads/research.md` and the "Leads module" note below. Spec 011
(resolves spec 010's temporary Opportunity-table exception, does not introduce a new
one): configurable Pipeline/PipelineStage per Organization with lazily-created
defaults, Opportunity create/move-stage/reassign-owner, estimatedValue/probability
with a query-time weighted value, win/lose/reopen/archive/restore lifecycle, live
in-memory KPIs/forecast aggregation, and search/timeline — see
`specs/011-opportunities/research.md` and the "Opportunities module" note below.
Spec 012: Activity register/manage (cancel/reactivate) across one or more of
{Customer, Contact, Lead, Opportunity}, result + next-activity scheduling,
attachments + author-only-editable comments, automatic cross-entity timeline
(resolved in the frontend, not the backend — see the "Activities module" note
below), and global search/timeline — see `specs/012-activities/research.md`.
Everything else (specs 013-026) is spec-only, no implementation yet. Next up:
**spec 013 Tasks**.

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

**Customers module (spec 008)**: reuses the `customer.*` permission keys spec 007
already declared for the `crm` module — no new permission keys were added.
Field-level edit history lives in its own `CustomerHistory` table, separate from the
platform `AuditLog` (spec 005); a Customer's timeline is a **calculated view**
combining both at query time (`GetCustomerTimelineUseCase`), not a persisted
`TimelineEntry` table — future CRM specs (Contacts, Activities, Opportunities,
Documents) that add timeline events should extend that use case rather than
introduce a shared timeline table. Merging duplicate Customers does not add a new
`CustomerStatus` value; it sets `mergedIntoCustomerId` on the discarded row (a
self-relation), and any direct read of that row fails with a dedicated error
carrying the survivor's id. Edits use optimistic concurrency (`version` column,
checked and incremented on every update) instead of locks. See
`specs/008-customers/research.md` for the full rationale of each of these choices.

**Contacts module (spec 009)**: `Contact.customerId` is a hard, non-nullable FK
(`onDelete: Restrict`) — a Contact can never exist without exactly one Customer, and a
Customer with Contacts attached can't be hard-deleted (moot in practice since
Customers are never hard-deleted either, spec 008 RN-004). `ContactsModule` is the
first Fase 2 module that imports another Fase 2 module (`CustomersModule`, for
`CustomerRepository`) rather than only the platform core — follow that same
`exports: [...]` pattern for any future cross-module dependency inside the CRM phase.
"At most one primary Contact per Customer" is enforced twice: a transaction in
`ContactRepository.setPrimary` (unset the previous, set the new, atomically) plus a
Postgres partial unique index (`contacts_customer_primary_unique ON contacts
(customer_id) WHERE is_primary = true`) added by hand in the migration SQL — Prisma's
schema syntax cannot express a partial unique index, so it never appears in
`schema.prisma` itself, only in the migration file. Transferring a Contact to another
Customer always forces `isPrimary = false`, even if it was the origin Customer's
primary. Reuses `contact.*` permission keys and the History-table-plus-calculated-
timeline pattern from spec 008 without modification — see
`specs/009-contacts/research.md` for the full rationale.

**Leads module (spec 010)**: `LeadsModule` is the first Fase 2 module importing
**two** other Fase 2 modules at once (`CustomersModule` + `ContactsModule`), both
consumed only inside `ConvertLeadUseCase`'s single Prisma transaction. Conversion
race-safety comes from a conditional `updateMany` (`status IN (...)` as the WHERE
guard) as the transaction's first write — if it affects 0 rows, another request
already converted the Lead, and everything after is skipped; verified by a test that
fires 5 concurrent conversions at the same Lead and asserts exactly 1 success. When
resolving `linkToExistingCustomerId`/`linkToExistingContactId`, always validate through
the already-org-scoped `CustomerRepository.findById`/`ContactRepository.findById` —
never `tx.customer.findUniqueOrThrow({ where: { id } })` directly, which has no
`organizationId` filter and was a real cross-tenant bug caught during this spec's own
security review (fixed before merge). `Opportunity` creation during conversion now goes through the real
`OpportunitiesModule` (spec 011) — `LeadsModule` imports it and `ConvertLeadUseCase`
resolves a real `pipelineId`/`stageId` (via `PipelineRepository.findOrCreateDefault`)
before creating the Opportunity inside its transaction; see the "Opportunities module"
note below for how spec 011 took over ownership of this table from spec 010's
original temporary, minimal version. "Registrar actividades"
(calls/meetings/emails) has no implementation in this spec — spec 012 (Activities)
explicitly claims sole ownership of that concept across Customer/Contact/Lead/
Opportunity, and specs 008/009 already established the precedent of not building a
stand-in. Reuses `lead.*` permission keys (spec 007) — `lead.delete` stays unused,
since Leads have no destructive operation (FR-014 forbids physical deletion in every
state).

**Opportunities module (spec 011)**: resolves spec 010's documented temporary
exception rather than introducing a new one — replaces the minimal `Opportunity`
table (enum `PipelineStage`, no configurable Pipeline) with real `Pipeline`/
`PipelineStage` tables, and `LeadsModule` now imports `OpportunitiesModule` instead of
using the deleted `opportunity-stub.repository.ts`. The default Pipeline (8 stages:
Nueva/Calificada/Descubrimiento/Propuesta/Negociación/Cierre/Ganada/Perdida) is
created lazily on first use (`PipelineRepository.findOrCreateDefault`) rather than
hooked into Organization creation, to avoid `OrganizationsModule` (platform core)
importing a domain module — guarded against a race between two concurrent
first-time callers by a hand-written Postgres partial unique index
(`pipelines_organization_default_unique ON pipelines (organizationId) WHERE
isDefault = true`) plus a `try/catch` on Prisma's `P2002` in the repository, re-reading
the winning row. `isWonStage`/`isLostStage` flags (not name-matching) drive
`Opportunity.state` transitions, so an Admin renaming a stage never breaks Won/Lost
detection. `stageBeforeLost`/`stateBeforeArchive` save-the-prior-value fields mirror
spec 010's `Lead.statusBeforeLost` pattern for reversible transitions. `weightedValue`
is always calculated at query time (`estimatedValue * probability / 100`), never
persisted. KPIs/forecast are live in-memory aggregations over
`OpportunityRepository.findAllForAggregation` — no caching, no materialized views.

First spec to add **new** permission keys beyond reusing spec 007's pre-declared CRUD:
`opportunity.edit_won` (editing a `Ganada` Opportunity) and
`opportunity.manage_pipeline` (reconfiguring a Pipeline's stages) — checked inside the
use case via `MembershipRepository` + `EffectivePermissionsService.hasPermission`,
since `@RequirePermission` can't express "a different permission depending on the
resource's current state." **A security review after initial implementation found and
fixed a real bypass**: `UpdateOpportunityUseCase` only checked `state === 'Ganada'`
literally, so `archive → PATCH (now Archivada) → restore` let a User without
`opportunity.edit_won` edit the value/probability of an effectively-still-`Ganada`
Opportunity; separately, `LoseOpportunityUseCase` moved a `Ganada` Opportunity
straight to `Perdida` with no `edit_won` check at all, and neither `win` nor `lose`
rejected an `Archivada` Opportunity the way `move-stage` already did. Fixed by
checking `state === 'Ganada' || (state === 'Archivada' && stateBeforeArchive ===
'Ganada')` in `update-opportunity.use-case.ts`, adding the same `edit_won` check to
`lose-opportunity.use-case.ts`, and adding an `Archivada` guard to both `win`/`lose` —
covered by `opportunities-won-bypass-guard.spec.ts`. Lesson: any new lifecycle
use case that mutates an Opportunity must independently re-check both "is this
Archivada" and "is this effectively Ganada", since there's no single guard/middleware
enforcing it centrally.

Two more bugs were found and fixed after initial delivery, both self-caught (not by
a test failure): (1) `CreateOpportunityUseCase` never called
`CustomerArchivedGuardService` — the guard spec 008 had forward-declared exactly for
this purpose (FR-011 of spec 008: no new Opportunities on an archived Customer) —
letting Opportunities be created on archived Customers; fixed by injecting the
already-exported guard in place of a bare `findById`+null-check, covered by
`opportunities-archived-customer-guard.spec.ts`. (2) The frontend's
`OpportunityKpis.tsx` crashed on an org with no closed Opportunities yet, because
`averageTicket`/`conversionRate`/`averageCloseTimeDays` are `number | null` from the
backend but were rendered unguarded, and `byOwner`/`byStage` rows use the backend
field name `totalValue`, not `value` as the frontend had typed it — both fixed;
`npm run build` passing does not catch this class of backend/frontend shape drift,
only opening the page (or checking the actual JSON) does.

**Activities module (spec 012)**: first spec importing **four** Fase 2 domain
modules at once (`CustomersModule`, `ContactsModule`, `LeadsModule`,
`OpportunitiesModule`) — `Activity` has four nullable FKs
(`customerId`/`contactId`/`leadId`/`opportunityId`, at least one required by a
hand-written Postgres CHECK constraint, since Prisma can't express a multi-column
CHECK in `schema.prisma`) validated against those modules' already-exported,
org-scoped repositories. If more than one relation is provided at once, they must
all resolve to the same Customer (a Lead's `convertedCustomerId` only counts if
it's been converted) — enforced in `CreateActivityUseCase`/
`ScheduleFollowUpActivityUseCase`, not at the DB level. `ActivityType` (the
interaction catalog, configurable per Organization) follows `Role`'s pattern
(shared default rows, `organizationId = null`, seeded idempotently by
`DefaultActivityTypesSeeder`), not `Pipeline`'s (spec 011, real per-Organization
table created lazily) — a type doesn't need its own per-Organization config the
way a `PipelineStage` needs `order`/`isWonStage`/`isLostStage`. New permission key
`activity.manage_types` (same tier as `opportunity.manage_pipeline`) gates
creating custom types — remember to exclude it from `Gerente`/`Ventas`/`Soporte`'s
`byResource([...])` calls in `permission-catalog.ts`, the same recurring gotcha as
spec 011. Comments (`ActivityComment`) are editable/deletable **only by their
author, with no exception for Propietario or any permission tier** — a deliberate
Clarification answer, not an oversight; don't "fix" this into a permission check
if touching this code later. The most significant architecture decision: Activities
appearing automatically in a Customer/Contact/Lead/Opportunity's own timeline
(FR-009) is resolved **in the frontend**, not by modifying those four modules'
existing `Get<Entity>TimelineUseCase` — doing so would require those older modules
to import `ActivitiesModule` back, creating this project's first module dependency
cycle. Instead, `CustomerTimeline.tsx`/`ContactTimeline.tsx`/`LeadTimeline.tsx`/
`OpportunityTimeline.tsx` additionally call the Activities search endpoint
(`GET .../activities?customerId=X` etc.) and merge+sort client-side — zero backend
changes to those four modules. A security review after implementation found no
issues (unlike spec 011's, which found two real bugs) — see
`specs/012-activities/research.md` for the full rationale of each design choice.

**Local dev DB**: an isolated Docker container (`velo-test-db`, postgres:15-alpine,
port 5433, user/pass `velo`/`velo`) — separate from any other local Postgres instance.
Start it with `docker start velo-test-db` if stopped. **The container holds two
separate databases, not one** (fixed 2026-07-04 after dev data kept disappearing):
`velo_test` (used only by `backend/.env.test` / the Jest suite — `resetDatabase()`
truncates it between every test case, so anything in it is expected to vanish) and
`velo_dev` (used only by `backend/.env` / `nest start --watch` — stable, never
touched by test runs, safe to register real accounts and leave data in). Both are
kept in migration-sync manually: applying a new migration means running `npx prisma
migrate deploy` once per database (it reads `DATABASE_URL` from `.env` by default, so
re-point `DATABASE_URL` or pass `--schema`/env override to hit the other one).
`backend/jest.config.js` sets `maxWorkers: 1` — tests share `velo_test` and call
`resetDatabase()` between cases, so parallel workers would race and truncate tables
mid-test. Dev login for `velo_dev` (register your own, no seed script exists):
`test@test.com` / `Test1234!` is already registered there as of this fix.

**Prisma + Windows gotcha**: `npx prisma migrate dev` / `npx prisma generate` fails
with `EPERM: operation not permitted, rename ...query_engine-windows.dll.node...` if
the `nest start --watch` dev server is still running — it holds a lock on the engine
DLL. Kill the process on port 3000 first (`Get-NetTCPConnection -State Listen |
Where-Object {$_.LocalPort -eq 3000}` then `Stop-Process -Id <pid> -Force`), then
regenerate, then restart the dev server. `nest start --watch` can respawn under a new
PID after being killed once — recheck the port after killing and kill again if it's
still listening, before rerunning Prisma.

**Prisma migration workflow when hand-editing generated SQL**: after `prisma migrate
dev --create-only`, hand-edit `migration.sql` (e.g. to add `pg_trgm`/GIN indexes, or to
strip erroneous `DROP INDEX` statements Prisma's diff proposes for indexes that were
themselves hand-added in an earlier migration and aren't represented in
`schema.prisma` — always check the generated SQL for these before applying, they will
silently regress an earlier spec's search performance if applied). Then apply with
`npx prisma migrate deploy`, not plain `migrate dev` — `migrate dev` re-validates
against a shadow database interactively and can hang waiting on a prompt in a
non-interactive shell. If a previous `migrate dev` run was interrupted mid-shadow-db
cleanup, `migrate deploy` may then fail with `P1002` (timed out acquiring the Prisma
advisory lock) — find and terminate the stuck connection first: `docker exec
velo-test-db psql -U velo -d velo_test -c "SELECT pid, query FROM pg_stat_activity
WHERE datname='velo_test'"`, then `SELECT pg_terminate_backend(<pid>)` on the one
still running the shadow-db `DROP DATABASE`.
