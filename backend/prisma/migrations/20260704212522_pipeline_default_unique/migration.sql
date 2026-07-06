-- Prisma's migration diff proposed dropping every hand-added pg_trgm/GIN index
-- again (same gotcha as every prior migration in this project) — discarded, see
-- CLAUDE.md. This migration's only real change is the partial unique index below.

-- Defense in depth (same pattern as contacts_customer_primary_unique, spec 009
-- research.md #4): at most one Pipeline per Organization can be the default one,
-- guarding PipelineRepository.findOrCreateDefault against a race between two
-- concurrent first-time callers for the same Organization.
CREATE UNIQUE INDEX "pipelines_organization_default_unique" ON "pipelines" ("organizationId") WHERE "isDefault" = true;
