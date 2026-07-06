/*
  Warnings:

  - You are about to drop the column `stage` on the `opportunities` table. All the data in the column will be lost.
  - Added the required column `pipelineId` to the `opportunities` table without a default value. This is not possible if the table is not empty.
  - Added the required column `stageId` to the `opportunities` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditLogAction" ADD VALUE 'OpportunityCreated';
ALTER TYPE "AuditLogAction" ADD VALUE 'OpportunityUpdated';
ALTER TYPE "AuditLogAction" ADD VALUE 'OpportunityStageChanged';
ALTER TYPE "AuditLogAction" ADD VALUE 'OpportunityOwnerChanged';
ALTER TYPE "AuditLogAction" ADD VALUE 'OpportunityValueChanged';
ALTER TYPE "AuditLogAction" ADD VALUE 'OpportunityWon';
ALTER TYPE "AuditLogAction" ADD VALUE 'OpportunityLost';
ALTER TYPE "AuditLogAction" ADD VALUE 'OpportunityReopened';
ALTER TYPE "AuditLogAction" ADD VALUE 'OpportunityArchived';
ALTER TYPE "AuditLogAction" ADD VALUE 'OpportunityRestored';

-- NOTE: Prisma's migration diff proposed DROPping the hand-added pg_trgm/GIN indexes
-- from specs 008/009/010 here (contacts_*, customers_*, leads_* trgm/gin indexes),
-- because they aren't represented as @@index in schema.prisma (they were added by
-- hand in their own migration.sql files, same as this migration's own index below).
-- Removed deliberately — those indexes must not be dropped, see
-- specs/008-customers/research.md #9, specs/009-contacts/research.md #8, and
-- specs/010-leads/research.md #15.

-- AlterTable
ALTER TABLE "opportunities" DROP COLUMN "stage",
ADD COLUMN     "competitor" TEXT,
ADD COLUMN     "estimatedCloseDate" TIMESTAMP(3),
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "pipelineId" TEXT NOT NULL,
ADD COLUMN     "priority" "CustomerPriority" NOT NULL DEFAULT 'medium',
ADD COLUMN     "probability" INTEGER,
ADD COLUMN     "stageBeforeLost" TEXT,
ADD COLUMN     "stageId" TEXT NOT NULL,
ADD COLUMN     "stateBeforeArchive" "OpportunityState",
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- DropEnum
DROP TYPE "PipelineStage";

-- CreateTable
CREATE TABLE "pipelines" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pipelines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pipeline_stages" (
    "id" TEXT NOT NULL,
    "pipelineId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "isWonStage" BOOLEAN NOT NULL DEFAULT false,
    "isLostStage" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pipeline_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opportunity_history" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "changedByUserId" TEXT NOT NULL,
    "changes" JSONB NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "opportunity_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pipelines_organizationId_idx" ON "pipelines"("organizationId");

-- CreateIndex
CREATE INDEX "pipeline_stages_pipelineId_idx" ON "pipeline_stages"("pipelineId");

-- CreateIndex
CREATE INDEX "opportunity_history_opportunityId_idx" ON "opportunity_history"("opportunityId");

-- CreateIndex
CREATE INDEX "opportunities_pipelineId_idx" ON "opportunities"("pipelineId");

-- CreateIndex
CREATE INDEX "opportunities_stageId_idx" ON "opportunities"("stageId");

-- Search index (research.md #14) — same pg_trgm pattern as specs 008/009/010.
CREATE INDEX "opportunities_name_trgm_idx" ON "opportunities" USING GIN ("name" gin_trgm_ops);

-- AddForeignKey
ALTER TABLE "pipelines" ADD CONSTRAINT "pipelines_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pipeline_stages" ADD CONSTRAINT "pipeline_stages_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "pipelines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "pipelines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "pipeline_stages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunity_history" ADD CONSTRAINT "opportunity_history_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
